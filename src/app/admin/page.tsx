import { createClient } from "@supabase/supabase-js";

const PLAN_MRR: Record<string, number> = {
  starter: 29,
  growth: 79,
  pro: 199,
};

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function AdminDashboardPage() {
  const db = adminSupabase();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: activeAgents },
    { count: callsThisMonth },
    { data: subscriptions },
    { data: recentSignups },
    { data: recentCalls },
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("agent_wizard_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "live"),
    db
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    db.from("subscriptions").select("plan, status"),
    db
      .from("profiles")
      .select("id, full_name, email, username, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("call_logs")
      .select("id, caller_number, duration, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // Compute MRR from active subscriptions
  const mrr = (subscriptions ?? [])
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => sum + (PLAN_MRR[s.plan] ?? 0), 0);

  const stats = [
    { label: "Total Users", value: String(totalUsers ?? 0), icon: "◎" },
    { label: "Active Agents", value: String(activeAgents ?? 0), icon: "✦" },
    {
      label: "Calls This Month",
      value: String(callsThisMonth ?? 0),
      icon: "☏",
    },
    {
      label: "Est. MRR",
      value: `$${mrr.toLocaleString()}`,
      icon: "◈",
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#222222] bg-black/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            Admin Overview
          </h1>
          <p className="text-xs text-gray-500">
            Platform-wide metrics
          </p>
        </div>
        <span className="rounded-full bg-[#f97316]/10 px-3 py-1 text-xs font-semibold text-[#f97316]">
          Admin
        </span>
      </header>

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={[
                "rounded-xl border p-5",
                stat.highlight
                  ? "border-[#f97316]/30 bg-[#f97316]/5"
                  : "border-[#222222] bg-[#111111]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{stat.label}</p>
                <span className="text-lg text-gray-600">{stat.icon}</span>
              </div>
              <p
                className={[
                  "mt-2 text-3xl font-bold",
                  stat.highlight ? "text-[#f97316]" : "text-white",
                ].join(" ")}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Two-column tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent signups */}
          <div className="rounded-xl border border-[#222222] bg-[#111111]">
            <div className="border-b border-[#222222] px-5 py-4">
              <h2 className="font-semibold text-white">Recent Signups</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Latest user registrations
              </p>
            </div>
            {recentSignups && recentSignups.length > 0 ? (
              <ul className="divide-y divide-[#1a1a1a]">
                {recentSignups.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {u.full_name || "—"}
                      </p>
                      <p className="truncate text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {timeAgo(u.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No users yet.
              </p>
            )}
            <div className="border-t border-[#222222] px-5 py-3">
              <a
                href="/admin/users"
                className="text-xs font-medium text-[#f97316] hover:underline"
              >
                View all users →
              </a>
            </div>
          </div>

          {/* Recent calls */}
          <div className="rounded-xl border border-[#222222] bg-[#111111]">
            <div className="border-b border-[#222222] px-5 py-4">
              <h2 className="font-semibold text-white">Recent Calls</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Latest Voice Agent activity
              </p>
            </div>
            {recentCalls && recentCalls.length > 0 ? (
              <ul className="divide-y divide-[#1a1a1a]">
                {recentCalls.map((call) => (
                  <li
                    key={call.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {call.caller_number ?? "Web Call"}
                      </p>
                      <span
                        className={[
                          "mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          call.status === "ended"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400",
                        ].join(" ")}
                      >
                        {call.status}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-gray-300">
                        {formatDuration(call.duration)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {timeAgo(call.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No calls yet.
              </p>
            )}
          </div>
        </div>

        {/* Subscription breakdown */}
        {subscriptions && subscriptions.length > 0 && (
          <div className="rounded-xl border border-[#222222] bg-[#111111] p-5">
            <h2 className="mb-4 font-semibold text-white">
              Subscription Breakdown
            </h2>
            <div className="flex flex-wrap gap-4">
              {(["starter", "growth", "pro"] as const).map((plan) => {
                const count = subscriptions.filter(
                  (s) => s.plan === plan,
                ).length;
                return (
                  <div
                    key={plan}
                    className="flex-1 rounded-lg border border-[#222222] bg-black/40 px-4 py-3 text-center"
                  >
                    <p className="capitalize text-sm text-gray-400">{plan}</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {count}
                    </p>
                    <p className="text-xs text-gray-600">
                      ${PLAN_MRR[plan]}/mo each
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
