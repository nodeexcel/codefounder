import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("business_details, voice_settings")
    .eq("id", agentId)
    .eq("agent_type", "hr")
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const business = session.business_details as { businessName?: string } | null;
  const hr = session.voice_settings as { agentName?: string; leaveTypes?: string[] } | null;

  return NextResponse.json({
    agentName: hr?.agentName ?? "HR Assistant",
    companyName: business?.businessName ?? "",
    leaveTypes: hr?.leaveTypes ?? [],
  });
}
