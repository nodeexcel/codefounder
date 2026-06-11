import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PLATFORM_GUIDES: Record<string, { maxChars: number; style: string }> = {
  twitter:   { maxChars: 280,  style: "concise, punchy, use 1-2 relevant hashtags, conversational" },
  instagram: { maxChars: 2200, style: "engaging, visual storytelling, 3-5 relevant hashtags, emojis encouraged" },
  facebook:  { maxChars: 500,  style: "friendly and informative, 1-2 sentences, optional link preview reference" },
  linkedin:  { maxChars: 1300, style: "professional, thought-leadership tone, 2-3 paragraphs, 2-3 hashtags" },
};

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

  const { platform, topic, tone, businessName } = body as {
    platform?: string;
    topic?: string;
    tone?: string;
    businessName?: string;
  };

  if (!platform || !topic?.trim()) {
    return NextResponse.json({ error: "platform and topic are required" }, { status: 400 });
  }

  const guide = PLATFORM_GUIDES[platform] ?? PLATFORM_GUIDES.facebook;
  const brand = businessName?.trim() || "our business";
  const postTone = tone ?? "Professional";

  const systemPrompt = `You are a social media copywriter. Write a single ${platform} post for "${brand}".
Tone: ${postTone}.
Style: ${guide.style}.
Max characters: ${guide.maxChars}.
Output ONLY the post text — no quotes, no labels, no extra commentary.`;

  const userPrompt = `Write a ${platform} post about: ${topic.trim()}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      content: `[Demo] ${topic} — Connect your OpenAI API key to generate real posts for ${brand} on ${platform}.`,
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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[marketing/generate-post] OpenAI error:", err);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const result = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const content = result.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ content });
  } catch (err) {
    console.error("[marketing/generate-post] fetch error:", err);
    return NextResponse.json({ error: "Failed to reach AI service" }, { status: 502 });
  }
}
