import type { AgentType } from "@/lib/agents";

export const WIZARD_STEPS = [
  "Choose Agent",
  "Business Profile",
  "Configure Agent",
  "Connect Calendar",
  "Phone Number",
  "Test & Launch",
] as const;

export const BUSINESS_CATEGORIES = [
  "Restaurant",
  "Cafe",
  "Bar",
  "Food Delivery",
  "Medical Clinic",
  "Dental Clinic",
  "Pharmacy",
  "Hospital",
  "Veterinary",
  "Hair Salon",
  "Spa",
  "Beauty Salon",
  "Nail Salon",
  "Barbershop",
  "Real Estate",
  "Property Management",
  "Retail Store",
  "E-commerce",
  "Clothing Store",
  "Gym",
  "Fitness Studio",
  "Yoga Studio",
  "Law Firm",
  "Accounting",
  "Financial Services",
  "Hotel",
  "Motel",
  "Bed & Breakfast",
  "Auto Repair",
  "Car Dealership",
  "Plumbing",
  "Electrician",
  "HVAC",
  "Cleaning Service",
  "School",
  "Tutoring",
  "Daycare",
  "Photography",
  "Events",
  "Wedding Planning",
  "Insurance",
  "Mortgage",
  "Banking",
  "Consulting",
  "Marketing Agency",
  "IT Services",
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

export const TIMEZONES = [
  { value: "America/Toronto",     label: "Toronto — EST/EDT (UTC-5/-4)" },
  { value: "America/New_York",    label: "Eastern — EST/EDT (UTC-5/-4)" },
  { value: "America/Chicago",     label: "Central — CST/CDT (UTC-6/-5)" },
  { value: "America/Denver",      label: "Mountain — MST/MDT (UTC-7/-6)" },
  { value: "America/Los_Angeles", label: "Pacific — PST/PDT (UTC-8/-7)" },
  { value: "America/Vancouver",   label: "Vancouver — PST/PDT (UTC-8/-7)" },
  { value: "America/Phoenix",     label: "Phoenix — MST (UTC-7)" },
  { value: "America/Halifax",     label: "Halifax — AST/ADT (UTC-4/-3)" },
  { value: "America/St_Johns",    label: "St. John's — NST/NDT (UTC-3:30/-2:30)" },
  { value: "America/Winnipeg",    label: "Winnipeg — CST/CDT (UTC-6/-5)" },
  { value: "America/Edmonton",    label: "Edmonton — MST/MDT (UTC-7/-6)" },
  { value: "America/Regina",      label: "Regina — CST (UTC-6)" },
  { value: "Europe/London",       label: "London — GMT/BST (UTC+0/+1)" },
  { value: "Europe/Paris",        label: "Paris — CET/CEST (UTC+1/+2)" },
  { value: "Europe/Berlin",       label: "Berlin — CET/CEST (UTC+1/+2)" },
  { value: "Asia/Dubai",          label: "Dubai — GST (UTC+4)" },
  { value: "Asia/Kolkata",        label: "India — IST (UTC+5:30)" },
  { value: "Asia/Singapore",      label: "Singapore — SGT (UTC+8)" },
  { value: "Asia/Tokyo",          label: "Tokyo — JST (UTC+9)" },
  { value: "Australia/Sydney",    label: "Sydney — AEST/AEDT (UTC+10/+11)" },
  { value: "Australia/Melbourne", label: "Melbourne — AEST/AEDT (UTC+10/+11)" },
  { value: "Pacific/Auckland",    label: "Auckland — NZST/NZDT (UTC+12/+13)" },
] as const;

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
  timezone: string;
}

export interface VoiceSettings {
  agentName: string;
  tone: VoiceTone;
  forwardTo: string;
  calendarConnected: boolean;
  calendarEmail: string;
  phoneOption: "new" | "forward" | "";
  phoneNumber: string;
}

export interface WizardFormData {
  agentType: AgentType | null;
  business: BusinessDetails;
  voice: VoiceSettings;
}

export const AVAILABLE_AGENT_TYPES: AgentType[] = ["voice"];

export function createDefaultWeekSchedule(): WeekSchedule {
  return {
    monday:    { open: "09:00", close: "17:00", closed: false },
    tuesday:   { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday:  { open: "09:00", close: "17:00", closed: false },
    friday:    { open: "09:00", close: "17:00", closed: false },
    saturday:  { open: "10:00", close: "14:00", closed: false },
    sunday:    { open: "09:00", close: "17:00", closed: true  },
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
      timezone: "America/Toronto",
    },
    voice: {
      agentName: "",
      tone: "Friendly",
      forwardTo: "",
      calendarConnected: false,
      calendarEmail: "",
      phoneOption: "",
      phoneNumber: "",
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
