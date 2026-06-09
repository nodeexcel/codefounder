"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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

  async function waitForSession(
    maxAttempts = 15,
    delayMs = 200
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return true;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  async function redirectToDashboard() {
    const hasSession = await waitForSession();
    if (!hasSession) {
      setError("Session could not be established. Please try again.");
      return;
    }
    window.location.href = "/dashboard";
  }

  async function saveUserProfile(
    userId: string,
    profile: { username: string; full_name: string; email: string }
  ) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username: profile.username,
        full_name: profile.full_name,
        email: profile.email,
      },
      { onConflict: "id" }
    );
    if (profileError) throw new Error(profileError.message);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    touchAllFields();
    setError(null);

    if (!formValid) return;

    setLoading(true);

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
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword(
          {
            email: email.trim(),
            password,
          }
        );

        if (authError) {
          setError(authError.message);
          return;
        }

        if (!data.session) {
          setError("Sign in failed. No session was created. Please try again.");
          return;
        }

        await redirectToDashboard();
      } else {
        const trimmedName = fullName.trim();
        const normalizedUsername = username.trim().toLowerCase();

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: trimmedName,
              username: normalizedUsername,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (!data.user) {
          setError("Sign up failed. Please try again.");
          return;
        }

        if (!data.session) {
          setError(
            'Account created but email confirmation is required. Disable “Confirm email” in Supabase Auth settings for instant access, or confirm your email first.'
          );
          return;
        }

        await saveUserProfile(data.user.id, {
          username: normalizedUsername,
          full_name: trimmedName,
          email: email.trim(),
        });

        await redirectToDashboard();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
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
        @keyframes authGridMove {
          from { background-position: 0 0; }
          to { background-position: 60px 60px; }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(36px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authSparkFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
        }
        @keyframes authTwinkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes authGlowPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(232,123,44,0.1), 0 24px 80px rgba(0,0,0,0.65); }
          50% { box-shadow: 0 0 80px rgba(232,123,44,0.2), 0 24px 80px rgba(0,0,0,0.65); }
        }
        .auth-card {
          animation: authCardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both,
                     authGlowPulse 4s ease-in-out 0.7s infinite;
        }
        .auth-google-btn:hover:not(:disabled) {
          border-color: rgba(232,123,44,0.4) !important;
          background: #222 !important;
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
          box-shadow: 0 6px 28px rgba(232,123,44,0.5) !important;
          transform: translateY(-1px);
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .auth-forgot:hover { color: #E87B2C !important; }
        .auth-switch-link:hover { color: #F5A55A !important; text-decoration: underline; }
      `}</style>

      <div style={{
        position: "relative",
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Perspective grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 0%, transparent 72%)",
          animation: "authGridMove 8s linear infinite",
          pointerEvents: "none",
        }} />

        {/* Ambient orange glow */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(232,123,44,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Focused glow behind card */}
        <div style={{
          position: "absolute",
          width: "560px",
          height: "300px",
          background: "radial-gradient(ellipse at center, rgba(232,123,44,0.18) 0%, transparent 70%)",
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }} />

        {/* Spark particles */}
        {[
          { w: 3, h: 3, c: "#E87B2C", t: "22%", l: "8%", dur: "4s", del: "0s", shadow: "0 0 6px 2px rgba(232,123,44,0.8)" },
          { w: 2, h: 2, c: "#F5A55A", t: "68%", l: "13%", dur: "5s", del: "0.7s", shadow: "0 0 4px 2px rgba(245,165,90,0.7)" },
          { w: 4, h: 4, c: "#E87B2C", t: "38%", l: "6%", dur: "3.5s", del: "1.2s", shadow: "0 0 8px 3px rgba(232,123,44,0.6)" },
          { w: 3, h: 3, c: "#F5A55A", t: "18%", l: "83%", dur: "4.5s", del: "2s", shadow: "0 0 6px 2px rgba(245,165,90,0.8)" },
          { w: 2, h: 2, c: "#E87B2C", t: "62%", l: "88%", dur: "3s", del: "0.5s", shadow: "0 0 4px 2px rgba(232,123,44,0.7)" },
          { w: 3, h: 3, c: "#E87B2C", t: "78%", l: "75%", dur: "4s", del: "2.5s", shadow: "0 0 6px 2px rgba(232,123,44,0.9)" },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            width: `${s.w}px`,
            height: `${s.h}px`,
            background: s.c,
            top: s.t,
            left: s.l,
            borderRadius: "50%",
            animation: `authSparkFloat ${s.dur} ease-in-out ${s.del} infinite`,
            boxShadow: s.shadow,
            pointerEvents: "none",
          }} />
        ))}
        {[
          { t: "20%", l: "68%", dur: "2.5s", del: "0.2s" },
          { t: "74%", l: "48%", dur: "3s", del: "1s" },
          { t: "44%", l: "91%", dur: "2s", del: "0.8s" },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            width: "5px",
            height: "5px",
            background: "radial-gradient(circle, #fff, transparent)",
            borderRadius: "50%",
            top: s.t,
            left: s.l,
            animation: `authTwinkle ${s.dur} ease-in-out ${s.del} infinite`,
            pointerEvents: "none",
          }} />
        ))}

        {/* Auth card */}
        <div className="auth-card" style={{
          position: "relative",
          width: "100%",
          maxWidth: "440px",
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "40px",
          zIndex: 10,
        }}>
          {/* Top orange gradient line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, rgba(232,123,44,0.8) 0%, rgba(245,165,90,0.4) 50%, transparent 100%)",
            borderRadius: "20px 20px 0 0",
          }} />

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/codefounder-logo.png"
                style={{ height: "44px", width: "44px", objectFit: "contain", mixBlendMode: "screen" }}
                alt=""
              />
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "26px",
                fontWeight: 800,
                fontStyle: "italic",
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}>
                CodeFounder
              </span>
            </Link>
          </div>

          {/* Badge + heading */}
          <div style={{ marginBottom: "26px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(232,123,44,0.1)",
              border: "1px solid rgba(232,123,44,0.25)",
              color: "#F5A55A",
              padding: "4px 14px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "2.5px",
              textTransform: "uppercase" as const,
              marginBottom: "14px",
            }}>
              <span style={{ width: "6px", height: "6px", background: "#E87B2C", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
              {isLogin ? "Secure Login" : "Get Started Free"}
            </div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "28px",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "6px",
              lineHeight: 1.15,
            }}>
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p style={{ fontSize: "14px", color: "#888888", lineHeight: 1.6, margin: 0 }}>
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
              background: "#181818",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#ffffff",
              fontSize: "14px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
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
            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <span style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#111111",
              padding: "0 12px",
              fontSize: "11px",
              textTransform: "uppercase" as const,
              letterSpacing: "2px",
              color: "#444",
            }}>or</span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {!isLogin && (
              <>
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
              </>
            )}

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
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={loading}
              />
              {!isLogin && password.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <PasswordStrengthIndicator password={password} />
                </div>
              )}
              {isLogin && (
                <div style={{ textAlign: "right", marginTop: "8px" }}>
                  <Link
                    href="/forgot-password"
                    className="auth-forgot"
                    style={{ fontSize: "12px", color: "#666", textDecoration: "none", transition: "color 0.2s" }}
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

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
                            ? "1.5px solid #E87B2C"
                            : "1.5px solid rgba(255,255,255,0.15)",
                        borderRadius: "4px",
                        background: termsAccepted
                          ? "rgba(232,123,44,0.15)"
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
                        stroke="#E87B2C"
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
                  <span style={{ fontSize: "13px", color: "#888888", lineHeight: 1.55 }}>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#E87B2C", textDecoration: "underline" }}
                    >
                      Terms of Service
                    </a>
                    {", "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#E87B2C", textDecoration: "underline" }}
                    >
                      Privacy Policy
                    </a>
                    {", and "}
                    <a
                      href="/acceptable-use"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#E87B2C", textDecoration: "underline" }}
                    >
                      Acceptable Use Policy
                    </a>
                  </span>
                </label>

                {termsTouched && !termsAccepted && (
                  <p style={{ marginTop: "6px", paddingLeft: "27px", fontSize: "12px", color: "#f87171" }}>
                    You must agree to the terms to continue
                  </p>
                )}

                <p style={{
                  marginTop: "8px",
                  paddingLeft: "27px",
                  fontSize: "11px",
                  color: "#555555",
                  lineHeight: 1.55,
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
                background: "linear-gradient(135deg, #E87B2C 0%, #C4611A 100%)",
                border: "none",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "15px",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                cursor: loading || !formValid ? "not-allowed" : "pointer",
                opacity: loading || !formValid ? 0.55 : 1,
                boxShadow: "0 4px 20px rgba(232,123,44,0.28)",
                transition: "all 0.2s",
                marginTop: "4px",
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
                color: "#555",
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
            color: "#666",
            margin: "24px 0 0",
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="auth-switch-link"
              style={{ fontWeight: 600, color: "#E87B2C", textDecoration: "none", transition: "color 0.2s" }}
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
