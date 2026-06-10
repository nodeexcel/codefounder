import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Button } from "@/components/ui/Button";
import { AGENTS, type AgentType } from "@/lib/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDuration, timeAgo } from "@/lib/format";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
      {children}
    </p>
  );
}

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
    { data: liveSessions },
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
      .select("agent_type")
      .eq("user_id", userId)
      .eq("status", "live"),
  ]);

  const activeAgents = (liveSessions ?? [])
    .map((s) => AGENTS.find((a) => a.id === (s.agent_type as AgentType)))
    .filter(Boolean) as typeof AGENTS;

  const totalSeconds = durationRows?.reduce((sum, r) => sum + (r.duration ?? 0), 0) ?? 0;
  const aiMinutes = totalSeconds / 60;
  const aiMinutesDisplay =
    aiMinutes >= 60 ? `${(aiMinutes / 60).toFixed(1)}h` : `${Math.round(aiMinutes)}m`;
  const callCount = callsThisMonth ?? 0;
  const callPct = Math.min(100, Math.round((callCount / 500) * 100));
  const minuteLimit = 20 * 60;
  const minutePct = Math.min(100, Math.round((totalSeconds / minuteLimit) * 100));

  const usageStats = [
    {
      label: "Calls this month",
      value: String(callCount),
      limit: "500",
      pct: callPct,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
        </svg>
      ),
    },
    {
      label: "AI minutes used",
      value: aiMinutesDisplay,
      limit: "20h",
      pct: minutePct,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Leads captured",
      value: String(leadsCount ?? 0),
      limit: "—",
      pct: null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  const currentPlan = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "Free";

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const trialDaysRemaining = subscription?.created_at
    ? Math.max(
        0,
        14 -
          Math.floor(
            (nowMs - new Date(subscription.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
      )
    : 0;

  return (
    <>
      <DashboardNavbar
        title="Dashboard"
        subtitle="Overview of your AI agents and activity"
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <WelcomeBanner />

        {/* Stats grid */}
        <div>
          <SectionLabel>Usage Overview</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {usageStats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }}
                />
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {stat.label}
                  </p>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                  >
                    {stat.icon}
                  </div>
                </div>
                <p
                  className="mt-3 font-[Outfit] text-3xl font-bold"
                  style={{ letterSpacing: "-0.02em", color: "var(--foreground)" }}
                >
                  {stat.value}
                </p>
                {stat.limit !== "—" && (
                  <div className="mt-3 space-y-1.5">
                    <div
                      className="h-1 overflow-hidden rounded-full"
                      style={{ background: "var(--surface2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stat.pct}%`,
                          background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
                          transition: "width 600ms ease-out",
                        }}
                      />
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--muted-low)" }}>
                      {stat.pct}% of {stat.limit} limit
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Plan + main content */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Plan card */}
          <div
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }}
            />
            <p className="mb-1 text-xs font-semibold uppercase tracking-[2px] font-[Outfit]" style={{ color: "var(--accent)" }}>
              Plan
            </p>
            <p className="font-[Outfit] text-2xl font-bold" style={{ letterSpacing: "-0.02em", color: "var(--foreground)" }}>
              {currentPlan}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-low)" }}>
              {trialDaysRemaining > 0
                ? `${trialDaysRemaining} trial day${trialDaysRemaining === 1 ? "" : "s"} left`
                : subscription?.status
                  ? `Status: ${subscription.status}`
                  : "No active subscription"}
            </p>
            <div className="mt-4">
              <Button href="/billing" variant="outline" size="sm" fullWidth>
                Manage billing
              </Button>
            </div>
          </div>

          {/* Active agents */}
          <div
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 lg:col-span-2"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }}
            />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[2px] font-[Outfit] mb-1" style={{ color: "var(--accent)" }}>
                  Live Agents
                </p>
                <h3 className="font-[Outfit] text-base font-semibold" style={{ color: "var(--foreground)" }}>Active agents</h3>
              </div>
              <Button href="/agents" variant="ghost" size="sm">
                View all
              </Button>
            </div>
            {activeAgents.length > 0 ? (
              <ul className="space-y-2">
                {activeAgents.map((agent) => (
                  <li
                    key={agent.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "var(--card-elevated)",
                      border: "1px solid rgba(255,122,26,0.12)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{agent.icon}</span>
                      <div>
                        <p className="font-[Outfit] text-sm font-medium" style={{ color: "var(--foreground)" }}>{agent.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted-low)" }}>Voice Agent</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  No active agents yet
                </p>
              </div>
            )}
            <div className="mt-4">
              <Button href="/wizard" variant="outline" size="sm" fullWidth>
                Launch an agent
              </Button>
            </div>
          </div>
        </div>

        {/* Recent call logs */}
        <div
          className="group relative overflow-hidden rounded-2xl transition-all duration-300"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
          />
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] font-[Outfit] mb-0.5" style={{ color: "var(--accent)" }}>
                Voice Agent
              </p>
              <h3 className="font-[Outfit] text-base font-semibold" style={{ color: "var(--foreground)" }}>Recent calls</h3>
            </div>
            <Button href="/calls" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          {callLogs && callLogs.length > 0 ? (
            <div>
              {callLogs.map((call, i) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between px-6 py-3.5 transition-colors duration-150 hover:bg-[var(--surface)]"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                      style={{ background: "var(--surface2)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {call.caller_number ?? "Web Call"}
                      </p>
                      <p className="text-xs capitalize" style={{ color: "var(--muted-low)" }}>
                        {call.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                      {call.duration != null ? formatDuration(call.duration) : "—"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted-low)" }}>
                      {timeAgo(call.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>No calls recorded yet</p>
            </div>
          )}
        </div>

        {/* CTA banner */}
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-5"
          style={{
            background: "linear-gradient(135deg, var(--card2) 0%, var(--card) 100%)",
            border: "1px solid rgba(255,122,26,0.18)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
            style={{ background: "linear-gradient(90deg, transparent, var(--accent) 30%, var(--accent-light) 60%, transparent)" }}
          />
          <div
            className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
                Setup Wizard
              </p>
              <h3 className="font-[Outfit] text-lg font-semibold" style={{ letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                Ready to launch another agent?
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Complete the setup wizard in under 10 minutes.
              </p>
            </div>
            <Button href="/wizard">Start wizard</Button>
          </div>
        </div>
      </div>
    </>
  );
}
