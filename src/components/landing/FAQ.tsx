"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How quickly can an AI agent be live for my business?",
    a: "Most AI voice agents and receptionists go live within 2-4 weeks of our discovery call, depending on the complexity of your workflows and integrations.",
  },
  {
    q: "Will the AI sound robotic or unnatural?",
    a: "No. We use advanced voice models tuned for natural pacing, tone, and conversational flow — most callers can't tell they're speaking with an AI.",
  },
  {
    q: "Can the AI integrate with our existing tools (CRM, calendar, etc.)?",
    a: "Yes. We integrate with most popular CRMs, calendars, helpdesks, and messaging platforms including HubSpot, Calendly, Google Calendar, WhatsApp, and more.",
  },
  {
    q: "What does pricing look like?",
    a: "Plans start at $149/mo (Starter), $299/mo (Pro), and $599/mo (Elite). All include a 14-day free trial with no credit card required to start.",
  },
  {
    q: "Do you offer ongoing support after launch?",
    a: "Absolutely. Every plan includes ongoing monitoring, optimization, and support so your AI agents keep improving as your business grows.",
  },
];

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line stroke="currentColor" x1={12} y1={5} x2={12} y2={19} />
    <line stroke="currentColor" x1={5} y1={12} x2={19} y2={12} />
  </svg>
);

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIdx((prev) => (prev === i ? null : i));
  }

  return (
    <section id="faq">
      <div className="faq-hdr reveal">
        <span className="section-label">FAQ</span>
        <h2 className="section-title">Frequently asked questions</h2>
        <p className="section-sub" style={{ margin: "0 auto" }}>
          Everything you need to know before getting started.
        </p>
      </div>
      <div className="faq-list">
        {FAQS.map((faq, i) => (
          <div key={faq.q} className={`faq-item reveal${i > 0 ? ` d${i}` : ""}${openIdx === i ? " open" : ""}`}>
            <div className="faq-q" onClick={() => toggle(i)}>
              {faq.q}
              <span className="faq-ico"><PlusIcon /></span>
            </div>
            <div className="faq-a">
              <div className="faq-a-in">{faq.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
