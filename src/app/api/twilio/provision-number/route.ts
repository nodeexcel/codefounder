import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/twilio/provision-number
// Purchases a US Twilio number for the authenticated user, imports it into
// Vapi, and persists it. Idempotent — returns the existing number if already
// provisioned.
// Returns { phoneNumber: string, vapiPhoneNumberId: string | null }
export async function POST() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const vapiApiKey = process.env.VAPI_API_KEY;

  if (!accountSid || !authToken) {
    return NextResponse.json(
      { error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not configured" },
      { status: 500 }
    );
  }
  if (!vapiApiKey) {
    return NextResponse.json(
      { error: "VAPI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── Idempotency: return existing provisioned number if present ────────────
  const { data: existingRow } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("twilio_phone_number, voice_settings")
    .eq("user_id", user.id)
    .eq("agent_type", "voice")
    .maybeSingle();

  if (existingRow?.twilio_phone_number) {
    const vs = (existingRow.voice_settings as Record<string, unknown>) ?? {};
    return NextResponse.json({
      phoneNumber: existingRow.twilio_phone_number as string,
      vapiPhoneNumberId: (vs.vapiPhoneNumberId as string | undefined) ?? null,
      reused: true,
    });
  }

  const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
  const twilioAuth = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  // ── 1. Search available US local numbers ──────────────────────────────────
  const searchRes = await fetch(
    `${twilioBase}/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&SmsEnabled=true&Limit=5`,
    { headers: { Authorization: twilioAuth } }
  );
  if (!searchRes.ok) {
    const text = await searchRes.text();
    console.error("[provision-number] Twilio search failed:", text);
    return NextResponse.json(
      { error: "Failed to search available phone numbers" },
      { status: 502 }
    );
  }
  const searchData = (await searchRes.json()) as {
    available_phone_numbers?: Array<{ phone_number: string }>;
  };
  const available = searchData.available_phone_numbers ?? [];
  if (available.length === 0) {
    return NextResponse.json(
      { error: "No US phone numbers available right now. Try again in a few seconds." },
      { status: 503 }
    );
  }

  // ── 2. Purchase the first available number ────────────────────────────────
  const chosenNumber = available[0].phone_number;
  const purchaseRes = await fetch(`${twilioBase}/IncomingPhoneNumbers.json`, {
    method: "POST",
    headers: {
      Authorization: twilioAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ PhoneNumber: chosenNumber }).toString(),
  });
  if (!purchaseRes.ok) {
    const text = await purchaseRes.text();
    console.error("[provision-number] Twilio purchase failed:", text);
    return NextResponse.json(
      { error: "Failed to purchase phone number. Check your Twilio account balance." },
      { status: 502 }
    );
  }
  const purchased = (await purchaseRes.json()) as { phone_number: string };
  const phoneNumber = purchased.phone_number;

  // ── 3. Register the number in Vapi so it can be linked to an assistant ────
  let vapiPhoneNumberId: string | null = null;
  const vapiRegRes = await fetch("https://api.vapi.ai/phone-number", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vapiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "twilio",
      number: phoneNumber,
      twilioAccountSid: accountSid,
      twilioAuthToken: authToken,
    }),
  });
  if (vapiRegRes.ok) {
    const vapiPhone = (await vapiRegRes.json()) as { id?: string };
    vapiPhoneNumberId = vapiPhone.id ?? null;
  } else {
    // Non-fatal: number is purchased; Vapi link can be retried on Go Live
    console.warn("[provision-number] Vapi registration failed:", await vapiRegRes.text());
  }

  // ── 4. Persist to DB ──────────────────────────────────────────────────────
  // Merge vapiPhoneNumberId into voice_settings JSONB (no migration needed)
  const existingVoice =
    (existingRow?.voice_settings as Record<string, unknown>) ?? {};

  await adminSupabase
    .from("agent_wizard_sessions")
    .update({
      twilio_phone_number: phoneNumber,
      voice_settings: {
        ...existingVoice,
        phoneNumber,
        phoneOption: "new",
        vapiPhoneNumberId,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("agent_type", "voice");

  return NextResponse.json({ phoneNumber, vapiPhoneNumberId });
}
