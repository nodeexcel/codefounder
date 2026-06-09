import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/Button";
import { AGENTS, type AgentType } from "@/lib/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BusinessDetails, VoiceSettings } from "@/lib/types/wizard";

const AVAILABLE: Set<AgentType> = new Set(["voice"]);

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

  return (
    <>
      <DashboardNavbar
        title="Agents"
        subtitle="Manage and configure your AI agents"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <p className="mb-6 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C]">
          All Agents
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {AGENTS.map((agent) => {
            const session = sessionMap.get(agent.id);
            const isLive = session?.status === "live";
            const isAvailable = AVAILABLE.has(agent.id);
            const isComingSoon = !isAvailable;

            const business = (session?.business_details ?? {}) as Partial<BusinessDetails>;
            const voice = (session?.voice_settings ?? {}) as Partial<VoiceSettings>;

            return (
              <div
                key={agent.id}
                className={[
                  "group relative overflow-hidden rounded-xl p-8 transition-all duration-300",
                  isComingSoon ? "opacity-70" : "hover:-translate-y-0.5",
                ].join(" ")}
                style={{
                  background: "#1e1e1e",
                  border: isLive
                    ? "1px solid rgba(232,123,44,0.3)"
                    : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: isLive ? "0 0 30px rgba(232, 123, 44, 0.06)" : undefined,
                }}
              >
                {/* Top accent line */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/60 via-[#f59e0b]/30 to-transparent transition-opacity duration-300"
                  style={{ opacity: isLive ? 0.8 : 0 }}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/60 via-[#f59e0b]/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Live ambient glow */}
                {isLive && (
                  <div
                    className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-15"
                    style={{ background: "radial-gradient(circle, rgba(232,123,44,0.8) 0%, transparent 70%)" }}
                  />
                )}

                {/* Header */}
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl transition-all duration-300 group-hover:scale-105"
                      style={{
                        background: isLive ? "rgba(232,123,44,0.12)" : "rgba(255,255,255,0.05)",
                        boxShadow: isLive ? "0 0 16px rgba(232,123,44,0.15)" : undefined,
                      }}
                    >
                      {agent.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-[Outfit] text-xl font-semibold text-white">
                          {agent.name}
                        </h3>
                        {isComingSoon ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-[#888]"
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            Coming Soon
                          </span>
                        ) : isLive ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-[#888]"
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            Not configured
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#AAAAAA]">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live agent details */}
                {isLive && (
                  <div
                    className="mt-5 rounded-lg px-4 py-3"
                    style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <dl className="space-y-1.5 text-sm">
                      {business.businessName && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#888]">Business</dt>
                          <dd className="truncate text-right font-medium text-white">
                            {business.businessName}
                          </dd>
                        </div>
                      )}
                      {business.phone && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#888]">Phone</dt>
                          <dd className="font-medium text-white">{business.phone}</dd>
                        </div>
                      )}
                      {voice.agentName && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#888]">Agent name</dt>
                          <dd className="font-medium text-white">{voice.agentName}</dd>
                        </div>
                      )}
                      {voice.tone && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#888]">Voice tone</dt>
                          <dd className="font-medium text-white">{voice.tone}</dd>
                        </div>
                      )}
                      {agent.id === "voice" && (
                        <>
                          <div
                            className="my-1"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                          />
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#888]">Total calls</dt>
                            <dd className="font-medium text-[#E87B2C]">{totalCalls ?? 0}</dd>
                          </div>
                          {lastCall?.created_at && (
                            <div className="flex justify-between gap-4">
                              <dt className="text-[#888]">Last call</dt>
                              <dd className="font-medium text-white">
                                {timeAgo(lastCall.created_at)}
                              </dd>
                            </div>
                          )}
                        </>
                      )}
                    </dl>
                  </div>
                )}

                {/* Feature chips */}
                <ul className="mt-4 flex flex-wrap gap-2">
                  {agent.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-md px-2 py-1 text-xs text-[#888] transition-colors duration-200 hover:text-[#AAAAAA]"
                      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-3">
                  {isComingSoon ? (
                    <Button variant="secondary" size="md" disabled>
                      Coming Soon
                    </Button>
                  ) : isLive ? (
                    <>
                      <Button href={`/wizard?agent=${agent.id}`} variant="outline" size="md">
                        Reconfigure
                      </Button>
                      {agent.id === "voice" && (
                        <Button href="/calls" variant="ghost" size="md">
                          View call logs
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
            );
          })}
        </div>
      </div>
    </>
  );
}
