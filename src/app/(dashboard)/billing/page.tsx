import { redirect } from "next/navigation";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardNavbar } from "@/components/dashboard/Navbar";

const PLAN_META: Record<
  string,
  { label: string; price: number; calls: number; minutes: number }
> = {
  free: { label: "Free", price: 0, calls: 10, minutes: 30 },
  starter: { label: "Starter", price: 29, calls: 100, minutes: 300 },
  growth: { label: "Growth", price: 79, calls: 500, minutes: 1500 },
  pro: { label: "Pro", price: 199, calls: Infinity, minutes: Infinity },
};

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    trialing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    past_due: "bg-red-500/10 text-red-400 border-red-500/20",
    canceled: "bg-white/[0.05] text-[#888] border-white/[0.08]",
    paid: "bg-green-500/10 text-green-400 border-green-500/20",
    open: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    void: "bg-white/[0.05] text-[#888] border-white/[0.08]",
    uncollectible: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? "bg-white/[0.05] text-[#888] border-white/[0.08]",
      ].join(" ")}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isHigh = pct > 90;
  const isMed = pct > 70;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[#AAAAAA]">{label}</span>
        <span className="text-[#888]">
          <span className="font-medium text-white">{used.toLocaleString()}</span>
          {" / "}
          <span>{isUnlimited ? "Unlimited" : limit.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        {!isUnlimited && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: isHigh
                ? "#ef4444"
                : isMed
                  ? "#eab308"
                  : "linear-gradient(90deg, #E87B2C, #f59e0b)",
              boxShadow: !isHigh && !isMed ? "0 0 8px rgba(232, 123, 44, 0.4)" : undefined,
            }}
          />
        )}
      </div>
      {isHigh && !isUnlimited && (
        <p className="mt-1.5 text-xs text-red-400">
          You&apos;re approaching your plan limit.{" "}
          <a href="/pricing" className="underline hover:text-red-300 transition-colors">
            Upgrade
          </a>{" "}
          to avoid interruptions.
        </p>
      )}
      {isUnlimited && (
        <p className="mt-1 text-xs text-[#888]">Unlimited on your current plan</p>
      )}
    </div>
  );
}

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_customer_id, stripe_subscription_id, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: callsUsed }, { data: durRows }] = await Promise.all([
    supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("call_logs")
      .select("duration")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  const minutesUsed = Math.round(
    (durRows?.reduce((s, r) => s + (r.duration ?? 0), 0) ?? 0) / 60,
  );

  const stripeClient = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
    : null;

  let stripeSub: Stripe.Subscription | null = null;
  let invoices: Stripe.Invoice[] = [];
  let nextBillingTimestamp: number | null = null;

  if (stripeClient && sub?.stripe_subscription_id) {
    try {
      stripeSub = await stripeClient.subscriptions.retrieve(
        sub.stripe_subscription_id,
        { expand: ["items.data.price"] },
      );
      const schedEnd = stripeSub.billing_schedules?.[0]?.bill_until?.computed_timestamp;
      if (schedEnd) {
        nextBillingTimestamp = schedEnd;
      } else {
        try {
          const preview = await stripeClient.invoices.createPreview({
            subscription: sub.stripe_subscription_id,
          });
          nextBillingTimestamp = preview.next_payment_attempt ?? null;
        } catch {
          // upcoming invoice may not exist for canceled subscriptions
        }
      }
    } catch (err) {
      console.error("[billing] failed to retrieve subscription", err);
    }
  }

  if (stripeClient && sub?.stripe_customer_id) {
    try {
      const list = await stripeClient.invoices.list({
        customer: sub.stripe_customer_id,
        limit: 8,
      });
      invoices = list.data;
    } catch (err) {
      console.error("[billing] failed to list invoices", err);
    }
  }

  const plan = sub?.plan ?? "free";
  const meta = PLAN_META[plan] ?? PLAN_META.free;
  const isSubscribed = !!sub;
  const subStatus = sub?.status ?? "free";

  const nextBillingDate = nextBillingTimestamp ? fmtDate(nextBillingTimestamp) : null;
  const trialEnd = stripeSub?.trial_end ? fmtDate(stripeSub.trial_end) : null;

  const firstItem = stripeSub?.items?.data?.[0];
  const unitAmount =
    (firstItem?.price && typeof firstItem.price === "object"
      ? (firstItem.price as Stripe.Price).unit_amount
      : null) ?? meta.price * 100;

  return (
    <>
      <DashboardNavbar
        title="Billing"
        subtitle="Manage your plan and payment details"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Current Plan */}
          <section
            className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#E87B2C]/5"
            style={{
              background: "#161616",
              border: isSubscribed ? "1px solid rgba(232,123,44,0.2)" : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {isSubscribed && (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
                  style={{ background: "linear-gradient(90deg, #E87B2C, #f59e0b, transparent)" }}
                />
                <div
                  className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10"
                  style={{ background: "radial-gradient(circle, rgba(232,123,44,0.8) 0%, transparent 70%)" }}
                />
              </>
            )}
            <div className="relative mb-5 flex items-center justify-between">
              <p className="font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C]">
                Current Plan
              </p>
              {!isSubscribed && (
                <a
                  href="/pricing"
                  className="relative overflow-hidden rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#E87B2C]/25"
                  style={{ background: "#E87B2C", fontFamily: "Outfit, sans-serif" }}
                >
                  Upgrade plan →
                </a>
              )}
            </div>

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-[Outfit] text-2xl font-bold text-white">{meta.label}</span>
                  <Badge status={subStatus} />
                </div>

                <dl className="mt-3 space-y-1.5 text-sm">
                  {meta.price > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-[#888]">Amount</dt>
                      <dd className="font-medium text-white">{fmtCents(unitAmount)}/month</dd>
                    </div>
                  )}
                  {trialEnd && (
                    <div className="flex gap-2">
                      <dt className="text-[#888]">Trial ends</dt>
                      <dd className="text-white">{trialEnd}</dd>
                    </div>
                  )}
                  {nextBillingDate && (
                    <div className="flex gap-2">
                      <dt className="text-[#888]">Next billing</dt>
                      <dd className="text-white">{nextBillingDate}</dd>
                    </div>
                  )}
                  {!isSubscribed && (
                    <p className="text-[#888]">No active subscription</p>
                  )}
                </dl>
              </div>

              {isSubscribed && (
                <div className="flex flex-col gap-2 sm:min-w-[160px] sm:items-stretch">
                  <form method="POST" action="/api/stripe/portal">
                    <button
                      type="submit"
                      className="w-full rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#E87B2C]/25"
                      style={{ background: "#E87B2C", fontFamily: "Outfit, sans-serif" }}
                    >
                      Manage Billing
                    </button>
                  </form>
                  <form method="POST" action="/api/stripe/portal">
                    <button
                      type="submit"
                      className="w-full rounded-lg px-5 py-2.5 text-sm font-medium text-[#888] transition-all duration-200 hover:border-red-500/30 hover:text-red-400"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Outfit, sans-serif" }}
                    >
                      Cancel Subscription
                    </button>
                  </form>
                  <p className="text-center text-xs text-[#888]">
                    Confirm in the billing portal
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Usage */}
          <section
            className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#E87B2C]/5"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/40 via-[#f59e0b]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="mb-5 flex items-center justify-between">
              <p className="font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C]">
                Usage This Month
              </p>
              <span className="text-xs text-[#888]">
                Resets{" "}
                {new Date(
                  new Date().getFullYear(),
                  new Date().getMonth() + 1,
                  1,
                ).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="space-y-6">
              <UsageRow label="Calls" used={callsUsed ?? 0} limit={meta.calls} />
              <UsageRow label="AI Minutes" used={minutesUsed} limit={meta.minutes} />
            </div>
          </section>

          {/* Invoice History */}
          <section
            className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#E87B2C]/5"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#E87B2C]/40 via-[#f59e0b]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <p className="mb-5 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[#E87B2C]">
              Invoice History
            </p>

            {invoices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                  style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
                >
                  🧾
                </div>
                <p className="text-sm text-[#888]">
                  {isSubscribed
                    ? "No invoices yet. They'll appear here after your first charge."
                    : "Upgrade to a paid plan to see invoice history."}
                </p>
                {!isSubscribed && (
                  <a
                    href="/pricing"
                    className="mt-1 rounded-lg px-4 py-2 text-sm text-[#E87B2C] transition-all duration-200 hover:bg-[#E87B2C]/10"
                    style={{ border: "1px solid rgba(232,123,44,0.3)" }}
                  >
                    View plans
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3 hidden grid-cols-[1fr_auto_auto_auto] gap-4 px-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#888] sm:grid">
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                  <span>Status</span>
                  <span>Invoice</span>
                </div>

                <div>
                  {invoices.map((inv, i) => (
                    <div
                      key={inv.id}
                      className="grid grid-cols-1 gap-2 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4 rounded-lg px-1 -mx-1"
                      style={{
                        borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {inv.created ? fmtDate(inv.created) : "—"}
                        </p>
                        {inv.number && (
                          <p className="text-xs text-[#888]">{inv.number}</p>
                        )}
                      </div>

                      <span className="text-sm font-medium text-white sm:text-right">
                        {inv.amount_paid != null
                          ? fmtCents(inv.amount_paid)
                          : fmtCents(inv.amount_due ?? 0)}
                      </span>

                      <Badge status={inv.status ?? "unknown"} />

                      {inv.invoice_pdf ? (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#E87B2C] transition-colors duration-150 hover:text-[#f59e0b] hover:underline"
                        >
                          PDF ↓
                        </a>
                      ) : (
                        <span className="text-sm text-[#888]">—</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
