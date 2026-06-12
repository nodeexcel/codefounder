import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { phoneNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawPhone = body.phoneNumber?.trim() ?? "";
  if (!rawPhone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("[send-otp] Twilio env vars not configured");
    return NextResponse.json({ error: "SMS service is not configured" }, { status: 500 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Remove any existing (unverified) OTPs for this user + phone
  await adminSupabase
    .from("phone_otps")
    .delete()
    .eq("user_id", user.id)
    .eq("phone_number", phone)
    .is("verified_at", null);

  const { error: insertError } = await adminSupabase.from("phone_otps").insert({
    user_id:      user.id,
    phone_number: phone,
    otp_code:     otp,
    expires_at:   expiresAt,
  });

  if (insertError) {
    console.error("[send-otp] DB insert failed:", insertError);
    return NextResponse.json({ error: "Failed to create OTP" }, { status: 500 });
  }

  // Send SMS via Twilio REST API
  const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const smsBody = new URLSearchParams({
    From: fromNumber,
    To:   phone,
    Body: `Your CodeFounder verification code is: ${otp}. Valid for 10 minutes.`,
  });

  const smsRes = await fetch(twilioUrl, {
    method:  "POST",
    headers: {
      Authorization:  `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: smsBody.toString(),
  });

  if (!smsRes.ok) {
    const errText = await smsRes.text();
    console.error("[send-otp] Twilio SMS failed:", errText);
    await adminSupabase.from("phone_otps").delete().eq("user_id", user.id).eq("phone_number", phone).is("verified_at", null);
    return NextResponse.json(
      { error: "Failed to send SMS. Please check the phone number and try again." },
      { status: 502 }
    );
  }

  console.log("[send-otp] OTP sent to", phone, "for user", user.id);
  return NextResponse.json({ success: true });
}
