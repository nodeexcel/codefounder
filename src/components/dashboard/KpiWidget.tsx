"use client";

import { useEffect, useState } from "react";

interface KpiWidgetProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  limit: string;
  pct: number | null;
  gradient: string;
  accentBg: string;
  accentColor: string;
  barGradient: string;
}

export function KpiWidget({
  icon,
  value,
  label,
  limit,
  pct,
  gradient,
  accentBg,
  accentColor,
  barGradient,
}: KpiWidgetProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Widget + tooltip wrapper */}
      <div className="group relative">
        <button
          onClick={() => setOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-5 py-3.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: `${gradient}, var(--card)`,
            border: "1px solid var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
            minWidth: "80px",
            cursor: "pointer",
          }}
          aria-label={`${label}: ${value}. Click for details.`}
        >
          {/* Icon */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: accentBg, color: accentColor }}
          >
            {icon}
          </div>

          {/* Value */}
          <span
            className="font-heading text-xl font-bold leading-none"
            style={{ letterSpacing: "-0.025em", color: "var(--foreground)" }}
          >
            {value}
          </span>

          {/* Bottom progress stripe */}
          {pct !== null && (
            <div
              className="absolute inset-x-0 bottom-0 h-[3px]"
              style={{ background: "var(--surface2)" }}
            >
              <div
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: barGradient,
                  transition: "width 700ms ease-out",
                }}
              />
            </div>
          )}
        </button>

        {/* Tooltip */}
        <div
          className="pointer-events-none absolute -top-9 left-1/2 z-40 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          aria-hidden
        >
          <div
            className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
            style={{
              background: "var(--tooltip-bg)",
              color: "var(--foreground)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            {label}
          </div>
          <div
            className="mx-auto h-2 w-2 -translate-y-px rotate-45"
            style={{ background: "var(--tooltip-bg)" }}
          />
        </div>
      </div>

      {/* Detail modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div
              className="h-[3px] w-full"
              style={{ background: barGradient }}
            />

            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-[var(--surface2)]"
                style={{ color: "var(--muted)" }}
                aria-label="Close"
              >
                ×
              </button>

              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: accentBg, color: accentColor }}
                >
                  <span style={{ transform: "scale(1.25)", display: "flex" }}>{icon}</span>
                </div>
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[2px] font-heading"
                    style={{ color: accentColor }}
                  >
                    {label}
                  </p>
                  <p
                    className="mt-0.5 font-heading text-3xl font-bold"
                    style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
                  >
                    {value}
                  </p>
                </div>
              </div>

              {/* Usage detail */}
              {limit !== "—" && pct !== null ? (
                <div className="space-y-3">
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                        Monthly usage
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                        {value}{" "}
                        <span style={{ color: "var(--muted-low)" }}>/ {limit}</span>
                      </span>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full"
                      style={{ background: "var(--surface2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: barGradient,
                          transition: "width 700ms ease-out",
                        }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px]" style={{ color: "var(--muted-low)" }}>
                      <span>{pct}% used</span>
                      <span>{100 - pct}% remaining</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted-low)" }}>
                    Usage resets at the start of each billing period.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    No usage limit applied to this metric.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
