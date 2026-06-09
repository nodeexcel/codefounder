import { createClient } from "@supabase/supabase-js";
import { PLAN_MRR } from "@/lib/plans";
import { timeAgo, formatDuration } from "@/lib/format";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
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
      <header
        className="sticky top-0 z-40 flex min-h-[60px] items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-8"
        style={{
          background: "rgba(10, 10, 10, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div>
          <h1
            className="text-base font-semibold text-white sm:text-lg font-[Outfit]"
            style={{ letterSpacing: "-0.015em" }}
          >
            Admin Overview
          </h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Platform-wide metrics
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold font-[Outfit]"
          style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
        >
          Admin
        </span>
      </header>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Stat cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300"
              style={{
                background: stat.highlight ? "rgba(232,123,44,0.05)" : "#161616",
                border: stat.highlight ? "1px solid rgba(232,123,44,0.2)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {stat.highlight && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
                  style={{ background: "linear-gradient(90deg, transparent, #E87B2C, transparent)" }}
                />
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium font-[Outfit]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {stat.label}
                </p>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                  style={{
                    background: stat.highlight ? "rgba(232,123,44,0.1)" : "rgba(255,255,255,0.05)",
                    color: stat.highlight ? "#E87B2C" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {stat.icon}
                </span>
              </div>
              <p
                className="mt-3 font-[Outfit] text-3xl font-bold"
                style={{ color: stat.highlight ? "#E87B2C" : "white", letterSpacing: "-0.02em" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Two-column tables */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Recent signups */}
          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <h2 className="font-semibold text-white font-[Outfit]">Recent Signups</h2>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Latest user registrations
              </p>
            </div>
            {recentSignups && recentSignups.length > 0 ? (
              <ul>
                {recentSignups.map((u, i) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                    style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {u.full_name || "—"}
                      </p>
                      <p className="truncate text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {u.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {timeAgo(u.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                No users yet.
              </p>
            )}
            <div
              className="px-5 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <a
                href="/admin/users"
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: "#E87B2C" }}
              >
                View all users →
              </a>
            </div>
          </div>

          {/* Recent calls */}
          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <h2 className="font-semibold text-white font-[Outfit]">Recent Calls</h2>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Latest Voice Agent activity
              </p>
            </div>
            {recentCalls && recentCalls.length > 0 ? (
              <ul>
                {recentCalls.map((call, i) => (
                  <li
                    key={call.id}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                    style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {call.caller_number ?? "Web Call"}
                      </p>
                      <span
                        className={[
                          "mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          call.status === "ended"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-yellow-500/10 text-yellow-400",
                        ].join(" ")}
                      >
                        {call.status}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {formatDuration(call.duration)}
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {timeAgo(call.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                No calls yet.
              </p>
            )}
          </div>
        </div>

        {/* Subscription breakdown */}
        {subscriptions && subscriptions.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h2 className="mb-4 font-semibold text-white font-[Outfit]">
              Subscription Breakdown
            </h2>
            <div className="flex flex-wrap gap-3">
              {(["starter", "growth", "pro"] as const).map((plan) => {
                const count = subscriptions.filter((s) => s.plan === plan).length;
                return (
                  <div
                    key={plan}
                    className="flex-1 rounded-xl px-4 py-3 text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="capitalize text-xs font-medium font-[Outfit]" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {plan}
                    </p>
                    <p className="mt-1.5 text-2xl font-bold text-white font-[Outfit]">{count}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
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
