export const PLAN_CONFIG = {
  starter: { name: "CodeFounder Starter", amountCents: 2900, mrr: 29 },
  growth:  { name: "CodeFounder Growth",  amountCents: 7900, mrr: 79 },
  pro:     { name: "CodeFounder Pro",     amountCents: 19900, mrr: 199 },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

export function isPlanKey(value: string): value is PlanKey {
  return value in PLAN_CONFIG;
}

export const PLAN_MRR: Record<string, number> = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([k, v]) => [k, v.mrr]),
);
