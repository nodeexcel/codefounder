"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import {
  validateConfirmPassword,
  validateSignupPassword,
} from "@/components/auth/validation";

export default function ResetPasswordPage() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const router = useRouter();

  // Wait for Supabase to fire PASSWORD_RECOVERY before showing the form.
  // If it doesn't fire within 5 s the link has expired or is invalid.
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    supabaseRef.current = createClient();
    const supabase = supabaseRef.current;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    const timeout = setTimeout(() => setExpired(true), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = validateSignupPassword(password);
  const confirmError = validateConfirmPassword(password, confirmPassword);
  const isValid = !passwordError && !confirmError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouchedPassword(true);
    setTouchedConfirm(true);
    setError(null);
    if (!isValid) return;

    setLoading(true);
    try {
      const supabase = supabaseRef.current ?? createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authError.message);
      } else {
        router.push("/login?message=password-updated");
      }
    } catch {
      setError("Something went wrong. Please try again.");
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
        {/* Waiting for PASSWORD_RECOVERY event */}
        {!ready && !expired && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent" />
            <p className="text-sm text-gray-400">Verifying reset link…</p>
          </div>
        )}

        {/* Link expired or invalid */}
        {!ready && expired && (
          <div className="text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold text-white">Link expired</h1>
            <p className="mb-6 text-sm text-gray-400">
              This password reset link has expired or is invalid. Request a new
              one below.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#f97316] hover:underline"
            >
              Request new reset link
            </Link>
          </div>
        )}

        {/* PASSWORD_RECOVERY confirmed — show form */}
        {ready && (
          <>
            <h1 className="mb-1 text-2xl font-bold text-white">
              Set new password
            </h1>
            <p className="mb-6 text-sm text-gray-400">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <AuthField
                  label="New password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value.replace(/\s/g, ""))
                  }
                  onBlur={() => setTouchedPassword(true)}
                  error={touchedPassword ? (passwordError ?? null) : null}
                  valid={touchedPassword && !passwordError && password.length > 0}
                  touched={touchedPassword}
                  showPasswordToggle
                  autoComplete="new-password"
                  disabled={loading}
                />
                {password.length > 0 && (
                  <PasswordStrengthIndicator password={password} />
                )}
              </div>

              <AuthField
                label="Confirm new password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value.replace(/\s/g, ""))
                }
                onBlur={() => setTouchedConfirm(true)}
                error={touchedConfirm ? (confirmError ?? null) : null}
                valid={
                  touchedConfirm && !confirmError && confirmPassword.length > 0
                }
                touched={touchedConfirm}
                showPasswordToggle
                autoComplete="new-password"
                disabled={loading}
              />

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
                >
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth disabled={loading || !isValid}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              <Link
                href="/login"
                className="font-medium text-[#f97316] hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
