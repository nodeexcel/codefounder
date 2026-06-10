"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { formatDuration } from "@/lib/format";

const PAGE_SIZE = 10;

interface CallLog {
  id: string;
  caller_number: string | null;
  duration: number | null;
  status: string;
  transcript: string | null;
  recording_url: string | null;
  created_at: string;
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

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      let query = supabase
        .from("call_logs")
        .select(
          "id, caller_number, duration, status, transcript, recording_url, created_at",
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.ilike("caller_number", `%${search.trim()}%`);
      }

      if (dateFilter) {
        const start = new Date(dateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateFilter);
        end.setHours(23, 59, 59, 999);
        query = query
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
      }

      const { data, count } = await query;
      if (!cancelled) {
        setCalls(data ?? []);
        setTotal(count ?? 0);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, search, dateFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleDateChange(val: string) {
    setDateFilter(val);
    setPage(0);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      <DashboardNavbar
        title="Call Logs"
        subtitle="All Voice Agent call history"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <p className="mb-6 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
          Call History
        </p>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search by caller name or number…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              colorScheme: "dark",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          {dateFilter && (
            <button
              onClick={() => handleDateChange("")}
              className="rounded-lg px-4 py-2.5 text-sm transition-all duration-200"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            >
              Clear
            </button>
          )}
        </div>

        {!loading && total > 0 && (
          <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
            {total} call{total !== 1 ? "s" : ""} total
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && calls.length === 0 && (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl py-20 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
              </svg>
            </div>
            <div>
              <p className="font-[Outfit] text-lg font-medium" style={{ color: "var(--foreground)" }}>No calls yet</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {search || dateFilter
                  ? "No calls match your filters."
                  : "Your Voice Agent calls will appear here."}
              </p>
            </div>
          </div>
        )}

        {/* Call list */}
        {!loading && calls.length > 0 && (
          <div className="space-y-1.5">
            {calls.map((call) => {
              const expanded = expandedId === call.id;
              return (
                <div
                  key={call.id}
                  className="overflow-hidden rounded-xl transition-all duration-200"
                  style={{
                    background: "var(--card)",
                    border: expanded
                      ? "1px solid rgba(255,122,26,0.25)"
                      : "1px solid var(--border)",
                    boxShadow: expanded ? "0 4px 20px rgba(255,122,26,0.05)" : undefined,
                  }}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => toggleExpand(call.id)}
                    className="w-full px-4 py-4 text-left transition-colors duration-150"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" style={{ color: "var(--foreground)" }}>
                          {call.caller_number ?? "Web Call"}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                          {formatDateTime(call.created_at)}
                        </p>
                      </div>

                      {call.transcript && (
                        <p className="hidden max-w-[260px] flex-1 truncate text-xs xl:block" style={{ color: "var(--muted)" }}>
                          {call.transcript.slice(0, 100)}
                        </p>
                      )}

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                          {call.duration != null ? formatDuration(call.duration) : "—"}
                        </span>
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            call.status === "ended"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400",
                          ].join(" ")}
                        >
                          {call.status}
                        </span>
                        {call.recording_url && (
                          <span
                            className="hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline"
                            style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                          >
                            Recording
                          </span>
                        )}
                        <span
                          className="text-sm transition-transform duration-300"
                          style={{
                            display: "inline-block",
                            transform: expanded ? "rotate(180deg)" : undefined,
                            color: "var(--muted)",
                          }}
                        >
                          ▾
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div
                      className="space-y-5 px-4 py-5"
                      style={{
                        borderTop: "1px solid var(--border)",
                        background: "var(--card-elevated)",
                      }}
                    >
                      {call.recording_url && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Recording
                          </p>
                          <audio
                            controls
                            src={call.recording_url}
                            className="h-10 w-full rounded-lg"
                            style={{ accentColor: "var(--accent)" }}
                          />
                        </div>
                      )}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Transcript
                        </p>
                        {call.transcript ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                            {call.transcript}
                          </p>
                        ) : (
                          <p className="text-sm" style={{ color: "var(--muted)" }}>No transcript available.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="rounded-lg px-4 py-2 text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
                onMouseEnter={(e) => { if (page > 0) (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="rounded-lg px-4 py-2 text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
                onMouseEnter={(e) => { if (page < totalPages - 1) (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
