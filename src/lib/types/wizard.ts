import type { AgentType } from "@/lib/agents";

export const WIZARD_STEPS = [
  "Choose Agent",
  "Business Details",
  "Voice Agent Settings",
  "Review & Go Live",
] as const;

export const BUSINESS_CATEGORIES = [
  "Restaurant",
  "Salon",
  "Clinic",
  "Real Estate",
  "Retail",
  "Other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const VOICE_TONES = ["Friendly", "Professional", "Upbeat"] as const;
export type VoiceTone = (typeof VOICE_TONES)[number];

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export type WeekSchedule = Record<DayKey, DaySchedule>;

export interface BusinessDetails {
  businessName: string;
  category: BusinessCategory | "";
  hours: WeekSchedule;
  services: string;
  location: string;
  phone: string;
}

export interface VoiceSettings {
  agentName: string;
  tone: VoiceTone;
  forwardTo: string;
}

export interface WizardFormData {
  agentType: AgentType | null;
  business: BusinessDetails;
  voice: VoiceSettings;
}

export const AVAILABLE_AGENT_TYPES: AgentType[] = ["voice"];

export function createDefaultWeekSchedule(): WeekSchedule {
  return {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "10:00", close: "14:00", closed: false },
    sunday: { open: "09:00", close: "17:00", closed: true },
  };
}

export function createInitialWizardData(
  agentType: AgentType | null = null
): WizardFormData {
  return {
    agentType,
    business: {
      businessName: "",
      category: "",
      hours: createDefaultWeekSchedule(),
      services: "",
      location: "",
      phone: "",
    },
    voice: {
      agentName: "",
      tone: "Friendly",
      forwardTo: "",
    },
  };
}

export function formatWeekSchedule(hours: WeekSchedule): string {
  return DAYS.map((day) => {
    const schedule = hours[day];
    if (schedule.closed) return `${DAY_LABELS[day]}: Closed`;
    return `${DAY_LABELS[day]}: ${schedule.open} – ${schedule.close}`;
  }).join("\n");
}
