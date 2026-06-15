import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  let body: { agentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { agentType } = body;
  if (!agentType) {
    return NextResponse.json({ error: "agentType is required" }, { status: 400 });
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

  // Fetch the session to get associated IDs before deleting
  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("id, vapi_assistant_id, voice_settings")
    .eq("user_id", user.id)
    .eq("agent_type", agentType)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const sessionId = (session as { id: string }).id;
  const vapiAssistantId = (session as { vapi_assistant_id?: string }).vapi_assistant_id;
  const vapiApiKey = process.env.VAPI_API_KEY;

  // ── 1. Delete Vapi assistant ──────────────────────────────────────────────
  if (vapiAssistantId && vapiApiKey) {
    const delRes = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${vapiApiKey}` },
    });
    if (!delRes.ok) {
      console.warn("[delete-agent] Vapi assistant delete failed (non-fatal):", await delRes.text());
    } else {
      console.log("[delete-agent] Deleted Vapi assistant:", vapiAssistantId);
    }
  }

  // ── 2. Delete HR-specific data ────────────────────────────────────────────
  if (agentType === "hr") {
    await Promise.all([
      adminSupabase.from("hr_knowledge_base").delete().eq("agent_id", sessionId),
      adminSupabase.from("hr_leave_requests").delete().eq("agent_id", sessionId),
      adminSupabase.from("hr_onboarding_checklists").delete().eq("agent_id", sessionId),
    ]);
    console.log("[delete-agent] Deleted HR data for session:", sessionId);
  }

  // ── 3. Delete wizard session (call_logs are preserved — history is valuable) ─
  const { error: deleteErr } = await adminSupabase
    .from("agent_wizard_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("agent_type", agentType);

  if (deleteErr) {
    console.error("[delete-agent] DB delete failed:", deleteErr);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }

  console.log("[delete-agent] Deleted agent:", agentType, "for user:", user.id);
  return NextResponse.json({ success: true });
}
