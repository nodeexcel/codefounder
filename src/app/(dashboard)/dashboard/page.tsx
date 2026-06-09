import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AGENTS, type AgentType } from "@/lib/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C]">
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

  const trialDaysRemaining = subscription?.created_at
    ? Math.max(
        0,
        14 -
          Math.floor(
            (Date.now() - new Date(subscription.created_at).getTime()) /
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

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <WelcomeBanner />

        {/* Plan card */}
        <div>
          <SectionLabel>Current Plan</SectionLabel>
          <div
            className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#E87B2C]/5"
            style={{
              background: "#1e1e1e",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/40 via-[#f59e0b]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[#888]">Subscription</p>
                <p className="mt-1 font-[Outfit] text-2xl font-bold text-white">{currentPlan}</p>
                <p className="mt-1 text-xs text-[#888]">
                  {trialDaysRemaining > 0
                    ? `${trialDaysRemaining} trial day${trialDaysRemaining === 1 ? "" : "s"} remaining`
                    : subscription?.status
                      ? `Status: ${subscription.status}`
                      : "No active subscription"}
                </p>
              </div>
              <Button href="/pricing" variant="outline">
                Manage billing
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <SectionLabel>Usage Overview</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-3">
            {usageStats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#E87B2C]/5"
                style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/50 via-[#f59e0b]/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-start justify-between">
                  <p className="text-sm text-[#888]">{stat.label}</p>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: "rgba(232, 123, 44, 0.1)",
                      color: "#E87B2C",
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
                <p className="mt-3 font-[Outfit] text-3xl font-bold text-white">{stat.value}</p>
                {stat.limit !== "—" && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stat.pct}%`,
                          background: "linear-gradient(90deg, #E87B2C, #f59e0b)",
                          boxShadow: "0 0 8px rgba(232, 123, 44, 0.4)",
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[#888]">
                      {stat.pct}% of {stat.limit} plan limit
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active agents */}
          <div
            className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300"
            style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <CardHeader
              label="Live Agents"
              title="Active agents"
              description="Agents currently running on your account"
              action={
                <Button href="/agents" variant="ghost" size="sm">
                  View all
                </Button>
              }
            />
            {activeAgents.length > 0 ? (
              <ul className="space-y-2">
                {activeAgents.map((agent) => (
                  <li
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg px-4 py-3 transition-all duration-200"
                    style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.icon}</span>
                      <div>
                        <p className="font-[Outfit] font-medium text-white">{agent.name}</p>
                        <p className="text-xs text-[#888]">Live</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      Active
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                  style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
                >
                  ◎
                </div>
                <p className="text-sm text-[#888]">No active agents yet.</p>
              </div>
            )}
            <div className="mt-4">
              <Button href="/wizard" variant="outline" size="sm" fullWidth>
                + Launch another agent
              </Button>
            </div>
          </div>

          {/* Recent call logs */}
          <div
            className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300"
            style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <CardHeader
              label="Voice Agent"
              title="Recent call logs"
              description="Latest Voice Agent activity"
            />
            {callLogs && callLogs.length > 0 ? (
              <ul>
                {callLogs.map((call, i) => (
                  <li
                    key={call.id}
                    className="flex items-center justify-between py-3 transition-colors duration-150"
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                    }}
                  >
                    <div>
                      <p className="font-medium text-white">
                        {call.caller_number ?? "Web Call"}
                      </p>
                      <p className="text-sm capitalize text-[#888]">{call.status}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-[#AAAAAA]">
                        {call.duration != null ? formatDuration(call.duration) : "—"}
                      </p>
                      <p className="text-[#888]">{timeAgo(call.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                  style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
                >
                  ☏
                </div>
                <p className="text-sm text-[#888]">No calls recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA banner */}
        <div
          className="relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#E87B2C]/5"
          style={{
            background: "linear-gradient(135deg, #1e1e1e 0%, #1f1508 60%, #1e1e1e 100%)",
            border: "1px solid rgba(232, 123, 44, 0.2)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
            style={{ background: "linear-gradient(90deg, #E87B2C, #f59e0b, transparent)" }}
          />
          <div
            className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(232,123,44,0.8) 0%, transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C]">
                Setup Wizard
              </p>
              <h3 className="font-[Outfit] text-lg font-semibold text-white">
                Ready to launch another agent?
              </h3>
              <p className="mt-1 text-sm text-[#AAAAAA]">
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
