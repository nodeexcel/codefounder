import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, platform, scheduledAt, status } = body as {
    content?: string;
    platform?: string;
    scheduledAt?: string | null;
    status?: string;
  };

  if (!content?.trim() || !platform) {
    return NextResponse.json({ error: "content and platform are required" }, { status: 400 });
  }

  const allowedPlatforms = ["facebook", "instagram", "linkedin", "twitter"];
  if (!allowedPlatforms.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("agent_type", "marketing")
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Marketing agent not set up. Complete the wizard first." }, { status: 400 });
  }

  const postStatus = status ?? (scheduledAt ? "scheduled" : "draft");

  const { data: post, error } = await adminSupabase.from("social_posts").insert({
    user_id: user.id,
    agent_id: session.id,
    platform,
    content: content.trim(),
    scheduled_at: scheduledAt ?? null,
    status: postStatus,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: post.id });
}
