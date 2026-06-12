import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Fetch call logs
  const { data: calls, error: callsErr } = await supabase
    .from("call_logs")
    .select("id, caller_number, transcript, created_at")
    .eq("user_id", user.id)
    .not("caller_number", "is", null)
    .order("created_at", { ascending: false });

  if (callsErr) return NextResponse.json({ error: callsErr.message }, { status: 500 });
  if (!calls?.length) return NextResponse.json({ imported: 0, message: "No calls with caller info found" });

  // Fetch existing contacts to avoid duplicates (by phone)
  const { data: existing } = await supabase
    .from("crm_contacts")
    .select("phone")
    .eq("user_id", user.id);

  const existingPhones = new Set((existing ?? []).map((c: { phone: string }) => c.phone.replace(/\D/g, "")));

  // Find first pipeline stage name
  const { data: stages } = await supabase
    .from("crm_pipeline_stages")
    .select("name, order_index")
    .eq("user_id", user.id)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  const firstStage = (stages as { name: string } | null)?.name ?? "New Lead";

  // Get voice agent_id if available
  const { data: voiceSession } = await supabase
    .from("agent_wizard_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("agent_type", "voice")
    .maybeSingle();

  const voiceAgentId = (voiceSession as { id?: string } | null)?.id ?? null;

  const newContacts: { user_id: string; agent_id: string | null; name: string; phone: string; source: string; pipeline_stage: string; notes: string }[] = [];

  for (const call of calls) {
    const rawPhone = call.caller_number as string;
    const normalizedPhone = rawPhone.replace(/\D/g, "");

    if (existingPhones.has(normalizedPhone)) continue;
    existingPhones.add(normalizedPhone); // avoid dupes within this batch

    // Extract a name hint from transcript
    let name = rawPhone;
    if (call.transcript) {
      const patterns = [
        /my name(?:'s| is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /(?:I(?:'m| am)|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      ];
      for (const re of patterns) {
        const m = (call.transcript as string).match(re);
        if (m) { name = m[1]; break; }
      }
    }

    const notes = call.transcript
      ? `Imported from call on ${new Date(call.created_at as string).toLocaleDateString()}`
      : `Imported from call on ${new Date(call.created_at as string).toLocaleDateString()}`;

    newContacts.push({
      user_id: user.id,
      agent_id: voiceAgentId,
      name,
      phone: rawPhone,
      source: "voice_agent",
      pipeline_stage: firstStage,
      notes,
    });
  }

  if (!newContacts.length) {
    return NextResponse.json({ imported: 0, message: "All callers are already in the CRM" });
  }

  const { error: insertErr } = await supabase.from("crm_contacts").insert(newContacts);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ imported: newContacts.length });
}
