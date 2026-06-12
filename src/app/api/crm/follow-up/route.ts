import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail, emailLayout } from "@/lib/email/resend";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("crm_follow_ups")
    .select(`
      id, message, channel, scheduled_at, sent_at, status, created_at,
      crm_contacts(id, name, email, phone)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ followUps: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { contactId, message, channel, scheduledAt, sendNow } = body as {
    contactId?: string;
    message?: string;
    channel?: string;
    scheduledAt?: string | null;
    sendNow?: boolean;
  };

  if (!contactId || !message?.trim()) {
    return NextResponse.json({ error: "contactId and message are required" }, { status: 400 });
  }

  // Verify contact belongs to user
  const { data: contact, error: contactErr } = await supabase
    .from("crm_contacts")
    .select("id, name, email, phone")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (contactErr || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const followUpChannel = (channel ?? "email") as "email" | "sms" | "both";
  let status: "pending" | "sent" | "failed" = "pending";
  let sentAt: string | null = null;

  // Send immediately if sendNow=true and contact has email
  if (sendNow && contact.email && (followUpChannel === "email" || followUpChannel === "both")) {
    const html = emailLayout(
      `Follow-up for ${contact.name}`,
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#cccccc;line-height:1.6;">
        Hi ${contact.name},
      </p>
      <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#cccccc;line-height:1.6;">
        ${message.trim().replace(/\n/g, "<br/>")}
      </p>`
    );
    const result = await sendEmail(contact.email, "Follow-up from our team", html);
    if (result.success) {
      status = "sent";
      sentAt = new Date().toISOString();
    } else {
      status = "failed";
    }
  }

  const { data: record, error: insertErr } = await supabase
    .from("crm_follow_ups")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      message: message.trim(),
      channel: followUpChannel,
      scheduled_at: scheduledAt ?? null,
      sent_at: sentAt,
      status,
    })
    .select("id")
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Log interaction
  await supabase.from("crm_interactions").insert({
    user_id: user.id,
    contact_id: contactId,
    type: followUpChannel === "sms" ? "sms" : "email",
    content: message.trim(),
  });

  return NextResponse.json({ success: true, id: record.id, status });
}
