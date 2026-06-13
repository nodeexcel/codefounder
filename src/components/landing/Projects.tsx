const PROJECTS = [
  {
    type: "Healthcare",
    title: "AI Receptionist for a Multi-Location Dental Clinic",
    description: "Deployed an AI receptionist across three clinic locations to handle appointment booking, rescheduling, and patient FAQs around the clock.",
    badges: ["Voice Agent", "Calendar Sync", "Multi-location"],
    result: "Zero missed calls, 35% increase in booked appointments",
  },
  {
    type: "Home Services",
    title: "24/7 Answering Service for an HVAC Company",
    description: "Built an AI answering service that captures emergency service requests after hours, dispatches alerts to on-call technicians, and books next-day visits.",
    badges: ["Answering Service", "SMS Alerts", "CRM Integration"],
    result: "100% after-hours call capture, faster emergency response",
  },
  {
    type: "Retail / E-commerce",
    title: "WhatsApp Ordering Automation for a Specialty Retailer",
    description: "Automated order taking, payment reminders, and delivery updates over WhatsApp — fully integrated with the client's existing inventory system.",
    badges: ["WhatsApp", "Order Automation", "Inventory Sync"],
    result: "50% reduction in manual order processing time",
  },
];

export function Projects() {
  return (
    <section id="projects">
      <div className="proj-hdr">
        <div>
          <span className="section-label">Case Studies</span>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Real results for real businesses</h2>
        </div>
        <a href="#contact" className="btn-ghost">Start Your Project →</a>
      </div>
      <div className="proj-grid">
        {PROJECTS.map((p, i) => (
          <div key={p.title} className={`proj-card reveal${i > 0 ? ` d${i + 1}` : ""}`}>
            <span className="proj-type">{p.type}</span>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <div className="proj-badges">
              {p.badges.map((b) => <span key={b} className="proj-badge">{b}</span>)}
            </div>
            <div className="proj-result">Result: {p.result}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
