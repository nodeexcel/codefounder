import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { welcomeHtml } from "@/lib/email/templates/welcome";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawEmail = body.email;
  const rawOtp = body.otp;

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (typeof rawOtp !== "string" || !/^\d{6}$/.test(rawOtp.trim())) {
    return NextResponse.json({ error: "OTP must be 6 digits" }, { status: 400 });
  }

  const trimmedEmail = rawEmail.trim().toLowerCase();
  const otp = rawOtp.trim();

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Find the latest unverified, non-expired OTP for this email
  const { data: otpRow } = await admin
    .from("email_otps")
    .select("id, user_id, otp_code, expires_at, attempt_count")
    .eq("email", trimmedEmail)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) {
    return NextResponse.json(
      { error: "No pending verification found. Please request a new code." },
      { status: 400 },
    );
  }

  const row = otpRow as {
    id: string;
    user_id: string;
    otp_code: string;
    expires_at: string;
    attempt_count: number;
  };

  // Brute-force protection: invalidate OTP after too many wrong attempts
  if (row.attempt_count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please request a new verification code." },
      { status: 429 },
    );
  }

  // Expiry check
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Verification code has expired. Please request a new one." },
      { status: 400 },
    );
  }

  // Increment attempt count first (prevents race condition on parallel requests)
  await admin
    .from("email_otps")
    .update({ attempt_count: row.attempt_count + 1 })
    .eq("id", row.id);

  // Validate OTP
  if (row.otp_code !== otp) {
    const attemptsLeft = MAX_ATTEMPTS - (row.attempt_count + 1);
    const msg =
      attemptsLeft > 0
        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Please request a new verification code.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // OTP is correct — mark as verified
  await admin
    .from("email_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);

  // Confirm the user's email in Supabase Auth (sets email_confirmed_at)
  const { error: confirmError } = await admin.auth.admin.updateUserById(row.user_id, {
    email_confirm: true,
  });

  if (confirmError) {
    console.error("[verify-email-otp] updateUserById failed:", confirmError.message);
    return NextResponse.json({ error: "Failed to confirm email. Please try again." }, { status: 500 });
  }

  // Send welcome email only once per user
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, welcome_email_sent")
    .eq("id", row.user_id)
    .maybeSingle();

  const profileRow = profile as { full_name?: string; welcome_email_sent?: boolean } | null;

  if (!profileRow?.welcome_email_sent) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const displayName = profileRow?.full_name ?? trimmedEmail.split("@")[0];

    sendEmail(
      trimmedEmail,
      "Welcome to CodeFounder!",
      welcomeHtml({
        name: displayName,
        dashboardUrl: `${siteUrl}/dashboard`,
      }),
    ).catch((err) => console.error("[verify-email-otp] welcome email failed:", err));

    await admin
      .from("profiles")
      .update({ welcome_email_sent: true })
      .eq("id", row.user_id);
  }

  console.log("[verify-email-otp] email verified for user:", row.user_id);
  return NextResponse.json({ success: true });
}
