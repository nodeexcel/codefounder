const STEPS = [
  {
    colorClass: "step-icon-wrap-1",
    badgeClass: "snb-1",
    num: "1",
    title: "Discover & Connect",
    description: "We map your workflows, calls, and customer touchpoints to find where AI delivers the biggest impact — then connect your tools and data sources.",
    tags: ["Free Audit", "Tool Mapping"],
    icon: (
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path stroke="currentColor" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    colorClass: "step-icon-wrap-2",
    badgeClass: "snb-2",
    num: "2",
    title: "Design & Build",
    description: "Our team designs your AI agent's voice, scripts, and logic — then builds and trains it on your business so every interaction sounds like you.",
    tags: ["Custom Scripts", "Brand Voice"],
    icon: (
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M12 19l7-7 3 3-7 7-3-3z" />
        <path stroke="currentColor" d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path stroke="currentColor" d="M2 2l7.586 7.586" />
        <circle stroke="currentColor" cx={11} cy={11} r={2} />
      </svg>
    ),
  },
  {
    colorClass: "step-icon-wrap-3",
    badgeClass: "snb-3",
    num: "3",
    title: "Launch & Optimize",
    description: "We go live, monitor performance in real time, and continuously fine-tune based on real conversations — so results keep improving month over month.",
    tags: ["Live Monitoring", "Ongoing Tuning"],
    icon: (
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path stroke="currentColor" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path stroke="currentColor" d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path stroke="currentColor" d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path stroke="currentColor" d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  },
];

export function Process() {
  return (
    <section id="process">
      <div className="process-bg" />
      <div className="process-header reveal">
        <span className="section-label">How It Works</span>
        <h2 className="section-title">From discovery call to live AI in days</h2>
        <p className="section-sub" style={{ margin: "0 auto" }}>
          A simple, transparent process built to get your AI agent live fast — with zero technical lift on your end.
        </p>
      </div>
      <div className="steps-grid">
        {STEPS.map((step, i) => (
          <div key={step.num} className={`step-card reveal${i > 0 ? ` d${i + 1}` : ""}`}>
            <div className={`step-icon-wrap ${step.colorClass}`}>
              {step.icon}
              <span className={`step-num-badge ${step.badgeClass}`}>{step.num}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <div className="step-tags">
              {step.tags.map((tag) => (
                <span key={tag} className="step-tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
