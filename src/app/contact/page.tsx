"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await fetch("https://formspree.io/f/placeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("sent");
      setForm({ name: "", email: "", company: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    background: "var(--card-elevated)",
    border: "1px solid var(--border2)",
    borderRadius: 10,
    color: "var(--foreground)",
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--muted)",
    marginBottom: 6,
    fontFamily: "'Outfit', sans-serif",
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", color: "var(--foreground)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
          ← Back to CodeFounder
        </Link>

        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>

          {/* Left: info */}
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 38, fontWeight: 800, color: "var(--foreground)", margin: "0 0 12px" }}>
              Get in touch
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--muted)", marginBottom: 36 }}>
              Have a question, want to explore a custom AI solution, or just want to say hello?
              We&apos;d love to hear from you.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <InfoRow
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                }
                label="Email"
                value="info@codefounder.ai"
                href="mailto:info@codefounder.ai"
              />
              <InfoRow
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                }
                label="Headquarters"
                value="Kitchener, Ontario, Canada"
              />
            </div>

            <div style={{ marginTop: 36 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-low)", fontFamily: "'Outfit', sans-serif", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Follow us
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <SocialLink href="https://www.linkedin.com/company/codefounder-ai/posts/?feedView=all" label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>
                </SocialLink>
                <SocialLink href="https://www.facebook.com/profile.php?id=61590600142105" label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.78 8.44-4.94 8.44-9.94z"/></svg>
                </SocialLink>
                <SocialLink href="https://www.instagram.com/codefounder.ai" label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/></svg>
                </SocialLink>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "32px 28px",
            }}
          >
            {status === "sent" ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
                  Message sent!
                </h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                  We&apos;ll get back to you at <strong>{form.email || "your email"}</strong> within 1 business day.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  style={{ marginTop: 20, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={labelStyle}>Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input
                    required
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,122,26,0.6)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input
                    required
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,122,26,0.6)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input
                    type="text"
                    placeholder="Your company name (optional)"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,122,26,0.6)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Message <span style={{ color: "var(--accent)" }}>*</span></label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us how we can help..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,122,26,0.6)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
                  />
                </div>

                {status === "error" && (
                  <p style={{ color: "#ef4444", fontSize: 13 }}>Something went wrong. Please email us directly at info@codefounder.ai.</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  style={{
                    padding: "12px 24px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: status === "sending" ? "not-allowed" : "pointer",
                    opacity: status === "sending" ? 0.7 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {status === "sending" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted-low)", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Terms of Service</Link>
          <Link href="/refund" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Refund Policy</Link>
          <Link href="/" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Home</Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-glow)", border: "1px solid rgba(255,122,26,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-low)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>{label}</p>
        {href ? (
          <a href={href} style={{ fontSize: 14, color: "var(--foreground)", textDecoration: "none", fontWeight: 500 }}>{value}</a>
        ) : (
          <p style={{ fontSize: 14, color: "var(--foreground)", fontWeight: 500, margin: 0 }}>{value}</p>
        )}
      </div>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{ width: 38, height: 38, borderRadius: 10, background: "var(--card-elevated)", border: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", textDecoration: "none", transition: "color 0.2s, border-color 0.2s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,122,26,0.4)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
    >
      {children}
    </a>
  );
}
