import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildVapiSystemPrompt } from "@/lib/vapi/prompt";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { WizardFormData } from "@/lib/types/wizard";

// POST /api/vapi/update-assistant
// Creates a NEW Vapi assistant for the authenticated user, or PATCHes their
// existing one if they already have vapi_assistant_id stored in the DB.
// Returns { success: true, assistantId: string }
export async function POST(request: Request) {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "VAPI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  // Parse body
  let body: { wizardData?: WizardFormData; vapiPhoneNumberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.wizardData?.business?.businessName || !body.wizardData?.voice?.agentName) {
    return NextResponse.json({ error: "Wizard data is incomplete" }, { status: 400 });
  }

  // Authenticate the user (cookies are available in route handlers)
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Look up any existing assistant this user already created
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("vapi_assistant_id, voice_settings")
    .eq("user_id", user.id)
    .eq("agent_type", body.wizardData.agentType ?? "voice")
    .maybeSingle();

  const sessionRow = session as {
    vapi_assistant_id?: string | null;
    voice_settings?: Record<string, unknown> | null;
  } | null;
  const existingAssistantId = sessionRow?.vapi_assistant_id ?? null;
  const sessionVoice = sessionRow?.voice_settings ?? null;

  const systemPrompt = buildVapiSystemPrompt(body.wizardData);
  const agentName = body.wizardData.voice.agentName.trim();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const calendarToolServer: Record<string, unknown> = {
    url: `${siteUrl}/api/calendar/book`,
    timeoutSeconds: 20,
  };
  // When CALENDAR_WEBHOOK_SECRET is configured, Vapi will send it as the
  // x-vapi-secret header so the calendar endpoint can verify the request.
  if (process.env.CALENDAR_WEBHOOK_SECRET) {
    calendarToolServer.secret = process.env.CALENDAR_WEBHOOK_SECRET;
  }

  const appointmentBookingTool = {
    type: "function",
    function: {
      name: "Appointment_booking",
      description: "Book an appointment in Google Calendar",
      parameters: {
        type: "object",
        required: ["callerName", "callerPhone", "startTime", "reason"],
        properties: {
          callerName: { type: "string", description: "Name of the caller" },
          callerPhone: { type: "string", description: "Phone number of the caller" },
          startTime: { type: "string", description: "Appointment start time in ISO 8601 format" },
          endTime: { type: "string", description: "Appointment end time in ISO 8601 format" },
          reason: { type: "string", description: "Reason for the appointment" },
        },
      },
    },
    server: calendarToolServer,
  };

  const forwardTo = body.wizardData.voice.forwardTo?.trim();

  const transferCallTool = forwardTo
    ? {
        type: "transferCall",
        destinations: [
          {
            type: "phoneNumber",
            number: forwardTo,
            description: "Transfer to human agent when caller requests",
          },
        ],
        function: {
          name: "transferCall",
          description:
            "Transfer the call to a human agent when the caller insists or needs human help",
        },
      }
    : null;

  const modelPayload = {
    provider: "openai",
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }],
    tools: transferCallTool
      ? [appointmentBookingTool, transferCallTool]
      : [appointmentBookingTool],
  };

  const forwardingConfig = forwardTo
    ? { forwardingPhoneNumber: forwardTo }
    : {};

  const transcriberConfig = {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  };

  const voiceConfig = {
    provider: "openai",
    voiceId: "alloy",
    fillerInjectionEnabled: true,
  };

  const latencyConfig = {
    responseDelaySeconds: 0,
    llmRequestDelaySeconds: 0,
    numWordsToInterruptAssistant: 3,
    backgroundDenoisingEnabled: true,
  };

  let assistantId: string;

  if (existingAssistantId) {
    // ── User already has an assistant — PATCH it to update the prompt ──────────
    const patchRes = await fetch(
      `https://api.vapi.ai/assistant/${existingAssistantId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: agentName,
          model: modelPayload,
          transcriber: transcriberConfig,
          voice: voiceConfig,
          ...latencyConfig,
          ...forwardingConfig,
        }),
      },
    );

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error("[vapi/update-assistant] PATCH failed:", errText);
      return NextResponse.json(
        { error: `Vapi update failed: ${errText}` },
        { status: patchRes.status },
      );
    }

    assistantId = existingAssistantId;
    console.log("[vapi/update-assistant] patched existing assistant:", assistantId);
  } else {
    // ── First time — POST to create a new, user-specific assistant ─────────────
    const createRes = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: agentName,
        model: modelPayload,
        transcriber: transcriberConfig,
        voice: voiceConfig,
        ...latencyConfig,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[vapi/update-assistant] POST failed:", errText);
      return NextResponse.json(
        { error: `Vapi create failed: ${errText}` },
        { status: createRes.status },
      );
    }

    const created = await createRes.json();
    assistantId = created.id as string;
    console.log("[vapi/update-assistant] created new assistant:", assistantId, "for user:", user.id);
  }

  // ── Assign Twilio number to assistant in Vapi (if provisioned) ───────────
  const vapiPhoneNumberId =
    body.vapiPhoneNumberId ??
    (sessionVoice?.vapiPhoneNumberId as string | undefined) ??
    null;

  if (vapiPhoneNumberId) {
    const linkRes = await fetch(`https://api.vapi.ai/phone-number/${vapiPhoneNumberId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistantId }),
    });
    if (!linkRes.ok) {
      console.warn("[vapi/update-assistant] phone-number link failed:", await linkRes.text());
      // Non-fatal: assistant is created; the number can be linked later
    } else {
      console.log("[vapi/update-assistant] linked phone number", vapiPhoneNumberId, "→ assistant", assistantId);
    }
  }

  return NextResponse.json({ success: true, assistantId });
}
