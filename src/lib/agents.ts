export type AgentType = "voice" | "hr" | "marketing" | "crm";

export interface AgentDefinition {
  id: AgentType;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  features: string[];
}

export const AGENTS: AgentDefinition[] = [
  {
    id: "voice",
    name: "Voice Agent",
    shortName: "Voice",
    description:
      "Answer inbound calls 24/7, handle FAQs, qualify leads, and book appointments into Google Calendar.",
    icon: "📞",
    features: ["Inbound calls", "FAQ handling", "Calendar booking", "Call transcripts"],
  },
  {
    id: "hr",
    name: "HR Agent",
    shortName: "HR",
    description:
      "Always-available HR assistant for policy Q&A, leave requests, onboarding, and interview scheduling.",
    icon: "👥",
    features: ["Policy Q&A", "Leave requests", "Onboarding", "Interview scheduling"],
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    shortName: "Marketing",
    description:
      "Plan, draft, schedule, and respond to social content across your connected platforms.",
    icon: "📱",
    features: ["Content calendar", "Post scheduling", "Comment replies", "Approval workflow"],
  },
  {
    id: "crm",
    name: "CRM Agent",
    shortName: "CRM",
    description:
      "Capture every lead, organize your pipeline, and automate follow-ups so nothing slips through.",
    icon: "🎯",
    features: ["Lead capture", "Pipeline stages", "Email/SMS follow-ups", "Task reminders"],
  },
];

export function getAgentById(id: AgentType) {
  return AGENTS.find((a) => a.id === id);
}
