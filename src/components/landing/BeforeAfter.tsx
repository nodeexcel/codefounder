const BEFORE_ITEMS = [
  "Missed calls and after-hours inquiries go unanswered",
  "Staff buried in repetitive scheduling & admin work",
  "Slow follow-ups lose leads to faster competitors",
  "Inconsistent customer experience across channels",
  "High overhead from hiring & training front-desk staff",
];

const AFTER_ITEMS = [
  "Every call answered instantly, 24/7 — no exceptions",
  "Bookings, reminders & follow-ups run automatically",
  "Leads contacted within seconds, not hours",
  "Consistent, on-brand experience across phone, chat & WhatsApp",
  "Lower overhead — your AI team scales with zero hiring",
];

const XIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
  </svg>
);

const CheckIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function BeforeAfter() {
  return (
    <section id="ba">
      <div className="ba-hdr reveal">
        <span className="section-label">The Difference</span>
        <h2 className="section-title">Before AI vs. After CodeFounder</h2>
        <p className="section-sub" style={{ margin: "0 auto" }}>
          See exactly what changes once your business runs on AI-powered systems.
        </p>
      </div>
      <div className="ba-grid">
        <div className="ba-card before reveal">
          <div className="ba-head">
            <span className="ba-ico">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={12} cy={12} r={10} /><line x1={15} y1={9} x2={9} y2={15} /><line x1={9} y1={9} x2={15} y2={15} />
              </svg>
            </span>
            <h3>Before</h3>
          </div>
          <div className="ba-items">
            {BEFORE_ITEMS.map((item) => (
              <div key={item} className="ba-item">
                <span className="ba-item-ico"><XIcon /></span> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="ba-card after reveal d2">
          <div className="ba-head">
            <span className="ba-ico">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <h3>After CodeFounder</h3>
          </div>
          <div className="ba-items">
            {AFTER_ITEMS.map((item) => (
              <div key={item} className="ba-item">
                <span className="ba-item-ico"><CheckIcon /></span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
