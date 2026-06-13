import { redirect } from "next/navigation";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardNavbar } from "@/components/dashboard/Navbar";

const PLAN_META: Record<
  string,
  { label: string; price: number; calls: number; minutes: number }
> = {
  free:    { label: "Free",    price: 0,   calls: 10,       minutes: 30 },
  starter: { label: "Starter", price: 149, calls: 500,      minutes: 1500 },
  pro:     { label: "Pro",     price: 299, calls: 2500,     minutes: 7500 },
  elite:   { label: "Elite",   price: 599, calls: Infinity, minutes: Infinity },
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
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <span style={{ color: "var(--muted)" }}>
          <span className="font-medium" style={{ color: "var(--foreground)" }}>{used.toLocaleString()}</span>
          {" / "}
          <span>{isUnlimited ? "Unlimited" : limit.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
        {!isUnlimited && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: isHigh
                ? "#ef4444"
                : isMed
                  ? "#eab308"
                  : "linear-gradient(90deg, var(--accent), var(--accent-light))",
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
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Unlimited on your current plan</p>
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
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Current Plan */}
          <section
            className="group relative overflow-hidden rounded-3xl p-6 sm:p-7 transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, var(--card2) 0%, var(--card) 100%)",
              border: isSubscribed ? "1px solid rgba(255,122,26,0.18)" : "1px solid var(--border)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.06)",
            }}
          >
            {isSubscribed && (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
                  style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }}
                />
                <div
                  className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10"
                  style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
                />
              </>
            )}
            <div className="relative mb-6 flex items-center justify-between gap-4">
              <p className="font-heading text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
                Current Plan
              </p>
              {!isSubscribed && (
                <a
                  href="/pricing"
                  className="relative overflow-hidden rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-heading)" }}
                >
                  Upgrade plan →
                </a>
              )}
            </div>

            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-heading text-3xl font-bold tracking-[-0.03em]" style={{ color: "var(--foreground)" }}>{meta.label}</span>
                  <Badge status={subStatus} />
                </div>

                <p className="max-w-xl text-sm leading-6" style={{ color: "var(--muted)" }}>
                  {isSubscribed
                    ? "Your subscription, usage, and invoices are tracked here so billing stays easy to review in one place."
                    : "You’re currently on the free plan. Upgrade to unlock paid usage limits, invoicing, and billing portal access."}
                </p>

                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <dt className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>Plan</dt>
                    <dd className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{meta.label}</dd>
                  </div>
                  <div className="rounded-2xl border px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <dt className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>Billing</dt>
                    <dd className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{nextBillingDate ?? "Monthly"}</dd>
                  </div>
                  <div className="rounded-2xl border px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <dt className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>Status</dt>
                    <dd className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{subStatus.replace(/_/g, " ")}</dd>
                  </div>
                </dl>

                <dl className="space-y-1.5 text-sm">
                  {meta.price > 0 && (
                    <div className="flex gap-2">
                      <dt style={{ color: "var(--muted)" }}>Amount</dt>
                      <dd className="font-medium" style={{ color: "var(--foreground)" }}>{fmtCents(unitAmount)}/month</dd>
                    </div>
                  )}
                  {trialEnd && (
                    <div className="flex gap-2">
                      <dt style={{ color: "var(--muted)" }}>Trial ends</dt>
                      <dd style={{ color: "var(--foreground)" }}>{trialEnd}</dd>
                    </div>
                  )}
                  {nextBillingDate && (
                    <div className="flex gap-2">
                      <dt style={{ color: "var(--muted)" }}>Next billing</dt>
                      <dd style={{ color: "var(--foreground)" }}>{nextBillingDate}</dd>
                    </div>
                  )}
                  {!isSubscribed && (
                    <p style={{ color: "var(--muted)" }}>No active subscription</p>
                  )}
                </dl>
              </div>

              <div className="rounded-3xl border p-5 sm:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
                      Payment
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
                      {isSubscribed
                        ? "Use the billing portal to update payment details, review invoices, or manage the subscription."
                        : "Upgrade to connect payment details and unlock the billing portal."}
                    </p>
                  </div>
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,122,26,0.12), rgba(255,122,26,0.04))",
                      border: "1px solid rgba(255,122,26,0.12)",
                    }}
                  >
                    <img src="/payment.svg" alt="Payment" className="h-8 w-8" />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl px-4 py-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>Portal</p>
                    <p className="mt-1 text-sm font-medium" style={{ color: "var(--foreground)" }}>Stripe billing portal</p>
                  </div>
                  <div className="rounded-2xl px-4 py-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>Invoices</p>
                    <p className="mt-1 text-sm font-medium" style={{ color: "var(--foreground)" }}>{invoices.length.toLocaleString()} record{invoices.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
              </div>

              {isSubscribed && (
                <div className="flex flex-col gap-2 sm:min-w-[160px] sm:items-stretch lg:col-span-2 lg:flex-row lg:justify-end">
                  <form method="POST" action="/api/stripe/portal">
                    <button
                      type="submit"
                      className="w-full rounded-xl px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg lg:w-auto"
                      style={{ background: "var(--accent)", fontFamily: "var(--font-heading)" }}
                    >
                      Manage Billing
                    </button>
                  </form>
                  <form method="POST" action="/api/stripe/portal">
                    <button
                      type="submit"
                      className="w-full rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 hover:border-red-500/30 hover:text-red-400 lg:w-auto"
                      style={{
                        border: "1px solid var(--border2)",
                        color: "var(--muted)",
                        fontFamily: "var(--font-heading)",
                        background: "transparent",
                      }}
                    >
                      Cancel Subscription
                    </button>
                  </form>
                  <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
                    Confirm in the billing portal
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Usage */}
          <section
            className="group relative overflow-hidden rounded-3xl p-6 sm:p-7 transition-all duration-300"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 12px 34px rgba(0,0,0,0.04)" }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(90deg, var(--accent)/40, var(--accent-light)/20, transparent)" }}
            />
            <div className="mb-5 flex items-center justify-between">
              <p className="font-heading text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
                Usage This Month
              </p>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
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
            className="group relative overflow-hidden rounded-3xl p-6 sm:p-7 transition-all duration-300"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 12px 34px rgba(0,0,0,0.04)" }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(90deg, var(--accent)/40, var(--accent-light)/20, transparent)" }}
            />
            <p className="mb-5 font-heading text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)" }}>
              Invoice History
            </p>

            {invoices.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,122,26,0.12), rgba(255,122,26,0.04))",
                    border: "1px solid rgba(255,122,26,0.12)",
                  }}
                >
                  <img src="/payment.svg" alt="Payment" className="h-8 w-8" />
                </div>
                <p className="max-w-md text-sm leading-6" style={{ color: "var(--muted)" }}>
                  {isSubscribed
                    ? "No invoices yet. Once your first payment is processed, the invoice will appear here automatically."
                    : "Upgrade to a paid plan to unlock invoice history and billing details."}
                </p>
                {!isSubscribed && (
                  <a
                    href="/pricing"
                    className="mt-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200"
                    style={{
                      color: "var(--accent)",
                      border: "1px solid rgba(255,122,26,0.22)",
                      background: "rgba(255,122,26,0.04)",
                    }}
                  >
                    View plans
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3 hidden grid-cols-[1fr_auto_auto_auto] gap-4 px-1 text-[11px] font-semibold uppercase tracking-[2px] sm:grid" style={{ color: "var(--muted)" }}>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                  <span>Status</span>
                  <span>Invoice</span>
                </div>

                <div>
                  {invoices.map((inv, i) => (
                    <div
                      key={inv.id}
                      className="grid grid-cols-1 gap-2 py-4 rounded-2xl px-3 -mx-3 transition-colors duration-150 hover:bg-[var(--surface)] sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {inv.created ? fmtDate(inv.created) : "—"}
                        </p>
                        {inv.number && (
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{inv.number}</p>
                        )}
                      </div>

                      <span className="text-sm font-medium sm:text-right" style={{ color: "var(--foreground)" }}>
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
                          className="text-sm transition-colors duration-150 hover:underline"
                          style={{ color: "var(--accent)" }}
                        >
                          PDF ↓
                        </a>
                      ) : (
                        <span className="text-sm" style={{ color: "var(--muted)" }}>—</span>
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
