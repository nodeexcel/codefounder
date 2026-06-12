"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const ACCENT = "#F43F5E";
const ACCENT_BG = "rgba(244,63,94,0.12)";
const BAR = "linear-gradient(90deg, #F43F5E, #FB7185)";
const GRAD = "linear-gradient(135deg, rgba(244,63,94,0.09) 0%, rgba(244,63,94,0.02) 100%)";

function CreditCardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

interface PlanWidgetProps {
  plan: string;
  trialDaysRemaining: number;
  status?: string;
}

export function PlanWidget({ plan, trialDaysRemaining, status }: PlanWidgetProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const statusText =
    trialDaysRemaining > 0
      ? `${trialDaysRemaining} trial day${trialDaysRemaining === 1 ? "" : "s"} left`
      : status
        ? `Status: ${status}`
        : "No active subscription";

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
          aria-label={`Current plan: ${plan}. Click for details.`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: ACCENT_BG, color: ACCENT }}>
            <CreditCardIcon />
          </div>
          <span className="font-heading text-xl font-bold leading-none" style={{ letterSpacing: "-0.025em", color: "var(--foreground)" }}>
            {plan}
          </span>
          <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: BAR }} />
        </button>

        {/* Tooltip */}
        <div className="pointer-events-none absolute -top-9 left-1/2 z-40 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden>
          <div className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ background: "var(--tooltip-bg)", color: "var(--foreground)", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
            Current Plan
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
                  <CreditCardIcon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[2px] font-heading" style={{ color: ACCENT }}>Current Plan</p>
                  <p className="mt-0.5 font-heading text-3xl font-bold" style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}>{plan}</p>
                </div>
              </div>

              <div className="mb-4 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--muted)" }}>Billing status</span>
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>{statusText}</span>
                </div>
              </div>

              <Button href="/billing" variant="outline" size="sm" fullWidth>Manage billing</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
