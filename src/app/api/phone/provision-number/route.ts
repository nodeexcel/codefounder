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

export async function POST() {
  const tag = "[provision-number]";
  const telnyxApiKey = process.env.TELNYX_API_KEY;
  const vapiApiKey   = process.env.VAPI_API_KEY;

  console.log(`${tag} Starting provision request`);

  if (!telnyxApiKey) {
    console.error(`${tag} TELNYX_API_KEY is not set`);
    return NextResponse.json({ error: "TELNYX_API_KEY is not configured" }, { status: 500 });
  }
  if (!vapiApiKey) {
    console.error(`${tag} VAPI_API_KEY is not set`);
    return NextResponse.json({ error: "VAPI_API_KEY is not configured" }, { status: 500 });
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
    console.log(`${tag} Stage 1: Found existing number: ${existingRow.twilio_phone_number} — returning early`);
    const vs = (existingRow.voice_settings as Record<string, unknown>) ?? {};
    return NextResponse.json({
      phoneNumber:       existingRow.twilio_phone_number as string,
      vapiPhoneNumberId: (vs.vapiPhoneNumberId as string | undefined) ?? null,
      reused:            true,
    });
  }
  console.log(`${tag} Stage 1: No existing number in DB`);

  const telnyxHeaders = {
    Authorization:  `Bearer ${telnyxApiKey}`,
    "Content-Type": "application/json",
  };

  // ── STAGE 2: Reuse an unassigned active number from Telnyx account ────────
  console.log(`${tag} Stage 2: Fetching active numbers from Telnyx account`);
  let phoneNumber: string | null = null;

  const listRes = await fetch(
    "https://api.telnyx.com/v2/phone_numbers?filter[status]=active",
    { headers: telnyxHeaders }
  );

  if (listRes.ok) {
    const listData = (await listRes.json()) as {
      data?: Array<{ phone_number: string; status: string }>;
    };
    const accountNumbers = listData.data ?? [];
    console.log(`${tag} Stage 2: ${accountNumbers.length} active number(s) on Telnyx account`);

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
    const errText = await listRes.text();
    console.warn(`${tag} Stage 2: Failed to list Telnyx numbers (non-fatal): ${errText}`);
  }

  // ── STAGE 3: Purchase a new number ────────────────────────────────────────
  if (!phoneNumber) {
    console.log(`${tag} Stage 3: Searching for available US voice numbers`);

    const searchRes = await fetch(
      "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=US&filter[features][]=voice&filter[limit]=1",
      { headers: telnyxHeaders }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error(`${tag} Stage 3: Telnyx number search failed: ${errText}`);
      return NextResponse.json(
        { error: "Failed to search available phone numbers. Please try again." },
        { status: 502 }
      );
    }

    const searchData = (await searchRes.json()) as {
      data?: Array<{ phone_number: string }>;
    };
    const available = searchData.data ?? [];
    console.log(`${tag} Stage 3: ${available.length} number(s) available to purchase`);

    if (available.length === 0) {
      console.error(`${tag} Stage 3: No US numbers available from Telnyx`);
      return NextResponse.json(
        { error: "No US phone numbers available right now. Please try again in a few seconds." },
        { status: 503 }
      );
    }

    const chosen = available[0].phone_number;
    console.log(`${tag} Stage 3: Purchasing number: ${chosen}`);

    const purchaseRes = await fetch("https://api.telnyx.com/v2/phone_numbers", {
      method:  "POST",
      headers: telnyxHeaders,
      body:    JSON.stringify({ phone_number: chosen }),
    });

    if (!purchaseRes.ok) {
      const errText = await purchaseRes.text();
      console.error(`${tag} Stage 3: Telnyx purchase failed: ${errText}`);
      return NextResponse.json(
        { error: "Failed to purchase phone number. Check your Telnyx account balance and try again." },
        { status: 502 }
      );
    }

    const purchased = (await purchaseRes.json()) as { data?: { phone_number: string } };
    const raw = purchased.data?.phone_number ?? chosen;
    phoneNumber = toE164(raw);
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

  // ── Import into Vapi ──────────────────────────────────────────────────────
  console.log(`${tag} Vapi: Importing number ${phoneNumber} (provider: telnyx)`);
  let vapiPhoneNumberId: string | null = null;

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
    console.warn(`${tag} Vapi: Import failed (non-fatal, will retry on Go Live): ${errText}`);
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
