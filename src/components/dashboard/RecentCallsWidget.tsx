"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDuration, timeAgo } from "@/lib/format";

const ACCENT = "#F59E0B";
const ACCENT_BG = "rgba(245,158,11,0.12)";
const BAR = "linear-gradient(90deg, #F59E0B, #FCD34D)";
const GRAD = "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.02) 100%)";

function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  );
}

interface CallLog {
  id: string;
  caller_number: string | null;
  duration: number | null;
  status: string;
  created_at: string;
}

interface RecentCallsWidgetProps {
  calls: CallLog[];
}

export function RecentCallsWidget({ calls }: RecentCallsWidgetProps) {
  const [open, setOpen] = useState(false);
  const count = calls.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="group relative">
        <button
          onClick={() => setOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-5 py-3.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: `${GRAD}, var(--card)`,
            border: "1px solid var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
            minWidth: "80px",
            cursor: "pointer",
          }}
          aria-label={`Recent calls: ${count}. Click for details.`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: ACCENT_BG, color: ACCENT }}>
            <PhoneIcon />
          </div>
          <span className="font-heading text-xl font-bold leading-none" style={{ letterSpacing: "-0.025em", color: "var(--foreground)" }}>
            {count}
          </span>
          {count > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: BAR }} />
          )}
        </button>

        {/* Tooltip */}
        <div className="pointer-events-none absolute -top-9 left-1/2 z-40 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden>
          <div className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ background: "var(--tooltip-bg)", color: "var(--foreground)", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
            Recent Calls
          </div>
          <div className="mx-auto h-2 w-2 -translate-y-px rotate-45" style={{ background: "var(--tooltip-bg)" }} />
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] w-full" style={{ background: BAR }} />
            <div className="p-6">
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-[var(--surface2)]" style={{ color: "var(--muted)" }} aria-label="Close">×</button>

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: ACCENT_BG, color: ACCENT }}>
                  <PhoneIcon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[2px] font-heading" style={{ color: ACCENT }}>Recent Calls</p>
                  <p className="mt-0.5 font-heading text-3xl font-bold" style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}>{count}</p>
                </div>
              </div>

              {count > 0 ? (
                <div className="mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
                  {calls.map((call, i) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-[var(--surface)]"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--surface2)", color: "var(--muted)" }}>
                          <PhoneIcon size={12} />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            {call.caller_number ?? "Web Call"}
                          </p>
                          <p className="text-xs capitalize" style={{ color: "var(--muted-low)" }}>{call.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                          {call.duration != null ? formatDuration(call.duration) : "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted-low)" }}>{timeAgo(call.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>No calls recorded yet.</p>
                </div>
              )}

              <Button href="/calls" variant="outline" size="sm" fullWidth>View all calls</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
