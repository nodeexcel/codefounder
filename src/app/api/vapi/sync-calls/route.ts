import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function mapEndedReason(endedReason?: string | null): string {
  switch (endedReason) {
    case "customer-ended-call":
    case "assistant-ended-call":
    case "hangup":
    case "pipeline-error-openai-llm-failed": // assistant ended due to error but call completed
      return "completed";
    case "silence-timed-out":
    case "customer-did-not-answer":
    case "voicemail":
      return "no-answer";
    case "assistant-error":
    case "error":
      return "failed";
    default:
      return endedReason ? "ended" : "ended";
  }
}

interface VapiCallFromAPI {
  id: string;
  assistantId?: string;
  status?: string;
  endedReason?: string;
  customer?: { number?: string; name?: string };
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  artifact?: { transcript?: string; recordingUrl?: string };
}

export async function GET() {
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!vapiApiKey) {
    return NextResponse.json({ error: "VAPI_API_KEY not configured" }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Get user's live voice agent assistant ID
  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("vapi_assistant_id")
    .eq("user_id", user.id)
    .eq("agent_type", "voice")
    .maybeSingle();

  const assistantId = (session as { vapi_assistant_id?: string } | null)?.vapi_assistant_id;

  if (!assistantId) {
    return NextResponse.json({ synced: 0, message: "No voice agent configured" });
  }

  // Fetch up to 100 most recent calls for this assistant from Vapi API
  const vapiRes = await fetch(
    `https://api.vapi.ai/call?assistantId=${assistantId}&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!vapiRes.ok) {
    const err = await vapiRes.text();
    console.error("[sync-calls] Vapi API error:", err);
    return NextResponse.json({ error: "Failed to fetch calls from Vapi" }, { status: 502 });
  }

  const calls = (await vapiRes.json()) as VapiCallFromAPI[];

  if (!Array.isArray(calls) || calls.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  // Only sync calls that have ended
  const endedCalls = calls.filter((c) => c.status === "ended" || c.endedReason);

  if (endedCalls.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const records = endedCalls.map((call) => {
    let duration: number | null = null;
    if (typeof call.durationSeconds === "number") {
      duration = Math.round(call.durationSeconds);
    } else if (call.startedAt && call.endedAt) {
      duration = Math.round(
        (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000,
      );
    }

    return {
      call_id: call.id,
      user_id: user.id,
      agent_id: assistantId,
      caller_number: call.customer?.name ?? call.customer?.number ?? null,
      duration,
      transcript: call.artifact?.transcript ?? null,
      recording_url: call.artifact?.recordingUrl ?? null,
      status: mapEndedReason(call.endedReason),
      created_at: call.startedAt ?? new Date().toISOString(),
    };
  });

  const { error } = await adminSupabase
    .from("call_logs")
    .upsert(records, { onConflict: "call_id" });

  if (error) {
    console.error("[sync-calls] upsert error:", error);
    return NextResponse.json({ error: "Database write failed" }, { status: 500 });
  }

  console.log(`[sync-calls] synced ${records.length} calls for user ${user.id}`);
  return NextResponse.json({ synced: records.length });
}
