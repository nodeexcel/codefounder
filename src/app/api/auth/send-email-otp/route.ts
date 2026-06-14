import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { emailOtpHtml } from "@/lib/email/templates/email-otp";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_PER_HOUR = 3;
const MAX_NAME_LEN = 100;
const MAX_USERNAME_LEN = 40;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
  const rawPassword = body.password;
  const rawFullName = body.fullName;
  const rawUsername = body.username;
  const isResend = body.resend === true;

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const trimmedEmail = rawEmail.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // For initial signup (not resend) a password is required
  if (!isResend && (typeof rawPassword !== "string" || rawPassword.length < 8)) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const trimmedName = typeof rawFullName === "string" ? rawFullName.trim().slice(0, MAX_NAME_LEN) : "";
  const normalizedUsername =
    typeof rawUsername === "string"
      ? rawUsername.trim().toLowerCase().slice(0, MAX_USERNAME_LEN)
      : trimmedEmail.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, MAX_USERNAME_LEN);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Rate limit: at most MAX_OTP_PER_HOUR requests per hour per email
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("email_otps")
    .select("id", { count: "exact", head: true })
    .eq("email", trimmedEmail)
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= MAX_OTP_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait before requesting another code." },
      { status: 429 },
    );
  }

  let userId: string;

  if (isResend) {
    // Resend: look up existing unverified user via profiles table
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    const profileId = (profile as { id?: string } | null)?.id;
    if (!profileId) {
      return NextResponse.json(
        { error: "No account found for this email. Please sign up first." },
        { status: 404 },
      );
    }

    // Confirm the user is still unverified
    const { data: authData } = await admin.auth.admin.getUserById(profileId);
    if (authData.user?.email_confirmed_at) {
      return NextResponse.json(
        { error: "Email is already verified. Please sign in." },
        { status: 409 },
      );
    }

    userId = profileId;
  } else {
    // Initial signup: create the user (unconfirmed so no Supabase email is sent)
    const password = rawPassword as string;

    const { data: newUserData, error: createError } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: trimmedName,
        username: normalizedUsername,
      },
    });

    if (createError) {
      // User already exists in Supabase auth
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("already exists") ||
        createError.message.toLowerCase().includes("already been registered")
      ) {
        // Look up via profiles
        const { data: existingProfile } = await admin
          .from("profiles")
          .select("id")
          .eq("email", trimmedEmail)
          .maybeSingle();

        const existingId = (existingProfile as { id?: string } | null)?.id;
        if (!existingId) {
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in." },
            { status: 409 },
          );
        }

        const { data: existingAuthData } = await admin.auth.admin.getUserById(existingId);
        if (existingAuthData.user?.email_confirmed_at) {
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in." },
            { status: 409 },
          );
        }

        // Existing unverified user — treat as resend
        userId = existingId;
      } else {
        console.error("[send-email-otp] createUser failed:", createError.message);
        return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
      }
    } else {
      userId = newUserData.user.id;
    }
  }

  // Invalidate any previous unverified OTPs for this email to keep things tidy
  await admin
    .from("email_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("email", trimmedEmail)
    .is("verified_at", null);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await admin.from("email_otps").insert({
    user_id: userId,
    email: trimmedEmail,
    otp_code: otp,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("[send-email-otp] DB insert failed:", insertError.message);
    return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 });
  }

  const displayName = trimmedName || normalizedUsername;
  const { success, error: emailErr } = await sendEmail(
    trimmedEmail,
    "Your CodeFounder verification code",
    emailOtpHtml({ name: displayName, otp, expiryMinutes: OTP_EXPIRY_MINUTES }),
  );

  if (!success) {
    console.error("[send-email-otp] email send failed:", emailErr);
    // Clean up the OTP we just inserted so rate limit isn't wasted
    await admin.from("email_otps").delete().eq("email", trimmedEmail).is("verified_at", null);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }

  console.log("[send-email-otp] OTP sent to", trimmedEmail, "for user", userId);
  return NextResponse.json({ success: true });
}
