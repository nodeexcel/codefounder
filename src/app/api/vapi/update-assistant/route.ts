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

  // Parse body — vapiPhoneNumberId is now carried inside wizardData.voice.vapiPhoneNumberId.
  // The top-level vapiPhoneNumberId field is kept for backward compatibility only.
  let body: { wizardData?: WizardFormData; vapiPhoneNumberId?: string | null };
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
    .select("vapi_assistant_id, voice_settings, twilio_phone_number")
    .eq("user_id", user.id)
    .eq("agent_type", body.wizardData.agentType ?? "voice")
    .maybeSingle();

  const sessionRow = session as {
    vapi_assistant_id?: string | null;
    voice_settings?: Record<string, unknown> | null;
    twilio_phone_number?: string | null;
  } | null;
  const existingAssistantId = sessionRow?.vapi_assistant_id ?? null;
  const sessionVoice = sessionRow?.voice_settings ?? null;

  // Fetch knowledge base IDs for this user
  const { data: kbRows } = await adminSupabase
    .from("hr_knowledge_base")
    .select("vapi_knowledge_base_id")
    .eq("user_id", user.id)
    .not("vapi_knowledge_base_id", "is", null);

  const kbFileIds = (kbRows ?? [])
    .map((r: { vapi_knowledge_base_id?: string | null }) => r.vapi_knowledge_base_id)
    .filter((id): id is string => !!id);

  const systemPrompt = buildVapiSystemPrompt(body.wizardData);
  const agentName = body.wizardData.voice.agentName.trim();
  const businessName = body.wizardData.business.businessName.trim();
  // Natural greeting — single sentence, discloses AI without the stilted "Please note" preamble
  const firstMessage = `Hi, you've reached ${businessName}! I'm ${agentName}, an AI assistant. How can I help you today?`;

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

  // Only use the forwarding number when it has been OTP-verified. forwardToVerified
  // stores the verified phone; if it doesn't match forwardTo the number was never
  // confirmed and must not be wired into the assistant.
  const rawForwardTo = body.wizardData.voice.forwardTo?.trim();
  const forwardToVerified = body.wizardData.voice.forwardToVerified?.trim();
  const forwardTo = rawForwardTo && forwardToVerified === rawForwardTo ? rawForwardTo : undefined;

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
    temperature: 0.4,     // was 0.7 — lower = more focused answers, less hallucination
    maxTokens: 150,
    messages: [{ role: "system", content: systemPrompt }],
    tools: transferCallTool
      ? [appointmentBookingTool, transferCallTool]
      : [appointmentBookingTool],
  };

  const forwardingConfig = forwardTo
    ? { forwardingPhoneNumber: forwardTo }
    : {};

  const selectedLanguages = body.wizardData.voice.languages ?? ["English"];
  const isMultiLang = selectedLanguages.length > 1;

  // Multi-language: nova-3 is required. nova-2 + "multi" only covers Spanish/English
  // (confirmed from Deepgram docs). nova-3 + "multi" covers English, Spanish, French,
  // German, Hindi, Russian, Portuguese, Japanese, Italian, Dutch — which includes Hindi.
  // Urdu and Punjabi are not in nova-3's multi scope but the LLM can still reply in
  // them if Deepgram transcribes the audio as Hindi (phonetically similar) or English.
  // Endpointing raised to 200ms for multi-language detection accuracy.
  // Single-language: nova-2 at 100ms for fastest English end-of-utterance detection.
  const transcriberConfig = isMultiLang
    ? {
        provider: "deepgram",
        model: "nova-3",
        language: "multi",
        smartFormat: true,
        endpointing: 200,
      }
    : {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
        smartFormat: true,
        endpointing: 100,
      };

  // OpenAI TTS chosen deliberately over Cartesia: Cartesia Sonic Multilingual
  // does not support Punjabi or Urdu. OpenAI's neural TTS handles all four
  // target languages (English, Hindi, Urdu, Punjabi) without extra cost.
  const voiceConfig = {
    provider: "openai",
    voiceId: "nova",
  };

  const latencyConfig = {
    responseDelaySeconds: 0,
    llmRequestDelaySeconds: 0,
    numWordsToInterruptAssistant: 1,  // was 2 — one word triggers barge-in for faster interrupts
    backgroundDenoisingEnabled: true,
    fillersEnabled: true,             // "mm-hmm", "I see" reduces perceived response latency
  };

  const endCallConfig = {
    endCallFunctionEnabled: true,
    endCallPhrases: ["goodbye", "thank you goodbye", "have a good day", "talk to you later"],
    silenceTimeoutSeconds: 30,
  };

  let assistantId: string;

  // Webhook URL — tells Vapi where to send end-of-call-report, call-ended, etc.
  // Without this field the assistant is created without a webhook and no calls
  // are ever written to call_logs.
  const vapiWebhookUrl = `${siteUrl}/api/vapi/webhook`;
  const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET ?? undefined;

  if (existingAssistantId) {
    // ── User already has an assistant — PATCH it to update the prompt ──────────
    const patchPayload = {
      name: agentName,
      firstMessage,
      model: modelPayload,
      transcriber: transcriberConfig,
      voice: voiceConfig,
      startSpeakingPlan: { waitSeconds: 0, smartEndpointingEnabled: true },
      ...latencyConfig,
      ...endCallConfig,
      ...forwardingConfig,
      ...(kbFileIds.length > 0 ? { knowledgeBase: { fileIds: kbFileIds } } : {}),
      serverUrl: vapiWebhookUrl,
      ...(vapiWebhookSecret ? { serverUrlSecret: vapiWebhookSecret } : {}),
    };
    console.log("[vapi/update-assistant] PATCH payload:", JSON.stringify(patchPayload, null, 2));
    const patchRes = await fetch(
      `https://api.vapi.ai/assistant/${existingAssistantId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchPayload),
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
    const createPayload = {
      name: agentName,
      firstMessage,
      model: modelPayload,
      transcriber: transcriberConfig,
      voice: voiceConfig,
      startSpeakingPlan: { waitSeconds: 0, smartEndpointingEnabled: true },
      ...latencyConfig,
      ...endCallConfig,
      ...(kbFileIds.length > 0 ? { knowledgeBase: { fileIds: kbFileIds } } : {}),
      serverUrl: vapiWebhookUrl,
      ...(vapiWebhookSecret ? { serverUrlSecret: vapiWebhookSecret } : {}),
    };
    console.log("[vapi/update-assistant] POST payload:", JSON.stringify(createPayload, null, 2));
    const createRes = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
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

    // Persist assistantId server-side immediately so the webhook can resolve user_id
    // even if the client-side DB write in the wizard fails (e.g. network error after launch).
    await adminSupabase
      .from("agent_wizard_sessions")
      .update({ vapi_assistant_id: assistantId, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("agent_type", body.wizardData.agentType ?? "voice");
    console.log("[vapi/update-assistant] saved vapi_assistant_id server-side:", assistantId);
  }

  // ── Link Telnyx number to assistant in Vapi ───────────────────────────────
  // Primary source: vapiPhoneNumberId is now persisted inside wizardData.voice.vapiPhoneNumberId.
  // Fallback 1: legacy top-level body field (backward compat for in-flight requests during deploy).
  // Fallback 2: DB voice_settings.vapiPhoneNumberId (recovery path — e.g., Vapi import retry needed).
  let vapiPhoneNumberId: string | null =
    body.wizardData?.voice?.vapiPhoneNumberId ??
    body.vapiPhoneNumberId ??
    (sessionVoice?.vapiPhoneNumberId as string | undefined) ??
    null;

  // Retry: provision-number succeeded (Telnyx number purchased) but Vapi import failed,
  // so vapiPhoneNumberId was never obtained. Attempt the Vapi import now.
  // GUARD: only do this for platform-provisioned numbers (phoneOption === "new").
  // Never attempt to import personal forwarding numbers (phoneOption === "forward").
  const agentType = body.wizardData.agentType ?? "voice";
  if (
    !vapiPhoneNumberId &&
    sessionRow?.twilio_phone_number &&
    body.wizardData?.voice?.phoneOption === "new"
  ) {
    const telnyxApiKey = process.env.TELNYX_API_KEY;
    if (telnyxApiKey) {
      console.log(
        "[vapi/update-assistant] vapiPhoneNumberId missing — retrying Vapi import for",
        sessionRow.twilio_phone_number,
      );
      const importRes = await fetch("https://api.vapi.ai/phone-number", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "telnyx",
          number: sessionRow.twilio_phone_number,
          telnyxApiKey,
          name: `CodeFounder - ${businessName}`,
        }),
      });
      if (importRes.ok) {
        const imported = (await importRes.json()) as { id?: string };
        vapiPhoneNumberId = imported.id ?? null;
        console.log("[vapi/update-assistant] Vapi import retry success — vapiPhoneNumberId:", vapiPhoneNumberId);
        if (vapiPhoneNumberId) {
          await adminSupabase
            .from("agent_wizard_sessions")
            .update({
              voice_settings: { ...(sessionVoice ?? {}), vapiPhoneNumberId },
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("agent_type", agentType);
        }
      } else {
        console.error("[vapi/update-assistant] Vapi import retry failed:", await importRes.text());
      }
    }
  }

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
      console.error("[vapi/update-assistant] phone-number link failed:", await linkRes.text());
    } else {
      console.log("[vapi/update-assistant] linked phone number", vapiPhoneNumberId, "→ assistant", assistantId);
    }
  } else {
    console.warn("[vapi/update-assistant] no vapiPhoneNumberId — assistant created without linked phone");
  }

  return NextResponse.json({ success: true, assistantId });
}
