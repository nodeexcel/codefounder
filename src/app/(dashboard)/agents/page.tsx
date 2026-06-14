import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/Button";
import { AGENTS, type AgentType } from "@/lib/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BusinessDetails, VoiceSettings } from "@/lib/types/wizard";
import { timeAgo } from "@/lib/format";

const AVAILABLE: Set<AgentType> = new Set(["voice"]);

export default async function AgentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";

  const [{ data: sessions }, { count: totalCalls }, { data: lastCall }] =
    await Promise.all([
      supabase
        .from("agent_wizard_sessions")
        .select("agent_type, status, business_details, voice_settings")
        .eq("user_id", userId),
      supabase
        .from("call_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("call_logs")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const sessionMap = new Map(
    (sessions ?? []).map((s) => [s.agent_type as AgentType, s]),
  );

  const accentColors: Record<AgentType, string[]> = {
    voice: [
      "rgba(255,160,100,0.22)",
      "rgba(255,210,170,0.12)",
    ],
    hr: [
      "rgba(52,211,153,0.18)",
      "rgba(16,185,129,0.10)",
    ],
    marketing: [
      "rgba(124,58,237,0.18)",
      "rgba(168,85,247,0.10)",
    ],
    crm: [
      "rgba(59,130,246,0.16)",
      "rgba(96,165,250,0.10)",
    ],
  };

  const overlayOpacity: Record<AgentType, number> = {
    voice: 0.10,
    hr: 0.14,
    marketing: 0.12,
    crm: 0.10,
  };

  return (
    <>
      <DashboardNavbar
        title="Agents"
        subtitle="Manage and configure your AI agents"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <style>{`
          @keyframes agentGlow { 0% { transform: scale(1); opacity: .95 } 50% { transform: scale(1.04); opacity: .6 } 100% { transform: scale(1); opacity: .95 } }
          @keyframes radialPulse { 0% { transform: scale(1); opacity: .85 } 50% { transform: scale(1.07); opacity: .45 } 100% { transform: scale(1); opacity: .85 } }

          /* Light-mode specific overlays (so cards look distinct on bright backgrounds) */
          [data-theme="light"] .agents-grid .agent-overlay { background: radial-gradient(circle at 22% 28%, rgba(250,244,236,0.9) 0%, transparent 36%) !important; mix-blend-mode: normal !important; filter: blur(18px) !important; opacity: 0.7 !important; }
          [data-theme="light"] .agents-grid .agent-overlay.second { background: radial-gradient(circle at 76% 72%, rgba(245,247,250,0.85) 0%, transparent 28%) !important; }
          [data-theme="light"] .agents-grid .agent-inner-overlay { background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 30%) !important; mix-blend-mode: normal !important; opacity: 0.5 !important; }
          [data-theme="light"] .agents-grid .agent-card { box-shadow: 0 10px 30px rgba(15,23,42,0.06) !important; border: 1px solid rgba(12,18,31,0.04) !important; }
        `}</style>
        <div className="mb-6 flex items-center justify-between">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
            All Agents
          </p>
          <Button href="/wizard?new=true" variant="primary" size="sm">
            + New agent
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 agents-grid">
          {AGENTS.filter((agent) => agent.id === "voice").map((agent) => {
            const session = sessionMap.get(agent.id);
            const isLive = session?.status === "live";
            const isAvailable = AVAILABLE.has(agent.id);
            const isComingSoon = !isAvailable;

            const business = (session?.business_details ?? {}) as Partial<BusinessDetails>;
            const voice = (session?.voice_settings ?? {}) as Partial<VoiceSettings>;

            return (
              <div key={agent.id} style={{ position: "relative" }}>
                <div className="agent-overlay" aria-hidden style={{
                    position: "absolute",
                    inset: "-6%",
                    borderRadius: 20,
                    background: `radial-gradient(circle at 22% 28%, ${accentColors[agent.id][0]} 0%, transparent 36%), radial-gradient(circle at 76% 72%, ${accentColors[agent.id][1]} 0%, transparent 28%)`,
                    filter: "blur(26px)",
                    pointerEvents: "none",
                    zIndex: 0,
                    animation: "agentGlow 7s ease-in-out infinite",
                    opacity: overlayOpacity[agent.id] ?? 0.12,
                  }} />

                <div
                  className={[
                    "group overflow-hidden rounded-2xl p-7 transition-all duration-300 agent-card",
                    isComingSoon ? "opacity-60" : "hover:-translate-y-0.5",
                  ].join(" ")}
                  style={{
                    background: "var(--card)",
                    border: isLive
                      ? "1px solid rgba(255,122,26,0.22)"
                      : "1px solid var(--border)",
                    boxShadow: isLive ? "0 0 40px rgba(255,122,26,0.05)" : undefined,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    className="agent-inner-overlay"
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 12,
                      background: `radial-gradient(circle at 30% 30%, ${accentColors[agent.id][0]} 0%, transparent 30%), radial-gradient(circle at 70% 70%, ${accentColors[agent.id][1]} 0%, transparent 25%)`,
                      mixBlendMode: "screen",
                      pointerEvents: "none",
                      zIndex: 0,
                      transformOrigin: "center",
                      animation: "radialPulse 8s ease-in-out infinite",
                      opacity: overlayOpacity[agent.id] ?? 0.12,
                    }}
                  />
                  <div className="relative z-10 space-y-5">
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)",
                        opacity: isLive ? 0.6 : 0,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: "linear-gradient(90deg, var(--accent)/50, var(--accent-light)/25, transparent)" }}
                    />

                    {isLive && (
                      <div
                        className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10"
                        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
                      />
                    )}

                    {/* Header */}
                    <div className="relative flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: isLive ? "var(--accent-glow)" : "var(--surface2)",
                      }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                          {agent.name}
                        </h3>
                        {isComingSoon ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              background: "var(--surface2)",
                              color: "var(--muted)",
                              border: "1px solid var(--border2)",
                            }}
                          >
                            Soon
                          </span>
                        ) : isLive ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              background: "var(--surface2)",
                              color: "var(--muted)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            Not set up
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                        {agent.description}
                      </p>
                    </div>
                    </div>

                    {/* Live stats */}
                    {isLive && (
                      <div
                        className="rounded-2xl px-4 py-4 transition-colors duration-300 group-hover:bg-[var(--surface2)]"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <dl className="space-y-2 text-sm">
                          {business.businessName && (
                            <div className="flex justify-between gap-4">
                              <dt style={{ color: "var(--muted)" }}>Business</dt>
                              <dd className="truncate text-right font-medium" style={{ color: "var(--foreground)" }}>{business.businessName}</dd>
                            </div>
                          )}
                          {voice.agentName && (
                            <div className="flex justify-between gap-4">
                              <dt style={{ color: "var(--muted)" }}>Agent</dt>
                              <dd className="font-medium" style={{ color: "var(--foreground)" }}>{voice.agentName}</dd>
                            </div>
                          )}
                          {voice.tone && (
                            <div className="flex justify-between gap-4">
                              <dt style={{ color: "var(--muted)" }}>Tone</dt>
                              <dd className="font-medium" style={{ color: "var(--foreground)" }}>{voice.tone}</dd>
                            </div>
                          )}
                          {agent.id === "voice" && (
                            <>
                              <div className="my-1.5" style={{ borderTop: "1px solid var(--border)" }} />
                              <div className="flex justify-between gap-4">
                                <dt style={{ color: "var(--muted)" }}>Total calls</dt>
                                <dd className="font-semibold" style={{ color: "var(--accent)" }}>{totalCalls ?? 0}</dd>
                              </div>
                              {lastCall?.created_at && (
                                <div className="flex justify-between gap-4">
                                  <dt style={{ color: "var(--muted)" }}>Last call</dt>
                                  <dd className="font-medium" style={{ color: "var(--foreground)" }}>{timeAgo(lastCall.created_at)}</dd>
                                </div>
                              )}
                            </>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* Feature chips */}
                    <ul className="flex flex-wrap gap-2">
                      {agent.features.map((feature) => (
                        <li
                          key={feature}
                          className="rounded-full px-3 py-1 text-xs transition-colors duration-300 group-hover:border-[var(--accent)]/20"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            color: "var(--muted)",
                          }}
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2.5">
                      {isComingSoon ? (
                        <Button variant="secondary" size="md" disabled>
                          Coming Soon
                        </Button>
                      ) : isLive ? (
                        <>
                          <Button href={`/wizard?agent=${agent.id}&reconfigure=true`} variant="outline" size="md">
                            Reconfigure
                          </Button>
                          {agent.id === "voice" && (
                            <Button href="/calls" variant="ghost" size="md">
                              Call logs
                            </Button>
                          )}
                          {agent.id === "hr" && (
                            <Button href="/hr" variant="ghost" size="md">
                              HR Dashboard
                            </Button>
                          )}
                          {agent.id === "marketing" && (
                            <Button href="/marketing" variant="ghost" size="md">
                              Marketing Dashboard
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button href={`/wizard?agent=${agent.id}`} variant="primary" size="md">
                          Set up →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
