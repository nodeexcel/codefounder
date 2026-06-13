"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase";
import { DashboardNavbar } from "@/components/dashboard/Navbar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CallLog {
  id: string;
  caller_number: string | null;
  duration: number | null;
  status: string;
  transcript: string | null;
  created_at: string;
}

interface SummaryStats {
  totalCalls: number;
  totalMinutes: number;
  appointmentsBooked: number;
  avgDurationSeconds: number;
}

interface DailyCount {
  date: string;   // "Jun 1"
  calls: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDurationMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function buildDailyBuckets(calls: CallLog[]): DailyCount[] {
  const now = new Date();
  const buckets: Record<string, number> = {};

  // Build 30 ordered date keys
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }

  for (const call of calls) {
    const key = call.created_at.slice(0, 10);
    if (key in buckets) buckets[key] = (buckets[key] ?? 0) + 1;
  }

  return Object.entries(buckets).map(([iso, count]) => ({
    date: shortDate(iso),
    calls: count,
  }));
}

function toCSV(calls: CallLog[]): string {
  const header = ["ID", "Caller Number", "Duration (s)", "Status", "Created At"];
  const rows = calls.map((c) => [
    c.id,
    c.caller_number ?? "",
    c.duration ?? "",
    c.status,
    c.created_at,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: "var(--card-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
      />
      <p className="text-xs font-semibold uppercase tracking-[2.5px]" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-bold tracking-tight"
        style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs" style={{ color: "var(--muted-low)" }}>{sub}</p>}
    </div>
  );
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-lg"
      style={{ background: "var(--card-elevated)", border: "1px solid var(--border2)", color: "var(--foreground)" }}
    >
      <p className="font-semibold" style={{ color: "var(--accent)" }}>{label}</p>
      <p>{payload[0]?.value ?? 0} call{(payload[0]?.value ?? 0) !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AnalyticsPage() {
  const [allCalls, setAllCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch all call logs for this user (RLS ensures user_id filter, but explicit for clarity)
      const { data } = await supabase
        .from("call_logs")
        .select("id, caller_number, duration, status, transcript, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setAllCalls((data as CallLog[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo<SummaryStats>(() => {
    const totalCalls = allCalls.length;
    const totalSecs = allCalls.reduce((s, c) => s + (c.duration ?? 0), 0);
    const totalMinutes = Math.round(totalSecs / 60);
    const appointmentsBooked = allCalls.filter(
      (c) => c.transcript?.toLowerCase().includes("appointment")
    ).length;
    const avgDurationSeconds = totalCalls > 0 ? totalSecs / totalCalls : 0;
    return { totalCalls, totalMinutes, appointmentsBooked, avgDurationSeconds };
  }, [allCalls]);

  // Last 30 days for chart
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const chartData = useMemo(() => {
    const recent = allCalls.filter((c) => new Date(c.created_at) >= thirtyDaysAgo);
    return buildDailyBuckets(recent);
  }, [allCalls, thirtyDaysAgo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allCalls.length / PAGE_SIZE));
  const pageCalls = allCalls.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleExportCSV() {
    const csv = toCSV(allCalls);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calls-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar title="Analytics" />
        <div className="flex min-h-[50vh] items-center justify-center gap-3" style={{ color: "var(--muted)" }}>
          <div
            className="h-6 w-6 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          Loading analytics…
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar title="Analytics" />

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <section className="flex items-center justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[3px]"
              style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}
            >
              Overview
            </p>
            <h2
              className="mt-1 text-2xl font-bold tracking-[-0.03em]"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}
            >
              Analytics
            </h2>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={allCalls.length === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
            onMouseEnter={(e) => { if (allCalls.length > 0) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </section>

        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Calls" value={stats.totalCalls.toLocaleString()} />
          <StatCard label="Total Minutes" value={stats.totalMinutes.toLocaleString()} sub="of call time" />
          <StatCard label="Appointments" value={stats.appointmentsBooked} sub="detected from transcripts" />
          <StatCard
            label="Avg Duration"
            value={stats.totalCalls > 0 ? formatDurationMMSS(stats.avgDurationSeconds) : "—"}
            sub="minutes:seconds"
          />
        </section>

        {/* Bar Chart */}
        <section className="overflow-hidden p-5 sm:p-6" style={cardStyle}>
          <div className="mb-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-[3px]"
              style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}
            >
              Activity
            </p>
            <p className="mt-1 text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Calls — last 30 days
            </p>
          </div>
          {allCalls.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
              No call data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-sans)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-sans)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,122,26,0.06)" }} />
                <Bar
                  dataKey="calls"
                  fill="#E87B2C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Recent Calls Table */}
        <section className="overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[3px]"
                style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}
              >
                Calls
              </p>
              <p className="mt-0.5 text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Recent calls
              </p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
            >
              {allCalls.length} total
            </span>
          </div>

          {allCalls.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
              No calls recorded yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Caller", "Duration", "Status", "Date"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[2px]"
                          style={{ color: "var(--muted)", fontFamily: "var(--font-heading)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageCalls.map((call, i) => (
                      <tr
                        key={call.id}
                        style={{
                          borderBottom: i < pageCalls.length - 1 ? "1px solid var(--border)" : undefined,
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        }}
                      >
                        <td className="px-5 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                          {call.caller_number ?? <span style={{ color: "var(--muted-low)" }}>Unknown</span>}
                        </td>
                        <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                          {call.duration != null ? formatDurationMMSS(call.duration) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                            style={
                              call.status === "completed"
                                ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                                : call.status === "missed" || call.status === "failed"
                                ? { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
                                : { background: "var(--surface2)", color: "var(--muted)" }
                            }
                          >
                            {call.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>
                          {formatDateTime(call.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-30"
                      style={{ background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--muted)" }}
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-30"
                      style={{ background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--muted)" }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
