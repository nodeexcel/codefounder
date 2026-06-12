import { formatWeekSchedule, type WizardFormData } from "@/lib/types/wizard";

export function buildVapiSystemPrompt(data: WizardFormData): string {
  const { business, voice } = data;
  const agentName    = voice.agentName.trim()       || "your AI assistant";
  const businessName = business.businessName.trim() || "the business";
  const location     = business.location.trim()     || "Not specified";
  const services     = business.services.trim()     || "Not specified";
  const tone         = voice.tone.trim()            || "Friendly";
  const hours        = formatWeekSchedule(business.hours);

  return `You are ${agentName}, AI receptionist for ${businessName}.
Hours: ${hours}
Services: ${services}
Location: ${location}
Tone: ${tone}

RULES:
- Speak naturally, max 2 short sentences per turn
- Greet caller warmly, ask how to help
- Answer questions from business info above
- To book appointment: ask name, phone, preferred date/time, reason
- Use Appointment_booking tool to save to calendar
- Confirm booking clearly
- If caller wants human: use transferCall tool
- End call professionally when done
- Say: 'Is there anything else I can help you with?' before ending`;
}
