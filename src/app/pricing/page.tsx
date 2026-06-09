"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type PlanKey = "starter" | "growth" | "pro";

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    key: "starter",
    name: "Starter",
    price: 29,
    description: "Best for early-stage teams launching their first AI workflows.",
    features: [
      "1 active AI agent",
      "500 calls / month",
      "Basic workflow automations",
      "Email support",
      "14-day free trial",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: 79,
    description: "For growing businesses scaling automation across teams.",
    features: [
      "3 active AI agents",
      "2,500 calls / month",
      "Advanced automations + integrations",
      "Priority support",
      "14-day free trial",
    ],
    highlighted: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: 199,
    description: "For high-volume operations needing full automation coverage.",
    features: [
      "10 active AI agents",
      "10,000 calls / month",
      "Custom workflows + API access",
      "Dedicated onboarding",
      "14-day free trial",
    ],
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: PlanKey) {
    try {
      setError(null);
      setLoadingPlan(plan);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to start checkout");
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Checkout URL missing");
      }

      // Event handler (not render): navigating to Stripe Checkout URL
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f97316]">
            Pricing
          </p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Simple plans for every stage
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Start with a 14-day free trial on any plan. Upgrade, downgrade, or
            cancel anytime.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.key}
              className={[
                "rounded-2xl border bg-[#0d0d0d] p-6",
                plan.highlighted
                  ? "border-[#f97316]/50 shadow-xl shadow-[#f97316]/10"
                  : "border-[#222222]",
              ].join(" ")}
            >
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-sm text-gray-400">{plan.description}</p>

              <p className="mt-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="ml-2 text-gray-400">/ month</span>
              </p>
              <p className="mt-1 text-sm text-[#f97316]">14-day free trial</p>

              <ul className="mt-6 space-y-2 text-sm text-gray-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-[#f97316]">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  fullWidth
                  onClick={() => startCheckout(plan.key)}
                  disabled={loadingPlan !== null}
                  variant={plan.highlighted ? "primary" : "outline"}
                >
                  {loadingPlan === plan.key ? "Redirecting..." : "Get Started"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
