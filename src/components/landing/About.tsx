import Image from "next/image";

const BULLETS = [
  "Custom-built AI voice agents trained on your business, tone, and processes",
  "End-to-end workflow automation across booking, CRM, and support tools",
  "Transparent pricing, fast deployment, and hands-on support post-launch",
  "Continuous optimization based on real call & conversation data",
];

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <polyline stroke="#22c55e" points="20 6 9 17 4 12" />
  </svg>
);

export function About() {
  return (
    <section id="about">
      <div className="about-grid">
        <div className="reveal">
          <span className="section-label">About CodeFounder</span>
          <h2 className="section-title">Built by founders, for founders</h2>
          <p className="section-sub">
            We&apos;re an AI automation agency helping small and medium businesses across Canada and the UK
            replace manual processes with intelligent systems — voice agents, chat automation, and
            back-office workflows that run themselves.
          </p>
          <div className="about-flags">
            <span className="flag-chip">🇨🇦 Canada</span>
            <span className="flag-chip">🇬🇧 United Kingdom</span>
            <span className="flag-chip">Remote-first team</span>
            <span className="flag-chip">SMB focused</span>
          </div>
        </div>

        <div className="reveal d2" style={{ position: "relative" }}>
          <div className="about-card">
            <div className="about-meta">
              <span className="about-meta-icon">
                <Image src="/Brandmark.png" alt="CodeFounder" width={36} height={36} />
              </span>
              <div>
                <h4>CodeFounder.ai</h4>
                <span>AI Automation Agency</span>
              </div>
            </div>
            <div className="about-bullets">
              {BULLETS.map((text) => (
                <div key={text} className="ab-item">
                  <span className="ab-check"><CheckIcon /></span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <div className="about-float">
              <div className="af-num">5★</div>
              <div className="af-txt"><strong>Client Rated</strong>Average satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
