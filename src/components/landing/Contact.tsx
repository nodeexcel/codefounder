"use client";

import { useState } from "react";

const SERVICES = [
  "AI Voice Agent",
  "AI Receptionist",
  "AI Answering Service",
  "WhatsApp Integration",
  "Not sure yet",
];

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <section id="contact">
      <div className="contact-wrap">
        <div className="contact-grid">
          <div className="contact-info reveal">
            <span className="section-label">Get In Touch</span>
            <h2>Let&apos;s build your AI team</h2>
            <p>
              Tell us a bit about your business and we&apos;ll get back to you within one business day
              with a free, no-obligation strategy session.
            </p>
            <div className="cd">
              <span className="cd-ico">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="currentColor" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <a href="tel:+14164181481">+1-416-418-1481</a>
            </div>
            <div className="cd">
              <span className="cd-ico">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="currentColor" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline stroke="currentColor" points="22,6 12,13 2,6" />
                </svg>
              </span>
              <a href="mailto:info@codefounder.ai">info@codefounder.ai</a>
            </div>
            <div className="cd">
              <span className="cd-ico">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="currentColor" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle stroke="currentColor" cx={12} cy={10} r={3} />
                </svg>
              </span>
              Serving Canada &amp; the United Kingdom
            </div>
          </div>

          <div className="reveal d2">
            <div className="contact-form-card">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="fg">
                    <label>Full Name</label>
                    <input type="text" placeholder="Jane Doe" required />
                  </div>
                  <div className="fg">
                    <label>Business Email</label>
                    <input type="email" placeholder="jane@business.com" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="fg">
                    <label>Company</label>
                    <input type="text" placeholder="Your Company" />
                  </div>
                  <div className="fg">
                    <label>Phone</label>
                    <input type="tel" placeholder="+1 (000) 000-0000" />
                  </div>
                </div>
                <div className="fg">
                  <label>Service of Interest</label>
                  <select>
                    {SERVICES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label>Tell us about your business</label>
                  <textarea placeholder="What challenges are you looking to solve with AI?" />
                </div>
                <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Book My Free Strategy Call →
                </button>
                {submitted && (
                  <div className="success-msg show">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Thanks! We&apos;ll be in touch within one business day.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
