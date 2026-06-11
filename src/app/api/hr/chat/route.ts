import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface KnowledgeDoc {
  filename: string;
  content: string;
}

function findRelevantDocs(docs: KnowledgeDoc[], question: string): KnowledgeDoc[] {
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const scored = docs.map((doc) => {
    const lower = doc.content.toLowerCase();
    const score = words.reduce((s, w) => s + (lower.split(w).length - 1), 0);
    return { doc, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.doc);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agentId, question } = body as { agentId?: string; question?: string };

  if (!agentId || !question?.trim()) {
    return NextResponse.json({ error: "agentId and question are required" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("id, user_id, business_details, voice_settings")
    .eq("id", agentId)
    .eq("agent_type", "hr")
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "HR agent not found" }, { status: 404 });

  const { data: allDocs } = await adminSupabase
    .from("hr_knowledge_base")
    .select("filename, content")
    .eq("agent_id", session.id)
    .limit(20);

  const docs = allDocs ?? [];
  const relevant = findRelevantDocs(docs as KnowledgeDoc[], question);
  const contextText = relevant.length > 0
    ? relevant.map((d) => `[${d.filename}]\n${d.content.slice(0, 3000)}`).join("\n\n---\n\n")
    : "";

  const business = session.business_details as { businessName?: string } | null;
  const hr = session.voice_settings as { agentName?: string } | null;
  const companyName = business?.businessName ?? "the company";
  const agentName = hr?.agentName ?? "HR Assistant";

  const systemPrompt = `You are ${agentName}, an HR assistant for ${companyName}.
Answer employee HR questions accurately and professionally based on the documentation provided.
If the answer is not in the documentation, say so clearly and advise the employee to contact HR directly.
Keep responses concise and helpful.

${contextText ? `HR Documentation:\n${contextText}` : "No documentation has been uploaded yet. Advise the employee to contact HR directly."}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: `Hi! I'm ${agentName} for ${companyName}. AI responses aren't configured yet. Please contact HR directly for assistance.`,
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question.trim() },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[hr/chat] OpenAI error:", err);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const result = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const answer = result.choices?.[0]?.message?.content?.trim() ?? "I couldn't generate a response. Please contact HR directly.";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[hr/chat] fetch error:", err);
    return NextResponse.json({ error: "Failed to reach AI service" }, { status: 502 });
  }
}
