"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { AuthField } from "@/components/auth/AuthField";
import { validateEmail } from "@/components/auth/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = validateEmail(email);
  const isValid = !emailError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!isValid) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );
      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes authBrandLift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes authBrandGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(255,122,26,0.22)) drop-shadow(0 0 24px rgba(255,122,26,0.12)); }
          50% { filter: drop-shadow(0 0 18px rgba(255,122,26,0.36)) drop-shadow(0 0 34px rgba(255,122,26,0.18)); }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(36px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authGlowPulse {
          0%, 100% { box-shadow: 0 0 18px rgba(255,122,26,0.05), 0 16px 40px rgba(0,0,0,0.28); }
          50% { box-shadow: 0 0 26px rgba(255,122,26,0.08), 0 16px 40px rgba(0,0,0,0.28); }
        }
        .forgot-card {
          animation: authCardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both,
                     authGlowPulse 7s ease-in-out 0.7s infinite;
          isolation: isolate;
        }
        .forgot-card::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: conic-gradient(from 0deg, rgba(255,122,26,0.0), rgba(255,122,26,0.85), rgba(245,165,90,0.65), rgba(255,122,26,0.0));
          animation: authBorderSpin 6s linear infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.8;
          z-index: -1;
        }
        @keyframes authBorderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .forgot-btn {
          position: relative;
          overflow: hidden;
        }
        .forgot-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }
        .forgot-btn:hover:not(:disabled)::before {
          transform: translateX(100%);
        }
        .forgot-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #f08a3c, #d46c1c) !important;
          box-shadow: 0 6px 28px rgba(255,122,26,0.5) !important;
          transform: translateY(-1px);
        }
        .forgot-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <div style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "48px clamp(16px, 4vw, 72px)",
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
      }}>
        {/* Left brand panel */}
        <div style={{
          position: "absolute",
          left: "clamp(20px, 8vw, 140px)",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "16px",
          zIndex: 5,
          maxWidth: "360px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/codefounder-logo.png"
              style={{
                width: "56px",
                height: "56px",
                objectFit: "contain",
                animation: "authBrandLift 4.8s ease-in-out infinite, authBrandGlow 3.8s ease-in-out infinite",
              }}
              alt="CodeFounder logo"
            />
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "48px",
              fontWeight: 900,
              fontStyle: "italic",
              color: "#FF7A1A",
              letterSpacing: "-1.4px",
              lineHeight: 0.95,
              textShadow: "0 0 14px rgba(255,122,26,0.35), 0 0 30px rgba(255,122,26,0.18)",
              animation: "authBrandLift 4s ease-in-out infinite, authBrandGlow 3.8s ease-in-out infinite",
            }}>
              CodeFounder
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loginpage.png"
            style={{
              width: "280px",
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 0 14px rgba(255,122,26,0.22)) drop-shadow(0 0 28px rgba(255,122,26,0.12))",
              animation: "authBrandLift 4.8s ease-in-out infinite, authBrandGlow 4.4s ease-in-out infinite",
            }}
            alt="CodeFounder illustration"
          />
        </div>

        {/* Auth card */}
        <div className="forgot-card" style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "20px",
          padding: "28px",
          zIndex: 10,
          marginRight: "clamp(0px, 2vw, 20px)",
          maxHeight: "calc(100vh - 36px)",
          overflow: "hidden",
        }}>
          {/* Top orange gradient line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, rgba(255,122,26,0.8) 0%, rgba(245,165,90,0.4) 50%, transparent 100%)",
            borderRadius: "20px 20px 0 0",
          }} />

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "16px", fontSize: "32px" }}>📧</div>
              <h1 style={{ marginBottom: "12px", fontSize: "24px", fontWeight: 800, color: "var(--foreground)" }}>
                Check your email
              </h1>
              <p style={{ marginBottom: "24px", fontSize: "14px", color: "var(--muted)", lineHeight: 1.6 }}>
                We sent a reset link to{" "}
                <span style={{ color: "var(--foreground)" }}>{email}</span>. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#FF7A1A",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "18px" }}>
                <h1 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "var(--foreground)",
                  background: "transparent",
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  marginBottom: "4px",
                  margin: 0,
                }}>
                  Reset your password
                </h1>
                <p style={{
                  fontSize: "14px",
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  margin: 0,
                  fontFamily: "var(--font-sans)",
                }}>
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <AuthField
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  error={touched ? (emailError ?? null) : null}
                  valid={touched && isValid && email.length > 0}
                  touched={touched}
                  autoComplete="email"
                  disabled={loading}
                />

                {error && (
                  <div
                    role="alert"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "10px",
                      color: "#f87171",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="forgot-btn"
                  disabled={loading || !isValid}
                  style={{
                    width: "100%",
                    padding: "13px 20px",
                    background: "linear-gradient(135deg, #FF7A1A 0%, #C4611A 100%)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    cursor: loading || !isValid ? "not-allowed" : "pointer",
                    opacity: loading || !isValid ? 0.55 : 1,
                    boxShadow: "0 4px 20px rgba(255,122,26,0.28)",
                    transition: "all 0.2s",
                    marginTop: "0px",
                  }}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                {!isValid && !loading && (
                  <p style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: "var(--muted-low)",
                    fontFamily: "var(--font-sans)",
                    margin: 0,
                  }}>
                    Enter a valid email to continue
                  </p>
                )}
              </form>

              <p style={{
                marginTop: "24px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--muted)",
                fontFamily: "var(--font-sans)",
                margin: "24px 0 0",
              }}>
                Remember your password?{" "}
                <Link
                  href="/login"
                  style={{ fontWeight: 600, color: "#FF7A1A", textDecoration: "none", transition: "color 0.2s" }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
