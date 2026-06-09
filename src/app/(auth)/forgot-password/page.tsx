"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12">
      <div className="mb-8">
        <Logo href="/" size="lg" />
      </div>

      <Card className="w-full max-w-md" padding="lg">
        {sent ? (
          <div className="text-center">
            <div className="mb-4 text-4xl">📧</div>
            <h1 className="mb-2 text-2xl font-bold text-white">Check your email</h1>
            <p className="mb-6 text-sm text-gray-400">
              We sent a reset link to{" "}
              <span className="text-white">{email}</span>. Check your inbox and
              spam folder.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-[#f97316] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-bold text-white">
              Reset your password
            </h1>
            <p className="mb-6 text-sm text-gray-400">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400"
                >
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-[#f97316] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
