"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import {
  validateConfirmPassword,
  validateFullName,
  validateSignupPassword,
  validateUsername,
} from "@/components/auth/validation";
import { DAYS, DAY_LABELS } from "@/lib/types/wizard";
import type { BusinessDetails, VoiceSettings } from "@/lib/types/wizard";

type Tab = "profile" | "security" | "business";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, type: ToastItem["type"]) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  }, []);

  return { toasts, push };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-lg border px-4 py-3 text-sm font-medium shadow-xl transition-all duration-300",
            t.type === "success"
              ? "border-green-500/30 bg-green-950/80 text-green-400"
              : "border-red-500/30 bg-red-950/80 text-red-400",
          ].join(" ")}
        >
          {t.type === "success" ? "✓ " : "✗ "}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function ProfileTab({ push }: { push: (msg: string, type: "success" | "error") => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState({ fullName: false, username: false });

  const nameError = validateFullName(fullName);
  const usernameError = validateUsername(username);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setUsername(data.username ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, username: true });
    if (nameError || usernameError) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), username: username.trim().toLowerCase() })
        .eq("id", user.id);

      if (error) {
        push(error.code === "23505" ? "Username is already taken." : error.message, "error");
      } else {
        push("Profile saved successfully.", "success");
      }
    } catch (err) {
      push(err instanceof Error ? err.message : "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="h-7 w-7 animate-spin rounded-full border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const initials = getInitials(fullName || email);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold transition-all duration-300 hover:scale-105"
          style={{
            color: "#ffffff",
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)",
            boxShadow: "0 0 20px var(--accent-glow)",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {initials || "?"}
        </div>
        <div>
          <p className="font-[Outfit] font-medium" style={{ color: "var(--foreground)" }}>Profile picture</p>
          <p className="text-sm text-[var(--muted)]">Auto-generated from your name initials</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <AuthField
          label="Full name"
          type="text"
          placeholder="John Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
          error={touched.fullName ? nameError : null}
          valid={touched.fullName && !nameError && fullName.length > 0}
          touched={touched.fullName}
          autoComplete="name"
          disabled={saving}
        />
        <AuthField
          label="Username"
          type="text"
          placeholder="johnsmith"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
          }
          onBlur={() => setTouched((p) => ({ ...p, username: true }))}
          error={touched.username ? usernameError : null}
          valid={touched.username && !usernameError && username.length > 0}
          touched={touched.username}
          hint="3–20 characters, lowercase letters, numbers, underscores"
          autoComplete="username"
          disabled={saving}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--muted)]">
          Email address
        </label>
        <div
          className="flex items-center gap-3 rounded-lg px-4 py-2.5"
          style={{ background: "var(--card2)", border: "1px solid var(--border)" }}
        >
          <span className="flex-1 text-sm text-[var(--muted)]">{email}</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs text-[var(--muted)]"
            style={{ background: "var(--surface2)" }}
          >
            Read only
          </span>
        </div>
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Email is managed by your sign-in provider.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="relative overflow-hidden rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg disabled:opacity-60"
          style={{ background: "var(--accent)", fontFamily: "Outfit, sans-serif" }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function SecurityTab({ push }: { push: (msg: string, type: "success" | "error") => void }) {
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ password: false, confirm: false });

  const passwordError = validateSignupPassword(password);
  const confirmError = validateConfirmPassword(password, confirm);
  const isValid = !passwordError && !confirmError;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (!isValid) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        push(error.message, "error");
      } else {
        push("Password updated successfully.", "success");
        setPassword("");
        setConfirm("");
        setTouched({ password: false, confirm: false });
      }
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h3 className="font-[Outfit] mb-1 text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Change password
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Choose a strong password with at least 8 characters.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <AuthField
            label="New password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
            error={touched.password ? passwordError : null}
            valid={touched.password && !passwordError && password.length > 0}
            touched={touched.password}
            showPasswordToggle
            autoComplete="new-password"
            disabled={saving}
          />
          {password.length > 0 && <PasswordStrengthIndicator password={password} />}
        </div>

        <AuthField
          label="Confirm new password"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\s/g, ""))}
          onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
          error={touched.confirm ? confirmError : null}
          valid={touched.confirm && !confirmError && confirm.length > 0}
          touched={touched.confirm}
          showPasswordToggle
          autoComplete="new-password"
          disabled={saving}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !isValid}
          className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg disabled:opacity-60"
          style={{ background: "var(--accent)", fontFamily: "Outfit, sans-serif" }}
        >
          {saving ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

interface WizardSession {
  status: string;
  business_details: Partial<BusinessDetails> | null;
  voice_settings: Partial<VoiceSettings> | null;
}

function BusinessTab() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WizardSession | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("agent_wizard_sessions")
        .select("status, business_details, voice_settings")
        .eq("user_id", user.id)
        .eq("agent_type", "voice")
        .maybeSingle();

      setSession(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="h-7 w-7 animate-spin rounded-full border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const b = session?.business_details;
  const v = session?.voice_settings;
  const isLive = session?.status === "live";

  if (!session || !b?.businessName) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl py-14 text-center"
        style={{ background: "var(--card2)", border: "1px solid var(--border)" }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
        >
          📞
        </div>
        <div>
          <p className="font-[Outfit] font-medium" style={{ color: "var(--foreground)" }}>Voice Agent not configured</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Complete the setup wizard to configure your Voice Agent.
          </p>
        </div>
        <Link
          href="/wizard"
          className="mt-1 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg"
          style={{ background: "var(--accent)", fontFamily: "Outfit, sans-serif" }}
        >
          Start setup wizard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={[
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              isLive
                ? "bg-green-500/10 text-green-400"
                : "bg-yellow-500/10 text-yellow-400",
            ].join(" ")}
          >
            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
            {isLive ? "Live" : "Draft"}
          </span>
          <span className="text-sm text-[var(--muted)]">Voice Agent</span>
        </div>
        <Link
          href="/wizard?reconfigure=true"
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted)] transition-all duration-200 hover:text-[var(--accent)]"
          style={{ border: "1px solid var(--border2)" }}
        >
          Reconfigure →
        </Link>
      </div>

      <InfoSection title="Business Details">
        <InfoRow label="Business name" value={b.businessName!} />
        {b.category && <InfoRow label="Category" value={b.category} />}
        {b.location && <InfoRow label="Location" value={b.location} />}
        {b.phone && <InfoRow label="Phone" value={b.phone} />}
        {b.services && (
          <div className="pt-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Services
            </p>
            <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{b.services}</p>
          </div>
        )}
      </InfoSection>

      {v && (v.agentName || v.tone) && (
        <InfoSection title="Voice Settings">
          {v.agentName && <InfoRow label="Agent name" value={v.agentName} />}
          {v.tone && <InfoRow label="Tone" value={v.tone} />}
          {v.forwardTo && <InfoRow label="Forward calls to" value={v.forwardTo} />}
        </InfoSection>
      )}

      {b.hours && (
        <InfoSection title="Business Hours">
          <div className="space-y-1.5">
            {DAYS.map((day) => {
              const sched = b.hours?.[day];
              if (!sched) return null;
              return (
                <div key={day} className="flex justify-between text-sm">
                  <span className="w-28 text-[var(--muted)]">{DAY_LABELS[day]}</span>
                  <span className="text-[var(--muted)]">
                    {sched.closed ? "Closed" : `${sched.open} – ${sched.close}`}
                  </span>
                </div>
              );
            })}
          </div>
        </InfoSection>
      )}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-5 py-4 transition-all duration-200"
      style={{ background: "var(--card2)", border: "1px solid var(--border)" }}
    >
      <h4 className="mb-3 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className="truncate text-right text-[var(--muted)]">{value}</span>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "business", label: "Business Info" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { toasts, push } = useToast();

  return (
    <>
      <DashboardNavbar
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">
            Account Settings
          </p>

          {/* Tab nav */}
          <div
            className="mb-6 flex gap-1 rounded-xl p-1"
            style={{ background: "var(--card2)", border: "1px solid var(--border)" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                style={
                  activeTab === tab.id
                    ? {
                        background: "var(--accent)",
                        color: "var(--foreground)",
                        boxShadow: "0 0 16px rgba(232,123,44,0.3)",
                        fontFamily: "Outfit, sans-serif",
                      }
                    : { color: "var(--muted)", fontFamily: "Outfit, sans-serif" }
                }
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLElement).style.color = "white";
                    (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                    (e.currentTarget as HTMLElement).style.background = "";
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            className="rounded-xl p-5 sm:p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {activeTab === "profile" && <ProfileTab push={push} />}
            {activeTab === "security" && <SecurityTab push={push} />}
            {activeTab === "business" && <BusinessTab />}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </>
  );
}
