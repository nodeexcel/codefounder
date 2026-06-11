import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardFormData } from "@/lib/types/wizard";
import {
  createDefaultWeekSchedule,
  createInitialWizardData,
  createInitialHRSettings,
  type BusinessDetails,
  type VoiceSettings,
  type HRSettings,
} from "@/lib/types/wizard";
import type { AgentType } from "@/lib/agents";

interface WizardSessionRow {
  id: string;
  current_step: number;
  status: string;
  business_details: Partial<BusinessDetails> | null;
  voice_settings: Partial<VoiceSettings> | Partial<HRSettings> | null;
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
  const maxStep = agentType === "hr" ? 4 : 5;

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
  const { error } = await supabase.from("agent_wizard_sessions").upsert(
    {
      user_id: userId,
      agent_type: formData.agentType,
      current_step: currentStep,
      status,
      business_details: formData.business,
      voice_settings: isHR ? formData.hr : formData.voice,
      twilio_phone_number: isHR ? null : (formData.voice.phoneNumber || null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,agent_type" }
  );

  return { error: error?.message ?? null };
}
