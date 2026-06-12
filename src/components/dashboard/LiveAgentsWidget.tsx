"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const ACCENT = "#6366F1";
const ACCENT_BG = "rgba(99,102,241,0.12)";
const BAR = "linear-gradient(90deg, #6366F1, #818CF8)";
const GRAD = "linear-gradient(135deg, rgba(99,102,241,0.09) 0%, rgba(99,102,241,0.02) 100%)";

function ActivityIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

interface Agent {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface LiveAgentsWidgetProps {
  agents: Agent[];
}

export function LiveAgentsWidget({ agents }: LiveAgentsWidgetProps) {
  const [open, setOpen] = useState(false);
  const count = agents.length;

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
          aria-label={`Live agents: ${count}. Click for details.`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: ACCENT_BG, color: ACCENT }}>
            <ActivityIcon />
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
            Live Agents
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
                  <ActivityIcon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[2px] font-heading" style={{ color: ACCENT }}>Live Agents</p>
                  <p className="mt-0.5 font-heading text-3xl font-bold" style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}>{count}</p>
                </div>
              </div>

              {count > 0 ? (
                <ul className="mb-4 space-y-1.5">
                  {agents.map((agent) => (
                    <li
                      key={agent.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{agent.icon}</span>
                        <div>
                          <p className="font-heading text-sm font-medium" style={{ color: "var(--foreground)" }}>{agent.name}</p>
                          <p className="text-xs" style={{ color: "var(--muted-low)" }}>Voice Agent</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Live
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mb-4 rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>No active agents yet.</p>
                </div>
              )}

              <Button href="/wizard" variant="outline" size="sm" fullWidth>Launch an agent</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
