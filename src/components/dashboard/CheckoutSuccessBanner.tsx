"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Shown after Stripe checkout redirects to /dashboard?checkout=success.
// Calls /api/stripe/sync-subscription to pull the latest plan from Stripe
// directly (bypassing the webhook race condition), then refreshes the
// server component so the correct plan appears immediately.
export function CheckoutSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isCheckout = searchParams.get("checkout") === "success";

  const [phase, setPhase] = useState<"syncing" | "done" | "idle">(isCheckout ? "syncing" : "idle");
  const [planName, setPlanName] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!isCheckout || calledRef.current) return;
    calledRef.current = true;

    async function sync() {
      // Retry up to 5 times with 2-second backoff — gives the webhook time
      // to have run if it fires faster than us, and falls back to direct
      // Stripe API lookup on every attempt regardless.
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }

        try {
          const res = await fetch("/api/stripe/sync-subscription");
          const data = (await res.json()) as {
            synced?: boolean;
            plan?: string;
            status?: string;
            reason?: string;
            error?: string;
          };

          if (res.ok && data.synced && data.plan) {
            const label = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
            setPlanName(label);
            setPhase("done");
            // Refresh the server component to reflect the new plan
            router.replace("/dashboard", { scroll: false });
            router.refresh();
            return;
          }

          // If Stripe says no subscription yet, keep retrying
          console.log("[checkout-banner] sync attempt", attempt + 1, ":", data.reason ?? data.error);
        } catch (err) {
          console.error("[checkout-banner] sync error:", err);
        }
      }

      // After 5 attempts, still refresh so at least webhook-written data appears
      setPhase("done");
      router.replace("/dashboard", { scroll: false });
      router.refresh();
    }

    sync();
  }, [isCheckout, router]);

  if (phase === "idle") return null;

  if (phase === "syncing") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"
        style={{
          background: "rgba(232,123,44,0.08)",
          border: "1px solid rgba(232,123,44,0.22)",
          color: "#E87B2C",
        }}
      >
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2"
          style={{ borderColor: "#E87B2C", borderTopColor: "transparent" }}
        />
        Activating your subscription…
      </div>
    );
  }

  // phase === "done"
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"
      style={{
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.22)",
        color: "#10B981",
      }}
    >
      <span>✓</span>
      {planName ? `Welcome to ${planName}! Your plan is now active.` : "Your subscription is active."}
    </div>
  );
}
