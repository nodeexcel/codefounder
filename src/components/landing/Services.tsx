interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}

const SERVICES: Service[] = [
  {
    icon: (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    title: "AI Voice Agent",
    description: "A natural-sounding AI voice agent that answers calls, qualifies leads, books appointments, and routes urgent issues — available around the clock.",
    features: ["Human-like conversation & tone", "Calendar & CRM integration", "Multi-language support"],
  },
  {
    icon: (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    title: "AI Receptionist",
    description: "A virtual front desk that greets every visitor and caller, manages bookings, answers FAQs, and keeps your schedule organized — without the overhead.",
    features: ["Instant appointment scheduling", "Custom brand voice & scripts", "Real-time notifications to staff"],
  },
  {
    icon: (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M3 11l19-9-9 19-2-8-8-2z" />
      </svg>
    ),
    title: "AI Answering Service",
    description: "Never miss another customer call. Our AI answering service captures every inquiry, takes messages, and follows up automatically — even after hours.",
    features: ["24/7 call coverage", "Smart call routing & escalation", "Automated follow-up messages"],
  },
  {
    icon: (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <path stroke="currentColor" d="M8 9h8M8 13h5" />
      </svg>
    ),
    title: "WhatsApp Integration",
    description: "Bring AI automation straight into WhatsApp — handle customer questions, send reminders, confirm bookings, and close sales in the app your customers already use.",
    features: ["Automated order & booking flows", "Broadcast reminders & updates", "Seamless handoff to your team"],
  },
];

export function Services() {
  return (
    <section id="services">
      <div className="svc-header reveal">
        <div>
          <span className="section-label">What We Build</span>
          <h2 className="section-title">AI systems that work while you don&apos;t</h2>
        </div>
        <p className="section-sub">
          From the first ring to the final invoice — our AI agents handle the repetitive work so your team
          can focus on what actually grows the business.
        </p>
      </div>
      <div className="svc-grid">
        {SERVICES.map((svc, i) => (
          <div key={svc.title} className={`svc-card reveal${i > 0 ? ` d${i}` : ""}`}>
            <div className="svc-icon">{svc.icon}</div>
            <h3>{svc.title}</h3>
            <p>{svc.description}</p>
            <div className="svc-feats">
              {svc.features.map((f) => (
                <div key={f} className="svc-feat">
                  <span className="feat-dot" /> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
