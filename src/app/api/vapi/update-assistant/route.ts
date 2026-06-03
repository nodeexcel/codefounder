import { NextResponse } from "next/server";
import { buildVapiSystemPrompt } from "@/lib/vapi/prompt";
import type { WizardFormData } from "@/lib/types/wizard";

interface VapiMessage {
  role: string;
  content: string;
}

interface VapiModel {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: VapiMessage[];
  toolIds?: string[];
  [key: string]: unknown;
}

interface VapiAssistant {
  model?: VapiModel;
  [key: string]: unknown;
}

function replaceSystemMessage(
  messages: VapiMessage[] | undefined,
  systemPrompt: string
): VapiMessage[] {
  const rest = (messages ?? []).filter((m) => m.role !== "system");
  return [{ role: "system", content: systemPrompt }, ...rest];
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return NextResponse.json(
      {
        error:
          "Vapi is not configured. Add VAPI_API_KEY and VAPI_ASSISTANT_ID to .env.local",
      },
      { status: 500 }
    );
  }

  let body: { wizardData?: WizardFormData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.wizardData?.business?.businessName || !body.wizardData?.voice?.agentName) {
    return NextResponse.json(
      { error: "Wizard data is incomplete" },
      { status: 400 }
    );
  }

  const systemPrompt = buildVapiSystemPrompt(body.wizardData);

  let existingModel: VapiModel = {
    provider: "openai",
    model: "gpt-4o",
    messages: [],
  };

  try {
    const getResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (getResponse.ok) {
      const assistant = (await getResponse.json()) as VapiAssistant;
      if (assistant.model) {
        existingModel = assistant.model;
      }
    }
  } catch {
    // Continue with defaults if GET fails
  }

  const patchResponse = await fetch(
    `https://api.vapi.ai/assistant/${assistantId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: {
          ...existingModel,
          messages: replaceSystemMessage(existingModel.messages, systemPrompt),
        },
      }),
    }
  );

  if (!patchResponse.ok) {
    const errorText = await patchResponse.text();
    return NextResponse.json(
      { error: `Vapi update failed: ${errorText}` },
      { status: patchResponse.status }
    );
  }

  const updated = await patchResponse.json();
  return NextResponse.json({ success: true, assistant: updated });
}
