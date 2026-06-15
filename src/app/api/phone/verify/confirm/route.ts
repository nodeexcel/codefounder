import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// POST /api/phone/verify/confirm
// Validates the OTP sent by /api/phone/verify/send.
// On success: clears the temporary OTP keys and writes forwardToVerified.

function hashOtp(otp: string, salt: string): string {
  return createHash("sha256").update(otp + "|" + salt).digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { phone?: string; otp?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { phone, otp } = body;
  if (!phone || !otp) {
    return NextResponse.json({ error: "phone and otp are required" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: sessionRow } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("voice_settings")
    .eq("user_id", user.id)
    .eq("agent_type", "voice")
    .maybeSingle();

  const vs = (sessionRow?.voice_settings as Record<string, unknown>) ?? {};

  const storedPhone  = vs._otpPhone  as string | undefined;
  const storedHash   = vs._otpHash   as string | undefined;
  const storedSalt   = vs._otpSalt   as string | undefined;
  const storedExpiry = vs._otpExpiry as string | undefined;

  if (!storedHash || !storedSalt || !storedPhone || !storedExpiry) {
    return NextResponse.json(
      { error: "No verification pending. Request a new code first." },
      { status: 400 }
    );
  }

  if (new Date(storedExpiry) < new Date()) {
    return NextResponse.json(
      { error: "Verification code has expired. Request a new one." },
      { status: 400 }
    );
  }

  if (storedPhone !== phone) {
    return NextResponse.json(
      { error: "Phone number does not match the one the code was sent to." },
      { status: 400 }
    );
  }

  const attempts = (vs._otpAttempts as number | undefined) ?? 0;
  if (attempts >= 3) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new verification code." },
      { status: 429 }
    );
  }

  if (hashOtp(otp.trim(), storedSalt) !== storedHash) {
    // Increment attempt count — clear OTP keys when exhausted to force a resend
    const newAttempts = attempts + 1;
    if (newAttempts >= 3) {
      // Exhaust — remove OTP data so the user must request a new code
      const vsLocked: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(vs)) {
        if (!k.startsWith("_otp")) vsLocked[k] = v;
      }
      await adminSupabase
        .from("agent_wizard_sessions")
        .update({ voice_settings: vsLocked, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("agent_type", "voice");
    } else {
      await adminSupabase
        .from("agent_wizard_sessions")
        .update({
          voice_settings: { ...vs, _otpAttempts: newAttempts },
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("agent_type", "voice");
    }
    return NextResponse.json(
      { error: `Incorrect verification code. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? "" : "s"} remaining.` },
      { status: 400 }
    );
  }

  // Verification passed — strip the temporary OTP keys and write the verified number
  const vsUpdated: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vs)) {
    if (!k.startsWith("_otp")) vsUpdated[k] = v;
  }
  vsUpdated.forwardToVerified = phone;

  await adminSupabase
    .from("agent_wizard_sessions")
    .update({
      voice_settings: vsUpdated,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("agent_type", "voice");

  return NextResponse.json({ success: true });
}
