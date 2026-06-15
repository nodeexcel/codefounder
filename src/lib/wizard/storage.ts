import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardFormData } from "@/lib/types/wizard";
import {
  createDefaultWeekSchedule,
  createInitialWizardData,
  createInitialHRSettings,
  createInitialMarketingSettings,
  type BusinessDetails,
  type VoiceSettings,
  type HRSettings,
  type MarketingSettings,
} from "@/lib/types/wizard";
import type { AgentType } from "@/lib/agents";

interface WizardSessionRow {
  id: string;
  current_step: number;
  status: string;
  business_details: Partial<BusinessDetails> | null;
  voice_settings: Partial<VoiceSettings> | Partial<HRSettings> | Partial<MarketingSettings> | null;
}

export async function loadWizardProgress(
  supabase: SupabaseClient,
  userId: string,
  agentType: AgentType = "voice"
): Promise<{ data: WizardFormData; step: number; status: string } | null> {
  const { data, error } = await supabase
    .from("agent_wizard_sessions")
    .select("id, current_step, status, business_details, voice_settings")
    .eq("user_id", userId)
    .eq("agent_type", agentType)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as WizardSessionRow;
  const initial = createInitialWizardData(agentType);

  const business = row.business_details ?? {};
  const maxStep = agentType === "hr" || agentType === "marketing" ? 4 : 5;

  if (agentType === "marketing") {
    const mktRaw = (row.voice_settings ?? {}) as Partial<MarketingSettings>;
    return {
      step: Math.min(Math.max(row.current_step, 0), maxStep),
      status: row.status,
      data: {
        agentType: "marketing",
        business: {
          ...initial.business,
          ...business,
          hours: { ...createDefaultWeekSchedule(), ...(business.hours ?? {}) },
        },
        voice: initial.voice,
        hr: initial.hr,
        marketing: {
          ...createInitialMarketingSettings(),
          ...mktRaw,
          platforms: Array.isArray(mktRaw.platforms) ? mktRaw.platforms : [],
          topics: Array.isArray(mktRaw.topics) ? mktRaw.topics : [],
        },
      },
    };
  }

  if (agentType === "hr") {
    const hrRaw = (row.voice_settings ?? {}) as Partial<HRSettings>;
    return {
      step: Math.min(Math.max(row.current_step, 0), maxStep),
      status: row.status,
      data: {
        agentType: "hr",
        business: {
          ...initial.business,
          ...business,
          hours: { ...createDefaultWeekSchedule(), ...(business.hours ?? {}) },
        },
        voice: initial.voice,
        hr: {
          ...createInitialHRSettings(),
          ...hrRaw,
          leaveTypes: Array.isArray(hrRaw.leaveTypes)
            ? hrRaw.leaveTypes
            : createInitialHRSettings().leaveTypes,
        },
        marketing: initial.marketing,
      },
    };
  }

  const voice = (row.voice_settings ?? {}) as Partial<VoiceSettings>;
  return {
    step: Math.min(Math.max(row.current_step, 0), maxStep),
    status: row.status,
    data: {
      agentType,
      business: {
        ...initial.business,
        ...business,
        hours: {
          ...createDefaultWeekSchedule(),
          ...(business.hours ?? {}),
        },
      },
      voice: {
        ...initial.voice,
        ...voice,
      },
      hr: initial.hr,
      marketing: initial.marketing,
    },
  };
}

export async function saveWizardProgress(
  supabase: SupabaseClient,
  userId: string,
  formData: WizardFormData,
  currentStep: number,
  status: "draft" | "live" = "draft"
): Promise<{ error: string | null }> {
  if (!formData.agentType) {
    return { error: "Agent type is required" };
  }

  const isHR = formData.agentType === "hr";
  const isMarketing = formData.agentType === "marketing";
  // Only persist twilio_phone_number when a real Telnyx number has been provisioned
  // (phoneOption === "new"). When the user is in "forward" mode their personal carrier
  // number must never reach this column — it would be returned by Stage 1 of
  // provision-number as if it were a provisioned Telnyx number.
  let telnyxNumber: string | null | undefined;
  if (isHR || isMarketing) {
    telnyxNumber = null;
  } else if (formData.voice.phoneOption === "new" && formData.voice.phoneNumber) {
    telnyxNumber = formData.voice.phoneNumber;
  }
  // undefined → omit the key entirely so the column is not touched on upsert

  // Strip unverified phone numbers before persisting voice settings.
  // Both forwardTo and existingPhoneNumber require OTP confirmation before
  // they are saved — if their respective verified field doesn't match, omit them.
  let voiceSettings: VoiceSettings | Partial<HRSettings> | Partial<MarketingSettings>;
  if (!isHR && !isMarketing) {
    let v = formData.voice;

    if (v.forwardTo && v.forwardToVerified !== v.forwardTo) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { forwardTo: _ft, forwardToVerified: _fv, ...rest } = v;
      v = rest as VoiceSettings;
    }

    if (v.existingPhoneNumber && v.existingPhoneNumberVerified !== v.existingPhoneNumber) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { existingPhoneNumber: _ep, existingPhoneNumberVerified: _epv, ...rest } = v;
      v = rest as VoiceSettings;
    }

    voiceSettings = v;
  } else {
    voiceSettings = isHR ? formData.hr : formData.marketing;
  }

  const sessionPayload: Record<string, unknown> = {
    user_id: userId,
    agent_type: formData.agentType,
    current_step: currentStep,
    status,
    business_details: formData.business,
    voice_settings: voiceSettings,
    updated_at: new Date().toISOString(),
  };
  if (telnyxNumber !== undefined) {
    sessionPayload.twilio_phone_number = telnyxNumber;
  }

  const { error } = await supabase.from("agent_wizard_sessions").upsert(
    sessionPayload,
    { onConflict: "user_id,agent_type" }
  );

  return { error: error?.message ?? null };
}
