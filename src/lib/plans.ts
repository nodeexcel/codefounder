export const PLAN_CONFIG = {
  starter: { name: "CodeFounder Starter", amountCents: 14900, mrr: 149 },
  pro:     { name: "CodeFounder Pro",     amountCents: 29900, mrr: 299 },
  elite:   { name: "CodeFounder Elite",   amountCents: 59900, mrr: 599 },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

export function isPlanKey(value: string): value is PlanKey {
  return value in PLAN_CONFIG;
}

export const PLAN_MRR: Record<string, number> = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([k, v]) => [k, v.mrr]),
);
