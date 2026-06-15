import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/phone/provision-number
// Provisions a US phone number for the authenticated user via Telnyx, imports
// it into Vapi, and persists it. Three-stage strategy:
//   1. Return DB-persisted number if already provisioned (idempotent).
//   2. Reuse an unassigned active number already on the Telnyx account.
//   3. Purchase a new number if none are available to reuse.
// Returns { phoneNumber: string, vapiPhoneNumberId: string | null }

function toE164(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return number.startsWith("+") ? number : `+${digits}`;
}

function isValidE164(number: string): boolean {
  return /^\+1\d{10}$/.test(number);
}

// Safely parse a response body as JSON, falling back to raw text.
// Returns { parsed, raw } so callers can log either form.
async function readBody(res: Response): Promise<{ parsed: unknown; raw: string }> {
  const raw = await res.text();
  try {
    return { parsed: JSON.parse(raw), raw };
  } catch {
    return { parsed: null, raw };
  }
}

export async function POST() {
  const tag = "[provision-number]";
  const telnyxApiKey = process.env.TELNYX_API_KEY;
  const vapiApiKey   = process.env.VAPI_API_KEY;

  console.log(`${tag} Starting provision request`);
  console.log(`${tag} ENV TELNYX_API_KEY: ${telnyxApiKey ? "present" : "missing"}`);
  console.log(`${tag} ENV TELNYX_MESSAGING_NUMBER: ${process.env.TELNYX_MESSAGING_NUMBER ? "present" : "missing"}`);
  console.log(`${tag} ENV VAPI_API_KEY: ${vapiApiKey ? "present" : "missing"}`);

  if (!telnyxApiKey) {
    console.error(`${tag} TELNYX_API_KEY is not set`);
    return NextResponse.json({ error: "TELNYX_API_KEY is not configured" }, { status: 500 });
  }
  if (!vapiApiKey) {
    console.warn(`${tag} VAPI_API_KEY is not set — Vapi import will be skipped; update-assistant will retry on Go Live`);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn(`${tag} Unauthenticated request`);
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  console.log(`${tag} Authenticated user: ${user.id}`);

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── STAGE 1: Return persisted number if already provisioned ───────────────
  console.log(`${tag} Stage 1: Checking DB for existing provisioned number`);
  const { data: existingRow } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("twilio_phone_number, voice_settings")
    .eq("user_id", user.id)
    .eq("agent_type", "voice")
    .maybeSingle();

  if (existingRow?.twilio_phone_number) {
    const vs = (existingRow.voice_settings as Record<string, unknown>) ?? {};
    // Only treat twilio_phone_number as a provisioned Telnyx number when
    // voice_settings.phoneOption is "new". If it's "forward" the column was
    // written incorrectly by an older version of saveWizardProgress — skip it.
    if (vs.phoneOption === "new") {
      console.log(`${tag} Stage 1: Found existing Telnyx number: ${existingRow.twilio_phone_number} — returning early`);
      return NextResponse.json({
        phoneNumber:       existingRow.twilio_phone_number as string,
        vapiPhoneNumberId: (vs.vapiPhoneNumberId as string | undefined) ?? null,
        reused:            true,
      });
    }
    console.log(`${tag} Stage 1: twilio_phone_number present but phoneOption="${String(vs.phoneOption)}" — not a provisioned number, continuing`);
  } else {
    console.log(`${tag} Stage 1: No existing number in DB`);
  }

  const telnyxHeaders = {
    Authorization:  `Bearer ${telnyxApiKey}`,
    "Content-Type": "application/json",
  };

  // ── STAGE 2: Reuse an unassigned active number from Telnyx account ────────
  const listUrl = "https://api.telnyx.com/v2/phone_numbers?filter[status]=active";
  console.log(`${tag} Stage 2: Fetching active numbers from Telnyx account`);
  console.log(`[TELNYX_LIST] GET ${listUrl}`);
  let phoneNumber: string | null = null;

  const listRes = await fetch(listUrl, { headers: telnyxHeaders });

  if (listRes.ok) {
    const listData = (await listRes.json()) as {
      data?: Array<{ phone_number: string; status: string }>;
    };
    const accountNumbers = listData.data ?? [];
    console.log(`[TELNYX_LIST] status=${listRes.status} numbers_returned=${accountNumbers.length}`);

    if (accountNumbers.length > 0) {
      // Check which numbers are already assigned to other users in our DB
      const { data: assignedRows } = await adminSupabase
        .from("agent_wizard_sessions")
        .select("twilio_phone_number")
        .not("twilio_phone_number", "is", null);

      const assignedSet = new Set(
        (assignedRows ?? []).map((r) => r.twilio_phone_number as string)
      );
      console.log(`${tag} Stage 2: ${assignedSet.size} number(s) already assigned in DB`);

      const unassigned = accountNumbers.find(
        (n) => !assignedSet.has(n.phone_number) && !assignedSet.has(toE164(n.phone_number))
      );

      if (unassigned) {
        phoneNumber = toE164(unassigned.phone_number);
        console.log(`${tag} Stage 2: Reusing unassigned Telnyx number: ${phoneNumber}`);
      } else {
        console.log(`${tag} Stage 2: All account numbers already assigned — will purchase new`);
      }
    }
  } else {
    const { parsed, raw } = await readBody(listRes);
    console.error(`[TELNYX_ERROR] stage=LIST status=${listRes.status}`);
    console.error(`[TELNYX_ERROR] response_body=${raw}`);
    console.error(`[TELNYX_ERROR] parsed=${JSON.stringify(parsed)}`);
    console.warn(`${tag} Stage 2: Failed to list Telnyx numbers (non-fatal) — continuing to Stage 3`);
  }

  // ── STAGE 3: Purchase a new number ────────────────────────────────────────
  if (!phoneNumber) {
    const searchUrl = "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=US&filter[features][]=voice&filter[limit]=1";
    console.log(`${tag} Stage 3: Searching for available US voice numbers`);
    console.log(`[TELNYX_SEARCH] GET ${searchUrl}`);

    const searchRes = await fetch(searchUrl, { headers: telnyxHeaders });
    const { parsed: searchParsed, raw: searchRaw } = await readBody(searchRes);

    console.log(`[TELNYX_SEARCH] status=${searchRes.status}`);
    console.log(`[TELNYX_SEARCH] response_body=${searchRaw}`);

    if (!searchRes.ok) {
      console.error(`[TELNYX_ERROR] stage=SEARCH status=${searchRes.status}`);
      console.error(`[TELNYX_ERROR] parsed=${JSON.stringify(searchParsed)}`);
      return NextResponse.json(
        {
          error: "Failed to search available phone numbers. Please try again.",
          _debug: { stage: "TELNYX_SEARCH", status: searchRes.status, body: searchRaw },
        },
        { status: 502 }
      );
    }

    const searchData = searchParsed as { data?: Array<{ phone_number: string }> } | null;
    const available = searchData?.data ?? [];
    console.log(`[TELNYX_SEARCH] numbers_available=${available.length}`);

    if (available.length === 0) {
      console.error(`[TELNYX_ERROR] stage=SEARCH status=${searchRes.status} result=no_numbers_available`);
      console.error(`[TELNYX_ERROR] full_response=${searchRaw}`);
      return NextResponse.json(
        {
          error: "No US phone numbers available right now. Please try again in a few seconds.",
          _debug: { stage: "TELNYX_SEARCH", status: searchRes.status, body: searchRaw },
        },
        { status: 503 }
      );
    }

    const chosen = available[0].phone_number;
    console.log(`${tag} Stage 3: Purchasing number: ${chosen}`);

    // Telnyx number purchase uses the /v2/number_orders endpoint (NOT /v2/phone_numbers).
    // Body must be { phone_numbers: [{ phone_number: "..." }] } — an array of objects.
    const purchaseUrl = "https://api.telnyx.com/v2/number_orders";
    const purchaseBody = JSON.stringify({ phone_numbers: [{ phone_number: chosen }] });
    console.log(`[TELNYX_PURCHASE] POST ${purchaseUrl} body=${purchaseBody}`);

    const purchaseRes = await fetch(purchaseUrl, {
      method:  "POST",
      headers: telnyxHeaders,
      body:    purchaseBody,
    });

    const { parsed: purchaseParsed, raw: purchaseRaw } = await readBody(purchaseRes);

    console.log(`[TELNYX_PURCHASE] status=${purchaseRes.status}`);
    console.log(`[TELNYX_PURCHASE] response_body=${purchaseRaw}`);

    if (!purchaseRes.ok) {
      console.error(`[TELNYX_ERROR] stage=PURCHASE status=${purchaseRes.status}`);
      console.error(`[TELNYX_ERROR] attempted_number=${chosen}`);
      console.error(`[TELNYX_ERROR] parsed=${JSON.stringify(purchaseParsed)}`);
      console.error(`[TELNYX_ERROR] full_response=${purchaseRaw}`);
      return NextResponse.json(
        {
          error: "Failed to purchase phone number. Check your Telnyx account balance and try again.",
          _debug: { stage: "TELNYX_PURCHASE", status: purchaseRes.status, attempted: chosen, body: purchaseRaw },
        },
        { status: 502 }
      );
    }

    // Order response shape: { data: { phone_numbers: [{ phone_number: "..." }] } }
    const purchased = purchaseParsed as { data?: { phone_numbers?: Array<{ phone_number: string }> } } | null;
    const raw = purchased?.data?.phone_numbers?.[0]?.phone_number ?? chosen;
    phoneNumber = toE164(raw);
    console.log(`[TELNYX_PURCHASE] success number=${phoneNumber}`);
    console.log(`${tag} Stage 3: Purchased and normalised to E.164: ${phoneNumber}`);
  }

  // ── Validate E.164 format ─────────────────────────────────────────────────
  if (!isValidE164(phoneNumber)) {
    console.error(`${tag} E.164 validation failed for: ${phoneNumber}`);
    return NextResponse.json(
      { error: `Provisioned number is not a valid US E.164 number: ${phoneNumber}` },
      { status: 500 }
    );
  }
  console.log(`${tag} E.164 validation passed: ${phoneNumber}`);

  // ── Retrieve business name for Vapi label ─────────────────────────────────
  const vs0 = (existingRow?.voice_settings as Record<string, unknown>) ?? {};
  const businessName =
    (vs0.businessName as string | undefined) ??
    (vs0.business as Record<string, unknown> | undefined)?.businessName as string | undefined ??
    "Business";

  // ── Import into Vapi (optional) ───────────────────────────────────────────
  // VAPI_API_KEY is not required for number provisioning. If absent, this step
  // is skipped and vapiPhoneNumberId stays null. The update-assistant route
  // has a full retry path for this case — it re-attempts the import on Go Live.
  let vapiPhoneNumberId: string | null = null;

  if (vapiApiKey) {
    console.log(`${tag} Vapi: Importing number ${phoneNumber} (provider: telnyx)`);
    const vapiRes = await fetch("https://api.vapi.ai/phone-number", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider:     "telnyx",
        number:       phoneNumber,
        telnyxApiKey: telnyxApiKey,
        name:         `CodeFounder - ${businessName}`,
      }),
    });

    if (vapiRes.ok) {
      const vapiPhone = (await vapiRes.json()) as { id?: string };
      vapiPhoneNumberId = vapiPhone.id ?? null;
      console.log(`${tag} Vapi: Import success — vapiPhoneNumberId: ${vapiPhoneNumberId}`);
    } else {
      const errText = await vapiRes.text();
      // Non-fatal: number is persisted and update-assistant retries the import on Go Live.
      console.error(`${tag} Vapi: Import failed (will retry on Go Live): ${errText}`);
    }
  } else {
    console.warn(`${tag} Vapi: Skipping import — VAPI_API_KEY not set; update-assistant will retry on Go Live`);
  }

  // ── Persist to DB ─────────────────────────────────────────────────────────
  console.log(`${tag} DB: Persisting number for user ${user.id}`);
  const { error: dbError } = await adminSupabase
    .from("agent_wizard_sessions")
    .update({
      twilio_phone_number: phoneNumber,
      voice_settings: {
        ...vs0,
        phoneNumber,
        phoneOption:       "new",
        vapiPhoneNumberId,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("agent_type", "voice");

  if (dbError) {
    console.error(`${tag} DB: Failed to persist number: ${JSON.stringify(dbError)}`);
  } else {
    console.log(`${tag} DB: Persisted successfully`);
  }

  console.log(`${tag} Done — returning { phoneNumber: ${phoneNumber}, vapiPhoneNumberId: ${vapiPhoneNumberId} }`);
  return NextResponse.json({ phoneNumber, vapiPhoneNumberId });
}
