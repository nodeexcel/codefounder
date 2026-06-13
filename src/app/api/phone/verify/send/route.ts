import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createHash, randomInt } from "crypto";

// POST /api/phone/verify/send
// Sends a 6-digit OTP via Telnyx SMS to the requested phone number.
// The hashed OTP is stored in voice_settings so no extra DB table is needed.
//
// Requires TELNYX_MESSAGING_NUMBER env var (the platform's dedicated SMS number).
// If the env var is absent the request succeeds with { skipped: true } so the
// UI can degrade gracefully without blocking the wizard.

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 11) return raw;
  return null;
}

function hashOtp(otp: string, salt: string): string {
  return createHash("sha256").update(otp + "|" + salt).digest("hex");
}

export async function POST(request: Request) {
  const tag = "[phone/verify/send]";
  const telnyxApiKey = process.env.TELNYX_API_KEY;
  const fromNumber   = process.env.TELNYX_MESSAGING_NUMBER;

  if (!telnyxApiKey || !fromNumber) {
    console.error(`${tag} SMS not configured: TELNYX_API_KEY or TELNYX_MESSAGING_NUMBER missing`);
    return NextResponse.json(
      { error: "Phone verification is not available. Please contact support." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { phone?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const phone = toE164(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ error: "Invalid US phone number" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Rate-limit: one OTP per 60 seconds per user
  const { data: sessionRow } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("voice_settings")
    .eq("user_id", user.id)
    .eq("agent_type", "voice")
    .maybeSingle();

  const vs = (sessionRow?.voice_settings as Record<string, unknown>) ?? {};
  const lastSentAt = vs._otpSentAt as string | undefined;
  if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < 60_000) {
    return NextResponse.json(
      { error: "Please wait 60 seconds before requesting another code." },
      { status: 429 }
    );
  }

  // Generate and hash the OTP
  const otp  = String(randomInt(100000, 999999));
  const salt = randomInt(1_000_000, 9_999_999).toString(36);
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

  // Send SMS
  const smsRes = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${telnyxApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromNumber,
      to:   phone,
      text: `Your CodeFounder verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
    }),
  });

  if (!smsRes.ok) {
    const err = await smsRes.text();
    console.error(`${tag} Telnyx SMS failed: ${err}`);
    return NextResponse.json(
      { error: "Failed to send verification code. Check the number and try again." },
      { status: 502 }
    );
  }

  // Persist hashed OTP — prefixed keys so they don't collide with user data
  await adminSupabase
    .from("agent_wizard_sessions")
    .update({
      voice_settings: {
        ...vs,
        _otpPhone:    phone,
        _otpHash:     hashOtp(otp, salt),
        _otpSalt:     salt,
        _otpExpiry:   expiresAt,
        _otpSentAt:   new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("agent_type", "voice");

  console.log(`${tag} OTP sent to ${phone} for user ${user.id}`);
  return NextResponse.json({ success: true });
}
