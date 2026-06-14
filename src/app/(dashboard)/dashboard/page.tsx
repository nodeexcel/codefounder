import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { KpiWidget } from "@/components/dashboard/KpiWidget";
import { PlanWidget } from "@/components/dashboard/PlanWidget";
import { LiveAgentsWidget } from "@/components/dashboard/LiveAgentsWidget";
import { RecentCallsWidget } from "@/components/dashboard/RecentCallsWidget";
import { AgentSnapshotSection, type AgentSnapshotBlock, type AgentSnapshotEntry } from "@/components/dashboard/AgentSnapshotSection";
import { Button } from "@/components/ui/Button";
import { AGENTS, type AgentType } from "@/lib/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type WizardSessionLite = {
  id: string;
  agent_type: string;
  status: string;
  current_step: number | null;
  business_details?: { businessName?: string } | null;
  voice_settings?: Record<string, unknown> | null;
  vapi_assistant_id?: string | null;
};

type CallLogLite = {
  agent_id: string | null;
  created_at: string;
};

type CRMContactLite = {
  company: string | null;
  pipeline_stage: string | null;
  created_at: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-heading text-[10px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
      {children}
    </p>
  );
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: subscription },
    { data: callLogs },
    { count: callsThisMonth },
    { data: durationRows },
    { count: leadsCount },
    { data: liveSessions },
    { data: wizardSessions },
    { count: crmContactsCount },
    { data: monthlyCallRows },
    { data: crmContactRows },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("call_logs")
      .select("id, caller_number, duration, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("duration")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .or("transcript.ilike.%appointment%,transcript.ilike.%booking%"),
    supabase
      .from("agent_wizard_sessions")
      .select("agent_type")
      .eq("user_id", userId)
      .eq("status", "live"),
    supabase
      .from("agent_wizard_sessions")
      .select("id, agent_type, status, current_step, business_details, voice_settings, vapi_assistant_id")
      .eq("user_id", userId),
    supabase
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("call_logs")
      .select("agent_id, created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("crm_contacts")
      .select("company, pipeline_stage, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const activeAgents = (liveSessions ?? [])
    .map((s) => AGENTS.find((a) => a.id === (s.agent_type as AgentType)))
    .filter(Boolean) as typeof AGENTS;

  const totalSeconds = durationRows?.reduce((sum, r) => sum + (r.duration ?? 0), 0) ?? 0;
  const aiMinutes = totalSeconds / 60;
  const aiMinutesDisplay =
    aiMinutes >= 60 ? `${(aiMinutes / 60).toFixed(1)}h` : `${Math.round(aiMinutes)}m`;
  const callCount = callsThisMonth ?? 0;
  const callPct = Math.min(100, Math.round((callCount / 500) * 100));
  const minuteLimit = 20 * 60;
  const minutePct = Math.min(100, Math.round((totalSeconds / minuteLimit) * 100));
  const crmCount = crmContactsCount ?? 0;
  const now = new Date();

  const allSessions = (wizardSessions ?? []) as WizardSessionLite[];
  const sessionsByType = {
    voice: allSessions.filter((session) => session.agent_type === "voice"),
    hr: allSessions.filter((session) => session.agent_type === "hr"),
    marketing: allSessions.filter((session) => session.agent_type === "marketing"),
  };

  const monthlyCalls = (monthlyCallRows ?? []) as CallLogLite[];
  const callCountByAssistant = monthlyCalls.reduce<Record<string, number>>((acc, row) => {
    const key = row.agent_id ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const hrSessionIds = sessionsByType.hr.map((session) => session.id);
  const hrKnowledgeCountBySession: Record<string, number> = {};
  if (hrSessionIds.length > 0) {
    const hrKnowledgeCounts = await Promise.all(
      hrSessionIds.map(async (sessionId) => {
        const { count } = await supabase
          .from("hr_knowledge_base")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("agent_id", sessionId);
        return { sessionId, count: count ?? 0 };
      }),
    );
    for (const row of hrKnowledgeCounts) {
      hrKnowledgeCountBySession[row.sessionId] = row.count;
    }
  }

  const stepMaxByType: Record<AgentType, number> = {
    voice: 5,
    hr: 4,
    marketing: 4,
    crm: 3,
  };

  const accentByType: Record<AgentType, string> = {
    voice: "#3B82F6",
    hr: "#14B8A6",
    marketing: "#F59E0B",
    crm: "#A855F7",
  };

  const hrefByType: Record<AgentType, string> = {
    voice: "/calls",
    hr: "/hr",
    marketing: "/marketing",
    crm: "/crm",
  };

  const voiceEntries: AgentSnapshotEntry[] = sessionsByType.voice.map((session) => {
    const settings = (session.voice_settings ?? {}) as { agentName?: string };
    const businessName = session.business_details?.businessName?.trim() || "Untitled Business";
    const assistantId = session.vapi_assistant_id ?? "";
    const assistantCalls = assistantId ? (callCountByAssistant[assistantId] ?? 0) : callCount;
    const maxStep = stepMaxByType.voice;
    const currentStep = Math.max(0, session.current_step ?? 0);

    return {
      id: session.id,
      businessName,
      agentName: settings.agentName?.trim() || "Voice Agent",
      status: session.status === "live" ? "Live" : "Draft",
      progressPct: session.status === "live" ? 100 : Math.min(100, Math.round((currentStep / maxStep) * 100)),
      metrics: [
        `${assistantCalls} call${assistantCalls === 1 ? "" : "s"} this month`,
        `Setup step ${Math.min(maxStep, currentStep) + 1}/${maxStep + 1}`,
      ],
      href: hrefByType.voice,
    };
  });
  if (voiceEntries.length === 0) {
    voiceEntries.push({
      id: "voice-empty",
      businessName: "No voice business",
      agentName: "Voice Agent",
      status: "Not setup",
      progressPct: 0,
      metrics: [
        `${callCount} call${callCount === 1 ? "" : "s"} this month`,
        "Complete setup wizard to go live",
      ],
      href: hrefByType.voice,
    });
  }

  const hrEntries: AgentSnapshotEntry[] = sessionsByType.hr.map((session) => {
    const settings = (session.voice_settings ?? {}) as { agentName?: string; leaveTypes?: unknown[] };
    const businessName = session.business_details?.businessName?.trim() || "Untitled Business";
    const leaveTypes = Array.isArray(settings.leaveTypes) ? settings.leaveTypes.length : 0;
    const docs = hrKnowledgeCountBySession[session.id] ?? 0;
    const maxStep = stepMaxByType.hr;
    const currentStep = Math.max(0, session.current_step ?? 0);

    return {
      id: session.id,
      businessName,
      agentName: settings.agentName?.trim() || "HR Assistant",
      status: session.status === "live" ? "Live" : "Draft",
      progressPct: session.status === "live" ? 100 : Math.min(100, Math.round((currentStep / maxStep) * 100)),
      metrics: [
        `${docs} policy doc${docs === 1 ? "" : "s"}`,
        `${leaveTypes} leave type${leaveTypes === 1 ? "" : "s"}`,
      ],
      href: hrefByType.hr,
    };
  });
  if (hrEntries.length === 0) {
    hrEntries.push({
      id: "hr-empty",
      businessName: "No HR business",
      agentName: "HR Assistant",
      status: "Not setup",
      progressPct: 0,
      metrics: ["No policy docs uploaded", "Complete setup wizard to go live"],
      href: hrefByType.hr,
    });
  }

  const marketingEntries: AgentSnapshotEntry[] = sessionsByType.marketing.map((session) => {
    const settings = (session.voice_settings ?? {}) as { agentName?: string; platforms?: unknown[]; brandTone?: string };
    const businessName = session.business_details?.businessName?.trim() || "Untitled Business";
    const platforms = Array.isArray(settings.platforms)
      ? settings.platforms.map((value) => String(value))
      : [];
    const maxStep = stepMaxByType.marketing;
    const currentStep = Math.max(0, session.current_step ?? 0);

    return {
      id: session.id,
      businessName,
      agentName: settings.agentName?.trim() || "Marketing Agent",
      status: session.status === "live" ? "Live" : "Draft",
      progressPct: session.status === "live" ? 100 : Math.min(100, Math.round((currentStep / maxStep) * 100)),
      metrics: [
        platforms.length > 0
          ? `${platforms.join(", ")} connected`
          : "No accounts connected",
        settings.brandTone ? `Tone: ${settings.brandTone}` : "Tone not selected",
      ],
      href: hrefByType.marketing,
    };
  });
  if (marketingEntries.length === 0) {
    marketingEntries.push({
      id: "marketing-empty",
      businessName: "No marketing business",
      agentName: "Marketing Agent",
      status: "Not setup",
      progressPct: 0,
      metrics: ["No accounts connected", "Complete setup wizard to go live"],
      href: hrefByType.marketing,
    });
  }

  const contacts = (crmContactRows ?? []) as CRMContactLite[];
  const crmByCompany = contacts.reduce<Record<string, { total: number; newLeads: number }>>((acc, row) => {
    const company = row.company?.trim() || "Unassigned";
    if (!acc[company]) {
      acc[company] = { total: 0, newLeads: 0 };
    }
    acc[company].total += 1;
    if ((row.pipeline_stage ?? "").toLowerCase() === "new lead") {
      acc[company].newLeads += 1;
    }
    return acc;
  }, {});

  const monthStartMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const crmByCompanySorted = Object.entries(crmByCompany)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  const crmEntries: AgentSnapshotEntry[] = crmByCompanySorted.map(([company, stats], index) => {
    const thisMonth = contacts.filter((row) => {
      const rowCompany = row.company?.trim() || "Unassigned";
      return rowCompany === company && new Date(row.created_at).getTime() >= monthStartMs;
    }).length;

    return {
      id: `crm-${index}`,
      businessName: company,
      agentName: "CRM Agent",
      status: stats.total > 0 ? "Active" : "Not setup",
      progressPct: crmCount > 0 ? Math.max(10, Math.min(100, Math.round((stats.total / crmCount) * 100))) : 0,
      metrics: [
        `${stats.total} contact${stats.total === 1 ? "" : "s"}`,
        `${stats.newLeads} new lead${stats.newLeads === 1 ? "" : "s"}`,
        `${thisMonth} added this month`,
      ],
      href: hrefByType.crm,
    };
  });
  if (crmEntries.length === 0) {
    crmEntries.push({
      id: "crm-empty",
      businessName: "No CRM business",
      agentName: "CRM Agent",
      status: "Not setup",
      progressPct: 0,
      metrics: ["0 contacts", "Import leads from voice or forms"],
      href: hrefByType.crm,
    });
  }

  const agentSnapshotBlocks: AgentSnapshotBlock[] = [
    {
      id: "voice",
      title: "Voice",
      icon: "📞",
      accent: accentByType.voice,
      entries: voiceEntries,
    },
    {
      id: "hr",
      title: "HR",
      icon: "👥",
      accent: accentByType.hr,
      entries: hrEntries,
    },
    {
      id: "marketing",
      title: "Marketing",
      icon: "📱",
      accent: accentByType.marketing,
      entries: marketingEntries,
    },
    {
      id: "crm",
      title: "CRM",
      icon: "🎯",
      accent: accentByType.crm,
      entries: crmEntries,
    },
  ];

  const usageStats = [
    {
      label: "Calls this month",
      value: String(callCount),
      limit: "500",
      pct: callPct,
      gradient: "linear-gradient(135deg, rgba(59,130,246,0.09) 0%, rgba(59,130,246,0.02) 100%)",
      accentBg: "rgba(59,130,246,0.12)",
      accentColor: "#3B82F6",
      barGradient: "linear-gradient(90deg, #3B82F6, #60A5FA)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
        </svg>
      ),
    },
    {
      label: "AI minutes used",
      value: aiMinutesDisplay,
      limit: "20h",
      pct: minutePct,
      gradient: "linear-gradient(135deg, rgba(139,92,246,0.09) 0%, rgba(139,92,246,0.02) 100%)",
      accentBg: "rgba(139,92,246,0.12)",
      accentColor: "#8B5CF6",
      barGradient: "linear-gradient(90deg, #8B5CF6, #A78BFA)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Leads captured",
      value: String(leadsCount ?? 0),
      limit: "—",
      pct: null,
      gradient: "linear-gradient(135deg, rgba(20,184,166,0.09) 0%, rgba(20,184,166,0.02) 100%)",
      accentBg: "rgba(20,184,166,0.12)",
      accentColor: "#14B8A6",
      barGradient: "linear-gradient(90deg, #14B8A6, #2DD4BF)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  const currentPlan = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "Free";

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const trialDaysRemaining = subscription?.created_at
    ? Math.max(
        0,
        14 -
          Math.floor(
            (nowMs - new Date(subscription.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
      )
    : 0;

  return (
    <>
      <DashboardNavbar
        title="Dashboard"
      />

      <div className="flex min-h-[calc(100vh-56px)] flex-col p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <WelcomeBanner />

          {/* KPI widgets */}
          <div>
            <SectionLabel>Usage Overview</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {usageStats.map((stat) => (
                <KpiWidget key={stat.label} {...stat} />
              ))}
            </div>
          </div>

          {/* Platform widgets */}
          <div>
            <SectionLabel>Platform</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <PlanWidget
                plan={currentPlan}
                trialDaysRemaining={trialDaysRemaining}
                status={subscription?.status}
              />
              <LiveAgentsWidget
                agents={activeAgents.map((a) => ({ id: a.id, name: a.name, icon: a.icon }))}
              />
              <RecentCallsWidget calls={callLogs ?? []} />
            </div>
          </div>

          <div>
            <SectionLabel>Agent Snapshot</SectionLabel>
            <AgentSnapshotSection blocks={agentSnapshotBlocks} />
          </div>
        </div>

        {/* CTA banner */}
        <div
          className="relative mt-auto overflow-hidden rounded-xl px-4 py-3.5"
          style={{
            background: "linear-gradient(135deg, var(--card2) 0%, var(--card) 100%)",
            border: "1px solid rgba(255,122,26,0.18)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
            style={{ background: "linear-gradient(90deg, transparent, var(--accent) 30%, var(--accent-light) 60%, transparent)" }}
          />
          <div
            className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-0.5 font-heading text-[10px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
                Setup Wizard
              </p>
              <h3 className="font-heading text-base font-semibold" style={{ letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                Ready to launch another agent?
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                Complete the setup wizard in under 10 minutes.
              </p>
            </div>
            <Button href="/wizard">Start wizard</Button>
          </div>
        </div>
      </div>
    </>
  );
}
