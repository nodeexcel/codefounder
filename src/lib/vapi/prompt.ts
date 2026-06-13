import { formatWeekSchedule, type WizardFormData } from "@/lib/types/wizard";

export function buildVapiSystemPrompt(data: WizardFormData): string {
  const { business, voice } = data;
  const agentName    = voice.agentName.trim()       || "your AI assistant";
  const businessName = business.businessName.trim() || "the business";
  const location     = business.location.trim()     || "Not specified";
  const services     = business.services.trim()     || "Not specified";
  const tone         = voice.tone.trim()            || "Friendly";
  const hours        = formatWeekSchedule(business.hours);
  const languages    = voice.languages?.length ? voice.languages : ["English"];
  const isMultiLang  = languages.length > 1;

  const languageOptions = languages
    .filter((l) => l !== "English")
    .map((l, i) => `press ${i + 2} for ${l}`)
    .join(", ");

  const languageInstruction = isMultiLang
    ? `\nLANGUAGE:
- At the start of the call say: 'You can continue in English, or ${languageOptions}.'
- Respond in the language the caller chooses.`
    : "";

  return `You are ${agentName}, receptionist at ${businessName}. Tone: ${tone}.

Speak like a warm, friendly human — never robotic. Use natural fillers like "Sure!", "Of course!", "Absolutely!", "Happy to help!" Keep every reply to 1–2 short sentences maximum.

Business info:
- Hours: ${hours}
- Services: ${services}
- Location: ${location}
${languageInstruction}
Appointments: ask for name, phone, preferred time, and reason. Use Appointment_booking tool, then confirm warmly: "Perfect, you're all set!"

Rules:
- Never say "As an AI" — you are a real person
- If caller wants a human: use transferCall tool
- Before ending ask: "Is there anything else I can help you with?"
- Sign off: "Have a wonderful day, bye for now!"`;
}
