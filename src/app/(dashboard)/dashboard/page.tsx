import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AGENTS } from "@/lib/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const activeAgents = [
  { ...AGENTS[0], status: "active" as const, callsToday: 12 },
  { ...AGENTS[3], status: "active" as const, callsToday: 0 },
];

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

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: subscription },
    { data: callLogs },
    { count: callsThisMonth },
    { data: durationRows },
    { count: leadsCount },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("call_logs")
      .select("id, caller_number, duration, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("duration")
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .or("transcript.ilike.%appointment%,transcript.ilike.%booking%"),
  ]);

  const totalSeconds = durationRows?.reduce((sum, r) => sum + (r.duration ?? 0), 0) ?? 0;
  const aiMinutes = totalSeconds / 60;
  const aiMinutesDisplay =
    aiMinutes >= 60 ? `${(aiMinutes / 60).toFixed(1)}h` : `${Math.round(aiMinutes)}m`;
  const callCount = callsThisMonth ?? 0;
  const callPct = Math.min(100, Math.round((callCount / 500) * 100));
  const minuteLimit = 20 * 60;
  const minutePct = Math.min(100, Math.round((totalSeconds / minuteLimit) * 100));

  const usageStats = [
    { label: "Calls this month", value: String(callCount), limit: "500", pct: callPct },
    { label: "AI minutes used", value: aiMinutesDisplay, limit: "20h", pct: minutePct },
    { label: "Leads captured", value: String(leadsCount ?? 0), limit: "—", pct: null },
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

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <WelcomeBanner />

        <Card padding="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">Current plan</p>
              <p className="mt-1 text-2xl font-bold text-white">{currentPlan}</p>
              <p className="mt-1 text-xs text-gray-500">
                {trialDaysRemaining > 0
                  ? `${trialDaysRemaining} trial day${trialDaysRemaining === 1 ? "" : "s"} remaining`
                  : subscription?.status
                    ? `Subscription status: ${subscription.status}`
                    : "No active subscription"}
              </p>
            </div>
            <Button href="/pricing" variant="outline">
              Manage billing
            </Button>
          </div>
        </Card>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {usageStats.map((stat) => (
            <Card key={stat.label} padding="md">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
              {stat.limit !== "—" && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#222222]">
                    <div
                      className="h-full rounded-full bg-[#f97316]"
                      style={{ width: `${stat.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {stat.pct}% of {stat.limit} plan limit
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active agents */}
          <Card padding="md">
            <CardHeader
              title="Active agents"
              description="Agents currently live on your account"
              action={
                <Button href="/agents" variant="ghost" size="sm">
                  View all
                </Button>
              }
            />
            <ul className="space-y-3">
              {activeAgents.map((agent) => (
                <li
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-[#222222] bg-black/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.icon}</span>
                    <div>
                      <p className="font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-gray-500">
                        {agent.id === "voice"
                          ? `${agent.callsToday} calls today`
                          : "Running"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    Active
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Button href="/wizard" variant="outline" size="sm" fullWidth>
                + Launch another agent
              </Button>
            </div>
          </Card>

          {/* Recent call logs */}
          <Card padding="md">
            <CardHeader
              title="Recent call logs"
              description="Latest Voice Agent activity"
            />
            {callLogs && callLogs.length > 0 ? (
              <ul className="divide-y divide-[#222222]">
                {callLogs.map((call) => (
                  <li
                    key={call.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {call.caller_number ?? "Web Call"}
                      </p>
                      <p className="text-sm text-gray-400 capitalize">{call.status}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-300">
                        {call.duration != null ? formatDuration(call.duration) : "—"}
                      </p>
                      <p className="text-gray-500">{timeAgo(call.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                No calls recorded yet.
              </p>
            )}
          </Card>
        </div>

        {/* Quick actions */}
        <Card padding="md" className="bg-gradient-to-r from-[#111111] to-[#1a1008]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Ready to launch another agent?
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Complete the setup wizard in under 10 minutes.
              </p>
            </div>
            <Button href="/wizard">Start wizard</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
