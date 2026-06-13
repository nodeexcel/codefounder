"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const PHRASES = [
  "Automate Phone Calls",
  "Grows Your Business",
  "Works While You Sleep",
  "Book Appointments",
  "Answer Every Call",
];

const TICKER_ITEMS = [
  "Automate Phone Calls",
  "Grows Your Business",
  "Works While You Sleep",
  "Book Appointments",
  "Answer Every Call",
];

export function Hero() {
  const rotateRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let idx = 0;
    const timer = setInterval(() => {
      const el = rotateRef.current;
      if (!el) return;
      el.classList.add("switching");
      setTimeout(() => {
        idx = (idx + 1) % PHRASES.length;
        el.textContent = PHRASES[idx];
        el.classList.remove("switching");
      }, 400);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero">
      <div className="hero-bg" />
      <div className="hero-grid" />

      <div className="hero-content">
        <div className="hero-badge">
          <span className="pulse-dot" />
          {" "}Now live — <span>AI agents for SMBs across Canada &amp; UK</span>
        </div>
        <h1 className="hero-h1">
          We Build AI That<br />
          <span className="hero-rotate-wrap">
            <span className="hero-rotate-text" ref={rotateRef}>Automate Phone Calls</span>
          </span>
          <br />Around the Clock
        </h1>
        <p className="hero-sub">
          CodeFounder builds AI voice agents, receptionists, and workflow automations that handle calls,
          bookings, and busywork — so your team can focus on growth, not admin.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="btn-primary">Get Started Free →</Link>
          <a href="#contact" className="btn-ghost">Book a Free Call</a>
        </div>
        <div className="hero-stats">
          <div>
            <div className="hero-stat-num"><span>24/7</span></div>
            <div className="hero-stat-label">AI agents on call</div>
          </div>
          <div>
            <div className="hero-stat-num"><span>3x</span></div>
            <div className="hero-stat-label">Faster response time</div>
          </div>
          <div>
            <div className="hero-stat-num"><span>40%+</span></div>
            <div className="hero-stat-label">Operating cost saved</div>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-card">
          <div className="hero-card-hdr">
            <span className="hdr-dot" style={{ background: "#ef4444" }} />
            <span className="hdr-dot" style={{ background: "#f59e0b" }} />
            <span className="hdr-dot" style={{ background: "#22c55e" }} />
            <span className="live-badge"><span className="live-dot" /> Live</span>
          </div>
          <div className="call-wave">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wb" />)}
          </div>
          <div className="call-meta">
            <strong>AI Receptionist — Active Call</strong>
            Booking appointment for Thursday 2:30 PM
          </div>
          <div className="stat-row">
            <div className="mini-stat">
              <div className="mini-stat-num">128</div>
              <div className="mini-stat-label">Calls handled today</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-num">0</div>
              <div className="mini-stat-label">Missed calls</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-num">98%</div>
              <div className="mini-stat-label">Satisfaction</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-num">2.1s</div>
              <div className="mini-stat-label">Avg response</div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-ticker">
        <div className="hero-ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="hero-ticker-item">
              <span className="dot" />{item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
