"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import {
  type FieldKey,
  isLoginFormValid,
  isSignupFormValid,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validateLoginPassword,
  validateSignupPassword,
  validateUsername,
} from "@/components/auth/validation";

type AuthMode = "login" | "signup";
type FormStep = "form" | "otp";

interface AuthFormProps {
  mode: AuthMode;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return "Authentication failed";
}

const INITIAL_TOUCHED: Partial<Record<FieldKey, boolean>> = {};

export function AuthForm({ mode }: AuthFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const isLogin = mode === "login";

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] =
    useState<Partial<Record<FieldKey, boolean>>>(INITIAL_TOUCHED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  // OTP verification state (signup only)
  const [formStep, setFormStep] = useState<FormStep>("form");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markTouched = useCallback((field: FieldKey) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const touchAllFields = useCallback(() => {
    if (isLogin) {
      setTouched({ email: true, password: true });
    } else {
      setTouched({
        fullName: true,
        username: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      setTermsTouched(true);
    }
  }, [isLogin]);

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string | null>> = {
      email: validateEmail(email),
      password: isLogin
        ? validateLoginPassword(password)
        : validateSignupPassword(password),
    };
    if (!isLogin) {
      e.fullName = validateFullName(fullName);
      e.username = validateUsername(username);
      e.confirmPassword = validateConfirmPassword(password, confirmPassword);
    }
    return e;
  }, [fullName, username, email, password, confirmPassword, isLogin]);

  const showError = (field: FieldKey) =>
    touched[field] ? (errors[field] ?? null) : null;

  const isFieldValid = (field: FieldKey) =>
    !!touched[field] && !errors[field] && getFieldValue(field).length > 0;

  function getFieldValue(field: FieldKey): string {
    switch (field) {
      case "fullName":
        return fullName;
      case "username":
        return username;
      case "email":
        return email;
      case "password":
        return password;
      case "confirmPassword":
        return confirmPassword;
      default:
        return "";
    }
  }

  const formValid = isLogin
    ? isLoginFormValid(email, password)
    : isSignupFormValid(
        fullName,
        username,
        email,
        password,
        confirmPassword
      ) && termsAccepted;

  // Start 60-second resend cooldown
  function startResendCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Clean up interval on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    touchAllFields();
    setError(null);

    if (!formValid) return;

    setLoading(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError(“Authentication is not configured. Missing Supabase environment variables.”);
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (!data.session) {
          setError(“Sign in failed. No session was created. Please try again.”);
          return;
        }

        window.location.href = “/dashboard”;
      } else {
        // Signup: send OTP via our API (creates unconfirmed user + emails 6-digit code)
        const res = await fetch(“/api/auth/send-email-otp”, {
          method: “POST”,
          headers: { “Content-Type”: “application/json” },
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            username: username.trim().toLowerCase(),
          }),
        });

        const json = await res.json() as { success?: boolean; error?: string };

        if (!res.ok || !json.success) {
          setError(json.error ?? “Failed to send verification email. Please try again.”);
          return;
        }

        // Switch to OTP verification screen
        setFormStep(“otp”);
        setOtpValue(“”);
        setOtpError(null);
        startResendCooldown();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);

    const cleaned = otpValue.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: cleaned }),
      });

      const json = await res.json() as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        setOtpError(json.error ?? "Verification failed. Please try again.");
        return;
      }

      // Email confirmed — sign in with the credentials still in state
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !signInData.session) {
        setOtpError("Email verified! Please sign in with your credentials.");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setOtpError(getErrorMessage(err));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || otpLoading) return;
    setOtpError(null);
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), resend: true }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setOtpError(json.error ?? "Failed to resend code. Please try again.");
        return;
      }
      setOtpValue("");
      startResendCooldown();
    } catch (err) {
      setOtpError(getErrorMessage(err));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setError(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setError(
        "Authentication is not configured. Missing Supabase environment variables."
      );
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      });

      if (authError) setError(authError.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes authBorderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(36px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authGlowPulse {
          0%, 100% { box-shadow: 0 0 18px rgba(255,122,26,0.05), 0 16px 40px rgba(0,0,0,0.28); }
          50% { box-shadow: 0 0 26px rgba(255,122,26,0.08), 0 16px 40px rgba(0,0,0,0.28); }
        }
        @keyframes authBrandLift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes authBrandGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(255,122,26,0.22)) drop-shadow(0 0 24px rgba(255,122,26,0.12)); }
          50% { filter: drop-shadow(0 0 18px rgba(255,122,26,0.36)) drop-shadow(0 0 34px rgba(255,122,26,0.18)); }
        }
        .signup-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
        }
        @media (max-width: 720px) {
          .signup-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .auth-card {
          animation: authCardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both,
                     authGlowPulse 7s ease-in-out 0.7s infinite;
          isolation: isolate;
        }
        .auth-card::before {
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
        .auth-google-btn:hover:not(:disabled) {
          border-color: rgba(255,122,26,0.4) !important;
          background: var(--card-elevated) !important;
          color: var(--foreground) !important;
        }
        .auth-submit-btn {
          position: relative;
          overflow: hidden;
        }
        .auth-submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }
        .auth-submit-btn:hover:not(:disabled)::before {
          transform: translateX(100%);
        }
        .auth-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #f08a3c, #d46c1c) !important;
          box-shadow: 0 6px 28px rgba(255,122,26,0.5) !important;
          transform: translateY(-1px);
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .auth-forgot:hover { color: #FF7A1A !important; }
        .auth-switch-link:hover { color: #FF9B4A !important; text-decoration: underline; }
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
        <div className="auth-card" style={{
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

          {/* Badge + heading */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,122,26,0.1)",
              border: "1px solid rgba(255,122,26,0.25)",
              color: "var(--accent-light)",
              padding: "3px 12px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "2.5px",
              textTransform: "uppercase" as const,
              marginBottom: "10px",
            }}>
              <span style={{ width: "6px", height: "6px", background: "var(--accent)", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
              {isLogin ? "Secure Login" : "Get Started Free"}
            </div>
            <h1 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--foreground)",
              background: "transparent",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: "4px",
            }}>
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6, margin: 0, fontFamily: "var(--font-sans)" }}>
              {isLogin
                ? "Sign in to manage your AI agents"
                : "Start launching AI agents in minutes"}
            </p>
          </div>

          {/* Google OAuth button */}
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "12px 20px",
              background: "var(--card-elevated)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "var(--foreground)",
              fontSize: "14px",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              marginBottom: "20px",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ position: "relative", marginBottom: "20px" }}>
            <div style={{ height: "1px", background: "var(--border2)" }} />
            <span style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--card)",
              padding: "0 12px",
              fontSize: "11px",
              textTransform: "uppercase" as const,
              letterSpacing: "2px",
              color: "var(--muted-low)",
              fontFamily: "var(--font-sans)",
            }}>or</span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} noValidate style={{ display: "flex", flexDirection: "column", gap: isLogin ? "16px" : "12px" }}>
            {!isLogin && (
              <div className="signup-grid">
                <AuthField
                  label="Full name"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => markTouched("fullName")}
                  error={showError("fullName")}
                  valid={isFieldValid("fullName")}
                  touched={!!touched.fullName}
                  autoComplete="name"
                  disabled={loading}
                />
                <AuthField
                  label="Username"
                  type="text"
                  placeholder="johnsmith"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  onBlur={() => markTouched("username")}
                  error={showError("username")}
                  valid={isFieldValid("username")}
                  touched={!!touched.username}
                  hint="3–20 characters, lowercase letters, numbers, underscores"
                  autoComplete="username"
                  disabled={loading}
                />
                <AuthField
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  error={showError("email")}
                  valid={isFieldValid("email")}
                  touched={!!touched.email}
                  autoComplete="email"
                  disabled={loading}
                />
                <div>
                  <AuthField
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                    onBlur={() => markTouched("password")}
                    error={showError("password")}
                    valid={isFieldValid("password")}
                    touched={!!touched.password}
                    showPasswordToggle
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  {password.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <PasswordStrengthIndicator password={password} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {isLogin && (
              <>
                <AuthField
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  error={showError("email")}
                  valid={isFieldValid("email")}
                  touched={!!touched.email}
                  autoComplete="email"
                  disabled={loading}
                />

                <div>
                  <AuthField
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                    onBlur={() => markTouched("password")}
                    error={showError("password")}
                    valid={isFieldValid("password")}
                    touched={!!touched.password}
                    showPasswordToggle
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <div style={{ textAlign: "right", marginTop: "8px" }}>
                    <Link
                      href="/forgot-password"
                      className="auth-forgot"
                      style={{ fontSize: "12px", color: "#666", textDecoration: "none", transition: "color 0.2s" }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              </>
            )}

            {!isLogin && (
              <AuthField
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value.replace(/\s/g, ""))
                }
                onBlur={() => markTouched("confirmPassword")}
                error={showError("confirmPassword")}
                valid={isFieldValid("confirmPassword")}
                touched={!!touched.confirmPassword}
                showPasswordToggle
                autoComplete="new-password"
                disabled={loading}
              />
            )}

            {/* Legal consent checkbox — signup only */}
            {!isLogin && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: loading ? "not-allowed" : "pointer" }}>
                  <div style={{ position: "relative", flexShrink: 0, marginTop: "2px" }}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        setTermsTouched(true);
                      }}
                      disabled={loading}
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        width: "17px",
                        height: "17px",
                        border: termsTouched && !termsAccepted
                          ? "1.5px solid rgba(239,68,68,0.6)"
                          : termsAccepted
                            ? "1.5px solid #FF7A1A"
                            : "1.5px solid rgba(255,255,255,0.15)",
                        borderRadius: "4px",
                        background: termsAccepted
                          ? "rgba(255,122,26,0.15)"
                          : "rgba(255,255,255,0.04)",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "block",
                      }}
                    />
                    {termsAccepted && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FF7A1A"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: "2px",
                          width: "13px",
                          height: "13px",
                          pointerEvents: "none",
                        }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.55, fontFamily: "var(--font-sans)" }}>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#FF7A1A", textDecoration: "underline" }}
                    >
                      Terms of Service
                    </a>
                    {", "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#FF7A1A", textDecoration: "underline" }}
                    >
                      Privacy Policy
                    </a>
                    {", and "}
                    <a
                      href="/acceptable-use"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#FF7A1A", textDecoration: "underline" }}
                    >
                      Acceptable Use Policy
                    </a>
                  </span>
                </label>

                {termsTouched && !termsAccepted && (
                  <p style={{ marginTop: "4px", paddingLeft: "27px", fontSize: "12px", color: "#f87171" }}>
                    You must agree to the terms to continue
                  </p>
                )}

                <p style={{
                  marginTop: "4px",
                  paddingLeft: "27px",
                  fontSize: "11px",
                  color: "var(--muted-low)",
                  lineHeight: 1.55,
                  fontFamily: "var(--font-sans)",
                }}>
                  By signing up, you acknowledge that CodeFounder deploys AI-powered voice agents that interact with real callers.
                </p>
              </div>
            )}

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
              className="auth-submit-btn"
              disabled={loading || !formValid}
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
                cursor: loading || !formValid ? "not-allowed" : "pointer",
                opacity: loading || !formValid ? 0.55 : 1,
                boxShadow: "0 4px 20px rgba(255,122,26,0.28)",
                transition: "all 0.2s",
                marginTop: isLogin ? "4px" : "0px",
              }}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in →"
                  : "Create account →"}
            </button>

            {!formValid && !loading && (
              <p style={{
                textAlign: "center",
                fontSize: "12px",
                color: "var(--muted-low)",
                fontFamily: "var(--font-sans)",
                margin: 0,
              }}>
                Complete all fields correctly to continue
              </p>
            )}
          </form>

          {/* Switch auth mode */}
          <p style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--muted)",
            fontFamily: "var(--font-sans)",
            margin: "24px 0 0",
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="auth-switch-link"
              style={{ fontWeight: 600, color: "#FF7A1A", textDecoration: "none", transition: "color 0.2s" }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden style={{ width: "18px", height: "18px", flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
