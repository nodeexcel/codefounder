// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export const PLAN_LIMITS = {
  free:    { agents: 1,   calls: 100,    multiLanguage: false, analytics: false },
  starter: { agents: 1,   calls: 500,    multiLanguage: false, analytics: true  },
  pro:     { agents: 3,   calls: 2000,   multiLanguage: true,  analytics: true  },
  elite:   { agents: 999, calls: 999999, multiLanguage: true,  analytics: true  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export async function getUserPlan(userId: string, supabase: AnySupabase): Promise<PlanKey> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || data.status === "canceled") return "free";
  return (data.plan as PlanKey) || "free";
}

export async function canCreateAgent(userId: string, supabase: AnySupabase) {
  const plan = await getUserPlan(userId, supabase);
  const limit = PLAN_LIMITS[plan];

  const { count } = await supabase
    .from("agent_wizard_sessions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "live");

  const current = count ?? 0;
  return { allowed: current < limit.agents, plan, limit, current };
}
