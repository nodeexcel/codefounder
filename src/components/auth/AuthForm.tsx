"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
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
      );

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
            "Account created but email confirmation is required. Disable “Confirm email” in Supabase Auth settings for instant access, or confirm your email first."
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
          redirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12">
      <div className="mb-8">
        <Logo href="/" size="lg" />
      </div>

      <Card className="w-full max-w-md" padding="lg">
        <h1 className="mb-1 text-2xl font-bold text-white">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-6 text-sm text-gray-400">
          {isLogin
            ? "Sign in to manage your AI agents"
            : "Start launching AI agents in minutes"}
        </p>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleGoogleAuth}
          disabled={loading}
          className="mb-4"
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#222222]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-[#111111] px-2 text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4" noValidate>
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

          <div className="space-y-2">
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
              <PasswordStrengthIndicator password={password} />
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

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={loading || !formValid}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign in"
                : "Create account"}
          </Button>

          {!formValid && !loading && (
            <p className="text-center text-xs text-gray-500">
              Complete all fields correctly to continue
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            href={isLogin ? "/signup" : "/login"}
            className="font-medium text-[#f97316] hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
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
