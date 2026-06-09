import { formatWeekSchedule, type WizardFormData } from "@/lib/types/wizard";

export function buildVapiSystemPrompt(data: WizardFormData): string {
  const { business, voice } = data;
  const agentName = voice.agentName.trim() || "your AI assistant";
  const businessName = business.businessName.trim() || "the business";
  const category = business.category.trim() || "business";
  const location = business.location.trim() || "Not specified";
  const services = business.services.trim() || "Not specified";
  const hours = formatWeekSchedule(business.hours);
  const tone = voice.tone.trim() || "Friendly";

  return `You are ${agentName}, AI receptionist for ${businessName} (${category}) in ${location}.

SERVICES: ${services}
HOURS: ${hours}
TONE: ${tone}

RULES — follow every time:
- Max 1-2 short sentences per reply. This is a phone call, not a chat.
- Never explain, never list. Just answer and move forward.
- Always get caller's name first, then their need.
- To book: ask preferred date/time → confirm → get callback number → use Appointment_booking tool.
- If you don't know something: "Let me have the team follow up with you."
- If caller insists on speaking with a human, use the transferCall function immediately.
- End every call: confirm next steps, thank caller by name.`;
}
