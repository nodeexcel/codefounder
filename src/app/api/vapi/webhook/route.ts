import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { newCallHtml } from "@/lib/email/templates/new-call";
import {
  appointmentHtml,
  detectsAppointment,
  extractAppointmentDetails,
} from "@/lib/email/templates/appointment";

interface VapiCall {
  id: string;
  assistantId?: string;
  status?: string;
  customer?: { number?: string; name?: string };
  startedAt?: string;
  endedAt?: string;
  metadata?: Record<string, string>;
}

// Vapi sends either { message: { type, call, ... } } or flat { type, call, ... }
interface VapiMessage {
  role?: string;
  message?: string;
  content?: string;
}

interface VapiEventData {
  type?: string;
  status?: string;   // present on status-update events
  call?: VapiCall;
  durationSeconds?: number;
  transcript?: string;
  recordingUrl?: string;
  messages?: VapiMessage[];
  artifact?: {
    transcript?: string;
    recordingUrl?: string;
    messages?: VapiMessage[];
  };
}

function extractCallerName(transcript: string | null, messages: VapiMessage[]): string | null {
  // Try messages array first — look for a system/bot message that echoes the caller's name
  for (const msg of messages) {
    if (msg.role === "user") continue; // skip — user messages are the raw speech
    const text = msg.message ?? msg.content ?? "";
    const match = text.match(/(?:calling|name is|I(?:'m| am))\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (match) return match[1];
  }

  // Fall back to transcript patterns
  if (transcript) {
    const patterns = [
      /my name(?:'s| is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /(?:I(?:'m| am)|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /(?:speaking with|talking to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    ];
    for (const re of patterns) {
      const m = transcript.match(re);
      if (m) return m[1];
    }
  }

  return null;
}

interface VapiWebhookPayload extends VapiEventData {
  message?: VapiEventData;
}

// Events that signal a call has fully ended (with complete data)
const CALL_END_EVENTS = new Set(["end-of-call-report", "call-ended", "hang"]);

export async function POST(request: Request) {
  // When VAPI_WEBHOOK_SECRET is configured, require matching x-vapi-secret header.
  // Backward-compatible: if the env var is not set, the check is skipped so
  // existing deployments without the secret continue to work.
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = request.headers.get("x-vapi-secret");
    if (provided !== webhookSecret) {
      console.warn("[vapi/webhook] signature mismatch — rejecting request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[vapi/webhook] MISSING env vars", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceRoleKey,
    });
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let rawBody: VapiWebhookPayload;
  try {
    rawBody = await request.json();
  } catch {
    console.error("[vapi/webhook] Failed to parse request body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log the full payload so you can see exactly what Vapi is sending
  console.log("[vapi/webhook] received payload:", JSON.stringify(rawBody, null, 2));

  // Handle both { message: { type, call, ... } } and flat { type, call, ... }
  const event: VapiEventData = rawBody.message ?? rawBody;
  const eventType = event.type ?? "unknown";

  console.log("[vapi/webhook] event type:", eventType);

  // For status-update: only persist when Vapi signals the call ended
  if (eventType === "status-update") {
    if (event.status !== "ended") {
      console.log("[vapi/webhook] status-update ignored (status:", event.status, ")");
      return NextResponse.json({ received: true });
    }
    console.log("[vapi/webhook] status-update with status=ended — saving stub record");
  } else if (!CALL_END_EVENTS.has(eventType)) {
    console.log("[vapi/webhook] ignoring event:", eventType);
    return NextResponse.json({ received: true });
  }

  const call = event.call;

  if (!call?.id) {
    console.error("[vapi/webhook] missing call.id in payload", { event });
    return NextResponse.json({ error: "Missing call.id" }, { status: 400 });
  }

  // status-update/ended may not have transcript or recording yet — end-of-call-report will upsert those
  const transcript = event.transcript ?? event.artifact?.transcript ?? null;
  const recordingUrl = event.recordingUrl ?? event.artifact?.recordingUrl ?? null;
  const messages = event.messages ?? event.artifact?.messages ?? [];
  // Prefer explicit customer name, then extract from transcript/messages, then fall back to phone number
  const callerNumber =
    call.customer?.name ??
    extractCallerName(transcript, messages) ??
    call.customer?.number ??
    null;
  const agentId = call.assistantId ?? null;
  // Always mark as "ended" for end-of-call events regardless of what status field says
  const status = CALL_END_EVENTS.has(eventType) ? "ended" : (event.status ?? call.status ?? eventType);

  const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // Resolve user_id with a three-tier fallback:
  // 1. Explicit user_id in Vapi call metadata (manual override)
  // 2. Match vapi_assistant_id in agent_wizard_sessions (correct per-user lookup)
  // 3. Any live voice session (legacy fallback for calls before migration 006)
  let userId: string | null = call.metadata?.user_id ?? null;

  if (!userId && agentId) {
    // Tier 2: per-user assistant ID match
    const { data: byAssistant } = await adminSupabase
      .from("agent_wizard_sessions")
      .select("user_id")
      .eq("vapi_assistant_id", agentId)
      .maybeSingle();

    userId = (byAssistant as { user_id: string } | null)?.user_id ?? null;

    if (userId) {
      console.log("[vapi/webhook] resolved user_id by vapi_assistant_id:", agentId, "→", userId);
    } else {
      // Tier 3: legacy — find any live voice session (single-user only, pre-migration)
      const { data: anyLive } = await adminSupabase
        .from("agent_wizard_sessions")
        .select("user_id")
        .eq("agent_type", "voice")
        .eq("status", "live")
        .limit(1)
        .maybeSingle();
      userId = (anyLive as { user_id: string } | null)?.user_id ?? null;
      if (userId) {
        console.log("[vapi/webhook] resolved user_id from live session (legacy fallback):", userId);
      } else {
        console.warn("[vapi/webhook] could not resolve user_id for assistant:", agentId);
      }
    }
  }

  // Do not write records with null user_id: the RLS policy requires user_id = auth.uid(),
  // so unattributed records would be invisible anyway and storing them serves no purpose.
  if (!userId) {
    console.warn("[vapi/webhook] dropping call", call.id, "— user_id could not be resolved");
    return NextResponse.json({ received: true });
  }

  let duration: number | null = null;
  if (typeof event.durationSeconds === "number") {
    duration = Math.round(event.durationSeconds);
  } else if (call.startedAt && call.endedAt) {
    duration = Math.round(
      (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000,
    );
  }

  const record = {
    call_id: call.id,
    user_id: userId,
    agent_id: agentId,
    caller_number: callerNumber,
    duration,
    transcript,
    recording_url: recordingUrl,
    status,
  };

  console.log("[vapi/webhook] saving to Supabase:", record);
  console.log("[vapi/webhook] using Supabase URL:", supabaseUrl);

  const { error } = await adminSupabase
    .from("call_logs")
    .upsert(record, { onConflict: "call_id" });

  if (error) {
    console.error("[vapi/webhook] Supabase upsert failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: "Database write failed" }, { status: 500 });
  }

  console.log("[vapi/webhook] successfully saved call_id:", call.id);

  // Send email notifications only for end-of-call-report (full data) with a known owner
  if (eventType === "end-of-call-report" && userId) {
    // Fire email notifications without blocking the webhook response
    sendCallNotifications({
      adminSupabase,
      userId,
      callerName: callerNumber,
      callerPhone: call.customer?.number ?? null,
      durationSeconds: duration,
      transcript,
    }).catch((err) => console.error("[vapi/webhook] notification error:", err));
  }

  return NextResponse.json({ received: true });
}

async function sendCallNotifications({
  adminSupabase,
  userId,
  callerName,
  callerPhone,
  durationSeconds,
  transcript,
}: {
  adminSupabase: SupabaseClient;
  userId: string;
  callerName: string | null;
  callerPhone: string | null;
  durationSeconds: number | null;
  transcript: string | null;
}) {
  // Look up the business owner's email
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const ownerEmail = (profile as { email?: string } | null)?.email;
  if (!ownerEmail) {
    console.warn("[vapi/webhook] no email for user_id:", userId);
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callsUrl = `${siteUrl}/calls`;

  // New call notification — always send for end-of-call-report
  await sendEmail(
    ownerEmail,
    "New call received — CodeFounder",
    newCallHtml({
      callerName,
      callerPhone,
      durationSeconds,
      transcriptPreview: transcript,
      callsUrl,
    }),
  );

  // Appointment notification — send when transcript suggests a booking was made
  if (detectsAppointment(transcript)) {
    const appointmentDetails = extractAppointmentDetails(transcript ?? "");
    await sendEmail(
      ownerEmail,
      "New appointment booked! — CodeFounder",
      appointmentHtml({
        callerName,
        callerPhone,
        appointmentDetails,
        callsUrl,
      }),
    );
  }
}
