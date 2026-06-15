import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Pick the most relevant subscription when a user has multiple (e.g., Pro active + Elite trialing
// after an upgrade). Strategy: among subscriptions with a "good" status (active or trialing),
// prefer the most recently created one. This ensures an upgrade always wins over an old plan,
// regardless of whether the old one is still active.
// Fall back to past_due, then the newest of anything.
function pickBestEntry(
  entries: Array<{ sub: Stripe.Subscription; customerId: string }>,
): { sub: Stripe.Subscription; customerId: string } | null {
  if (entries.length === 0) return null;

  // Sort newest-first
  const sorted = [...entries].sort(
    (a, b) => (b.sub.created ?? 0) - (a.sub.created ?? 0),
  );

  // 1. Prefer the newest active or trialing subscription
  const good = sorted.find(
    (e) => e.sub.status === "active" || e.sub.status === "trialing",
  );
  if (good) return good;

  // 2. Fall back to newest past_due
  const pastDue = sorted.find((e) => e.sub.status === "past_due");
  if (pastDue) return pastDue;

  // 3. Last resort: most recently created, regardless of status
  return sorted[0] ?? null;
}

export async function GET() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-05-27.dahlia" });

  // Step 1: Find all Stripe customers for this email (test mode can have duplicates)
  const customerList = await stripe.customers.list({ email: user.email, limit: 10 });

  if (customerList.data.length === 0) {
    console.log("[sync-subscription] no Stripe customer for email:", user.email);
    return NextResponse.json({ synced: false, reason: "No Stripe customer found" });
  }

  // Step 2: Gather all subscriptions across all matching customers
  const allSubs: Array<{ sub: Stripe.Subscription; customerId: string }> = [];

  for (const customer of customerList.data) {
    const subList = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });
    for (const sub of subList.data) {
      allSubs.push({ sub, customerId: customer.id });
    }
  }

  if (allSubs.length === 0) {
    console.log("[sync-subscription] no subscriptions found for user:", user.id);
    return NextResponse.json({ synced: false, reason: "No subscription found" });
  }

  // Step 3: Pick the most relevant subscription (newest active/trialing wins)
  const bestEntry = pickBestEntry(allSubs);

  if (!bestEntry) {
    return NextResponse.json({ synced: false, reason: "No subscription found" });
  }

  const { sub: best, customerId: bestCustomerId } = bestEntry;

  // Step 4: Extract plan from subscription metadata (set by checkout route)
  const plan = best.metadata?.plan ?? null;

  if (!plan) {
    console.warn("[sync-subscription] subscription", best.id, "has no plan metadata — cannot sync");
    return NextResponse.json({
      synced: false,
      reason: "Subscription has no plan metadata. Verify the checkout route passes metadata.plan in subscription_data.",
    });
  }

  // Step 5: Upsert into subscriptions table using service role (bypasses RLS)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { error } = await adminSupabase.from("subscriptions").upsert(
    {
      user_id: user.id,
      stripe_customer_id: bestCustomerId,
      stripe_subscription_id: best.id,
      plan,
      status: best.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[sync-subscription] upsert failed:", error);
    return NextResponse.json({ error: "Database write failed" }, { status: 500 });
  }

  console.log("[sync-subscription] synced:", { userId: user.id, plan, status: best.status });
  return NextResponse.json({ synced: true, plan, status: best.status });
}
