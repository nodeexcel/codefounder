import { Suspense } from "react";
import Link from "next/link";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { CheckoutSuccessBanner } from "@/components/dashboard/CheckoutSuccessBanner";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDuration, timeAgo } from "@/lib/format";
import { PLAN_LIMITS } from "@/lib/plan-limits";

// ─── Icons ───────────────────────────────────────────────────────────────────

function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  );
}

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SettingsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChartIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function CardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function ArrowUpIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function BotIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
    </svg>
  );
}

function ZapIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let bg = "rgba(107,114,128,0.15)";
  let color = "#9CA3AF";

  if (s === "completed" || s === "answered") {
    bg = "rgba(16,185,129,0.12)";
    color = "#10B981";
  } else if (s === "booked" || s === "appointment") {
    bg = "rgba(232,123,44,0.12)";
    color = "#E87B2C";
  } else if (s === "missed" || s === "no-answer" || s === "failed") {
    bg = "rgba(239,68,68,0.12)";
    color = "#EF4444";
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
      style={{ background: bg, color }}
    >
      {status}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMinutes(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  if (mins >= 60) return `${(mins / 60).toFixed(1)}h`;
  return `${mins}m`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: subscription },
    { data: callLogs },
    { count: callsThisMonth },
    { data: durationRows },
    { count: leadsCount },
    { data: voiceSession },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("call_logs")
      .select("id, caller_number, duration, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("duration")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .or("transcript.ilike.%appointment%,transcript.ilike.%booking%"),
    supabase
      .from("agent_wizard_sessions")
      .select("id, status, business_details, voice_settings, vapi_assistant_id")
      .eq("user_id", userId)
      .eq("agent_type", "voice")
      .order("status", { ascending: false }) // "live" sorts last alphabetically but we prefer live
      .limit(1)
      .maybeSingle(),
  ]);

  // Derived values
  const totalSeconds = durationRows?.reduce((sum, r) => sum + (r.duration ?? 0), 0) ?? 0;
  const callCount = callsThisMonth ?? 0;
  const leads = leadsCount ?? 0;
  const minutesDisplay = formatMinutes(totalSeconds);

  // Plan limits
  const planKey = (!subscription || subscription.status === "canceled")
    ? "free"
    : ((subscription.plan as keyof typeof PLAN_LIMITS) ?? "free");
  const planLimits = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.free;
  const callLimit = planLimits.calls;
  const callLimitLabel = callLimit >= 999000 ? "Unlimited" : `${callLimit.toLocaleString()}/mo`;
  const callPct = callLimit >= 999000 ? (callCount > 0 ? 100 : 0) : Math.min(100, Math.round((callCount / callLimit) * 100));
  const minutePct = Math.min(100, Math.round((totalSeconds / (20 * 60)) * 100));

  const currentPlan = planKey.charAt(0).toUpperCase() + planKey.slice(1);

  const isVoiceLive = voiceSession?.status === "live";
  const isVoiceDraft = !!voiceSession && !isVoiceLive;
  const voiceSettings = (voiceSession?.voice_settings ?? {}) as { agentName?: string; phoneNumber?: string };
  const businessName = (voiceSession?.business_details as { businessName?: string } | null)?.businessName?.trim() ?? "";
  const phoneNumber = voiceSettings.phoneNumber ?? "";
  const agentName = voiceSettings.agentName?.trim() || "Voice Agent";
  const agentInitials = agentName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const ORANGE = "#E87B2C";

  return (
    <>
      <DashboardNavbar title="Dashboard" />

      <div className="min-h-[calc(100vh-56px)] space-y-5 p-4 sm:p-6 lg:p-8">

        {/* ── Checkout success banner ─────────────────────────────────── */}
        <Suspense>
          <CheckoutSuccessBanner />
        </Suspense>

        {/* ── Hero section ─────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
          style={{
            background: "linear-gradient(135deg, rgba(232,123,44,0.13) 0%, rgba(232,123,44,0.04) 50%, rgba(0,0,0,0) 100%)",
            border: "1px solid rgba(232,123,44,0.18)",
          }}
        >
          {/* Glow orb */}
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full opacity-25 blur-3xl"
            style={{ background: ORANGE }}
          />

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <WelcomeBanner />
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
                {isVoiceLive
                  ? "Your agent is live and accepting calls."
                  : isVoiceDraft
                  ? "You have an incomplete agent setup."
                  : "Get started by configuring your Voice Agent."}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isVoiceLive && (
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)" }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#10B981" }} />
                  <span className="text-xs font-semibold" style={{ color: "#10B981" }}>Live</span>
                </div>
              )}
              <span
                className="inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold"
                style={{
                  background: "rgba(232,123,44,0.14)",
                  color: ORANGE,
                  border: "1px solid rgba(232,123,44,0.28)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {currentPlan} Plan
              </span>
            </div>
          </div>

          {/* Summary stats strip */}
          <div className="relative mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: "#fff", fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}>{callCount}</p>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>calls this month</p>
            </div>
            <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: "#fff", fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}>{minutesDisplay}</p>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>minutes used</p>
            </div>
            <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: "#fff", fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}>{leads}</p>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>leads captured</p>
            </div>
            <div className="hidden h-8 w-px sm:block" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="hidden sm:block">
              <p className="text-2xl font-bold leading-none" style={{ color: "#fff", fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}>
                {callLimit >= 999000 ? "∞" : callLimitLabel}
              </p>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>plan limit</p>
            </div>
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Calls This Month */}
          <div
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-32 w-32 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-2xl"
              style={{ background: "rgba(232,123,44,0.10)", transform: "translate(30%,-30%)" }}
            />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(232,123,44,0.12)", color: ORANGE }}>
                  <PhoneIcon size={18} />
                </div>
                {callCount > 0 && (
                  <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                    <ArrowUpIcon size={10} />
                    Active
                  </div>
                )}
              </div>
              <p className="font-heading text-4xl font-bold" style={{ color: "#fff", letterSpacing: "-0.035em" }}>{callCount}</p>
              <p className="mt-1.5 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Calls This Month</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${callPct}%`, background: `linear-gradient(90deg, ${ORANGE}, #F59E0B)` }} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
                {callLimit >= 999000 ? "Unlimited plan" : `${callPct}% of ${callLimitLabel}`}
              </p>
            </div>
          </div>

          {/* Minutes Used */}
          <div
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-32 w-32 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-2xl"
              style={{ background: "rgba(232,123,44,0.10)", transform: "translate(30%,-30%)" }}
            />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(232,123,44,0.12)", color: ORANGE }}>
                <ClockIcon size={18} />
              </div>
              <p className="font-heading text-4xl font-bold" style={{ color: "#fff", letterSpacing: "-0.035em" }}>{minutesDisplay}</p>
              <p className="mt-1.5 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Minutes Used</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${minutePct}%`, background: `linear-gradient(90deg, ${ORANGE}, #F59E0B)` }} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>{minutePct}% of 20h limit</p>
            </div>
          </div>

          {/* Leads Captured */}
          <div
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-32 w-32 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-2xl"
              style={{ background: "rgba(232,123,44,0.10)", transform: "translate(30%,-30%)" }}
            />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(232,123,44,0.12)", color: ORANGE }}>
                  <StarIcon size={18} />
                </div>
                {leads > 0 && (
                  <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                    <ArrowUpIcon size={10} />
                    {leads} new
                  </div>
                )}
              </div>
              <p className="font-heading text-4xl font-bold" style={{ color: "#fff", letterSpacing: "-0.035em" }}>{leads}</p>
              <p className="mt-1.5 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Leads Captured</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full" style={{ width: leads > 0 ? "100%" : "0%", background: `linear-gradient(90deg, ${ORANGE}, #F59E0B)` }} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>Detected in transcripts</p>
            </div>
          </div>

        </div>

        {/* ── Main grid: Agent card + Recent calls ──────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* ── Voice Agent card ─────────────────────────────────────────── */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 lg:col-span-2"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <p
              className="mb-4 text-[10px] font-semibold uppercase tracking-[2.5px]"
              style={{ color: ORANGE, fontFamily: "var(--font-heading)" }}
            >
              Voice Agent
            </p>

            {voiceSession ? (
              <>
                {/* Avatar + name + status */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold"
                    style={{
                      background: isVoiceLive
                        ? "linear-gradient(135deg, rgba(232,123,44,0.30), rgba(232,123,44,0.12))"
                        : "rgba(255,255,255,0.06)",
                      color: isVoiceLive ? ORANGE : "rgba(255,255,255,0.40)",
                      border: isVoiceLive ? "1px solid rgba(232,123,44,0.30)" : "1px solid rgba(255,255,255,0.08)",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    {isVoiceLive && agentInitials ? agentInitials : <BotIcon size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold" style={{ color: "#fff" }}>{agentName}</p>
                      {isVoiceLive && (
                        <div
                          className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5"
                          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.20)" }}
                        >
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#10B981" }} />
                          <span className="text-[10px] font-semibold" style={{ color: "#10B981" }}>Live</span>
                        </div>
                      )}
                      {isVoiceDraft && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.20)" }}
                        >
                          Draft
                        </span>
                      )}
                    </div>
                    {businessName && (
                      <p className="mt-0.5 truncate text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{businessName}</p>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div
                  className="mt-4 space-y-2.5 rounded-xl p-3.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>Phone number</span>
                    {phoneNumber
                      ? <span className="font-mono text-xs font-semibold" style={{ color: ORANGE }}>{phoneNumber}</span>
                      : <span className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>Not assigned</span>
                    }
                  </div>
                  <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>Status</span>
                    <span className="text-xs font-medium" style={{ color: isVoiceLive ? "#10B981" : "#F59E0B" }}>
                      {isVoiceLive ? "Accepting calls" : "Setup incomplete"}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>Calls this month</span>
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.70)" }}>{callCount}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {isVoiceLive && (
                    <Link
                      href="/calls"
                      className="flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all hover:-translate-y-px"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.75)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      Call Logs
                    </Link>
                  )}
                  <Link
                    href="/wizard"
                    className="flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-semibold transition-all hover:-translate-y-px hover:brightness-110"
                    style={{
                      background: isVoiceDraft ? ORANGE : "rgba(255,255,255,0.06)",
                      color: isVoiceDraft ? "#fff" : "rgba(255,255,255,0.75)",
                      border: isVoiceDraft ? "none" : "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    {isVoiceDraft ? "Continue Setup" : "Reconfigure"}
                  </Link>
                </div>
              </>
            ) : (
              /* No agent configured */
              <div className="flex flex-col items-center py-6 text-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(232,123,44,0.10)", color: ORANGE, border: "1px solid rgba(232,123,44,0.18)" }}
                >
                  <ZapIcon size={24} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "#fff" }}>No agent yet</p>
                <p className="mt-1.5 max-w-[180px] text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                  Set up your AI Voice Agent in under 10 minutes.
                </p>
                <Link
                  href="/wizard"
                  className="mt-5 inline-flex h-9 items-center rounded-lg px-5 text-sm font-semibold transition-all hover:-translate-y-px hover:brightness-110"
                  style={{ background: ORANGE, color: "#fff" }}
                >
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* ── Recent Calls ─────────────────────────────────────────────── */}
          <div
            className="overflow-hidden rounded-2xl lg:col-span-3"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[2.5px]"
                  style={{ color: ORANGE, fontFamily: "var(--font-heading)" }}
                >
                  Activity
                </p>
                <h3
                  className="mt-0.5 text-base font-semibold"
                  style={{ color: "#fff", fontFamily: "var(--font-heading)", letterSpacing: "-0.01em" }}
                >
                  Recent Calls
                </h3>
              </div>
              <Link
                href="/calls"
                className="text-xs font-medium transition-opacity hover:opacity-75"
                style={{ color: ORANGE }}
              >
                View all →
              </Link>
            </div>

            {callLogs && callLogs.length > 0 ? (
              <div>
                {callLogs.map((call, i) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                    style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.045)" : undefined }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(232,123,44,0.10)", color: ORANGE }}
                    >
                      <PhoneIcon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: "#fff" }}>
                        {call.caller_number ?? "Web Call"}
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
                        {timeAgo(call.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden tabular-nums text-xs sm:block" style={{ color: "rgba(255,255,255,0.40)" }}>
                        {call.duration != null ? formatDuration(call.duration) : "—"}
                      </span>
                      <StatusBadge status={call.status} />
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}>
                  <Link
                    href="/calls"
                    className="block w-full rounded-lg py-2 text-center text-xs font-medium transition-colors hover:bg-white/[0.04]"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    View all call logs
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center px-5 py-16 text-center">
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.20)" }}
                >
                  <PhoneIcon size={20} />
                </div>
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>No calls yet</p>
                <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.20)" }}>
                  Calls will appear here once your agent is live
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div>
          <p
            className="mb-3 text-[10px] font-semibold uppercase tracking-[2.5px]"
            style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-heading)" }}
          >
            Quick Actions
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            <Link
              href="/wizard"
              className="group flex items-center gap-3.5 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
                style={{ background: "rgba(232,123,44,0.10)", color: ORANGE }}
              >
                <SettingsIcon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--font-heading)" }}>
                  {isVoiceDraft ? "Continue Setup" : "Reconfigure Agent"}
                </p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Update settings &amp; voice
                </p>
              </div>
            </Link>

            <Link
              href="/analytics"
              className="group flex items-center gap-3.5 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
                style={{ background: "rgba(232,123,44,0.10)", color: ORANGE }}
              >
                <ChartIcon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--font-heading)" }}>
                  View Analytics
                </p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Call trends &amp; performance
                </p>
              </div>
            </Link>

            <Link
              href="/billing"
              className="group flex items-center gap-3.5 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
                style={{ background: "rgba(232,123,44,0.10)", color: ORANGE }}
              >
                <CardIcon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--font-heading)" }}>
                  Manage Billing
                </p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {currentPlan} plan · upgrade anytime
                </p>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </>
  );
}
