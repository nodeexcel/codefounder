import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { phoneNumber?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawPhone = body.phoneNumber?.trim() ?? "";
  const code     = body.code?.trim() ?? "";

  if (!rawPhone || !code) {
    return NextResponse.json({ error: "Phone number and code are required" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Code must be 6 digits" }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: otpRow } = await adminSupabase
    .from("phone_otps")
    .select("id, otp_code, expires_at")
    .eq("user_id", user.id)
    .eq("phone_number", phone)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) {
    return NextResponse.json(
      { error: "No pending verification found. Please request a new code." },
      { status: 400 }
    );
  }

  const row = otpRow as { id: string; otp_code: string; expires_at: string };

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Code has expired. Please request a new one." },
      { status: 400 }
    );
  }

  if (row.otp_code !== code) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  await adminSupabase
    .from("phone_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);

  console.log("[verify-otp] Phone", phone, "verified for user", user.id);
  return NextResponse.json({ success: true });
}
