import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function extractText(buffer: Buffer, mimeType: string, filename: string): string {
  const lc = filename.toLowerCase();
  if (mimeType === "text/plain" || lc.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  if (mimeType === "application/pdf" || lc.endsWith(".pdf")) {
    // Extract text between parentheses in PDF content streams
    const raw = buffer.toString("binary");
    const chunks: string[] = [];
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === "(") {
        let j = i + 1;
        let text = "";
        while (j < raw.length && raw[j] !== ")") {
          if (raw[j] === "\\") { j++; }
          text += raw[j];
          j++;
        }
        const clean = text.replace(/[^\x20-\x7E]/g, "").trim();
        if (clean.length > 2 && /[a-zA-Z]{2,}/.test(clean)) {
          chunks.push(clean);
        }
        i = j + 1;
      } else {
        i++;
      }
    }
    const extracted = chunks.join(" ").replace(/\s+/g, " ").trim();
    return extracted.length > 50
      ? extracted
      : "[PDF uploaded — content could not be extracted automatically. Use .txt format for best results.]";
  }
  // DOC/DOCX: return what UTF-8 decoding can recover
  const text = buffer.toString("utf-8").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 50 ? text : `[${filename} uploaded]`;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const allowed = [
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const lc = file.name.toLowerCase();
  if (!allowed.includes(file.type) && !lc.endsWith(".txt") && !lc.endsWith(".pdf") && !lc.endsWith(".doc") && !lc.endsWith(".docx")) {
    return NextResponse.json({ error: "Only PDF, DOC, and TXT files are supported" }, { status: 400 });
  }

  const adminSupabase = adminClient();

  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("agent_type", "hr")
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "HR agent not set up. Complete the wizard first." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const content = extractText(Buffer.from(bytes), file.type, file.name);
  const truncatedContent = content.slice(0, 100_000);

  // Upload to Vapi Knowledge Base
  let vapiKbId: string | null = null;
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (vapiApiKey) {
    try {
      const vapiRes = await fetch("https://api.vapi.ai/knowledge-base", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: file.name, content: truncatedContent }),
      });
      if (vapiRes.ok) {
        const vapiData = await vapiRes.json() as { id?: string };
        vapiKbId = vapiData.id ?? null;
      } else {
        console.warn("[hr/upload-knowledge] Vapi KB upload failed:", await vapiRes.text());
      }
    } catch (err) {
      console.warn("[hr/upload-knowledge] Vapi KB upload error:", err);
    }
  }

  const { error } = await adminSupabase.from("hr_knowledge_base").insert({
    user_id: user.id,
    agent_id: session.id,
    filename: file.name,
    content: truncatedContent,
    ...(vapiKbId ? { vapi_knowledge_base_id: vapiKbId } : {}),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, filename: file.name });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.filename) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  const adminSupabase = adminClient();

  // Fetch the row to get vapi_knowledge_base_id before deleting
  const { data: row } = await adminSupabase
    .from("hr_knowledge_base")
    .select("id, vapi_knowledge_base_id")
    .eq("user_id", user.id)
    .eq("filename", body.filename)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete from Vapi Knowledge Base
  const vapiApiKey = process.env.VAPI_API_KEY;
  const vapiKbId = (row as { id: string; vapi_knowledge_base_id?: string | null }).vapi_knowledge_base_id;
  if (vapiApiKey && vapiKbId) {
    try {
      const vapiRes = await fetch(`https://api.vapi.ai/knowledge-base/${vapiKbId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${vapiApiKey}` },
      });
      if (!vapiRes.ok) {
        console.warn("[hr/upload-knowledge] Vapi KB delete failed:", await vapiRes.text());
      }
    } catch (err) {
      console.warn("[hr/upload-knowledge] Vapi KB delete error:", err);
    }
  }

  // Delete from Supabase
  const { error } = await adminSupabase
    .from("hr_knowledge_base")
    .delete()
    .eq("id", (row as { id: string }).id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
