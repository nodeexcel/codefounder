"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

export interface AgentSnapshotEntry {
  id: string;
  businessName: string;
  agentName: string;
  status: "Live" | "Draft" | "Not setup" | "Active";
  progressPct: number;
  metrics: string[];
  href: string;
}

export interface AgentSnapshotBlock {
  id: string;
  title: string;
  icon: string;
  accent: string;
  entries: AgentSnapshotEntry[];
}

function statusStyle(status: AgentSnapshotEntry["status"], accent: string) {
  if (status === "Live" || status === "Active") {
    return {
      color: "#10B981",
      background: "rgba(16,185,129,0.10)",
      border: "1px solid rgba(16,185,129,0.25)",
    };
  }
  if (status === "Draft") {
    return {
      color: "#F59E0B",
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.25)",
    };
  }
  return {
    color: accent,
    background: "rgba(148,163,184,0.10)",
    border: "1px solid rgba(148,163,184,0.25)",
  };
}

export function AgentSnapshotSection({ blocks }: { blocks: AgentSnapshotBlock[] }) {
  const [selectedByBlock, setSelectedByBlock] = useState<Record<string, string>>({});

  const activeEntryByBlock = useMemo(() => {
    const entries = new Map<string, AgentSnapshotEntry>();
    for (const block of blocks) {
      const selectedId = selectedByBlock[block.id];
      const selected = block.entries.find((entry) => entry.id === selectedId);
      entries.set(block.id, selected ?? block.entries[0]);
    }
    return entries;
  }, [blocks, selectedByBlock]);

  return (
    <>
      <style>{`
        @keyframes snapGlow {
          0% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.05); opacity: 0.66; }
          100% { transform: scale(1); opacity: 0.95; }
        }
      `}</style>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {blocks.map((block) => {
          const active = activeEntryByBlock.get(block.id);
          if (!active) return null;
          const badgeStyle = statusStyle(active.status, block.accent);

          const glowColor = `${block.accent}40`;

          return (
            <div key={block.id} style={{ position: "relative" }}>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: "-6%",
                  borderRadius: 12,
                  background: `radial-gradient(circle at 20% 20%, ${glowColor}, transparent 35%)`,
                  filter: "blur(22px)",
                  pointerEvents: "none",
                  zIndex: 0,
                  animation: "snapGlow 6s ease-in-out infinite",
                }}
              />

              <div
                className="rounded-xl px-4 py-3"
                style={{
                  background: "linear-gradient(135deg, var(--card2) 0%, var(--card) 100%)",
                  border: "1px solid var(--border)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden>{block.icon}</span>
                    <p className="font-heading text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {block.title}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[1px]"
                    style={badgeStyle}
                  >
                    {active.status}
                  </span>
                </div>

                {block.entries.length > 1 && (
                  <select
                    value={active.id}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedByBlock((prev) => ({ ...prev, [block.id]: value }));
                    }}
                    className="mt-2 w-full rounded-md px-2 py-1.5 text-xs"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border2)",
                      color: "var(--foreground)",
                    }}
                    aria-label={`${block.title} entry switcher`}
                  >
                    {block.entries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.businessName}
                      </option>
                    ))}
                  </select>
                )}

                <p className="mt-2 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  {active.businessName}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                  {active.agentName}
                </p>

                <div className="mt-2 space-y-1">
                  {active.metrics.map((metric, idx) => (
                    <p key={`${active.id}-${idx}`} className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {metric}
                    </p>
                  ))}
                </div>

                <div className="mt-3 overflow-hidden rounded-full" style={{ height: "5px", background: "var(--surface2)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${active.progressPct}%`,
                      background: `linear-gradient(90deg, ${block.accent}, color-mix(in oklab, ${block.accent} 50%, white 50%))`,
                    }}
                  />
                </div>

                <div className="mt-3">
                  <Button href={active.href} variant="outline" size="xs" fullWidth>
                    Open
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
