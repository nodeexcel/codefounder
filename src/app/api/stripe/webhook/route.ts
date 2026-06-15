import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null;

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[stripe/webhook] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("[stripe/webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe/webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[stripe/webhook] received event:", event.type, event.id);

  // ── checkout.session.completed ────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan ?? "starter";
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const status = session.payment_status === "paid" ? "active" : "trialing";

    console.log("[stripe/webhook] checkout.session.completed", {
      userId,
      plan,
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      paymentStatus: session.payment_status,
    });

    if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
      console.error("[stripe/webhook] missing required fields on checkout session", {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
      });
      return NextResponse.json({ received: true });
    }

    const adminSupabase = getAdminSupabase();
    if (!adminSupabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const { error } = await adminSupabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("[stripe/webhook] upsert failed on checkout.session.completed", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    console.log("[stripe/webhook] subscription saved:", { userId, plan, status });
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;
    const plan = sub.metadata?.plan;
    const status = sub.status; // active, trialing, past_due, canceled, unpaid

    console.log("[stripe/webhook] customer.subscription.updated", {
      userId,
      plan,
      status,
      stripeSubscriptionId: sub.id,
    });

    if (!userId) {
      console.warn("[stripe/webhook] no user_id in subscription metadata — skipping update");
      return NextResponse.json({ received: true });
    }

    const adminSupabase = getAdminSupabase();
    if (!adminSupabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const updatePayload: Record<string, string> = { status, updated_at: new Date().toISOString() };
    if (plan) updatePayload.plan = plan;

    const { error } = await adminSupabase
      .from("subscriptions")
      .update(updatePayload)
      .eq("user_id", userId);

    if (error) {
      console.error("[stripe/webhook] update failed on customer.subscription.updated", error);
    } else {
      console.log("[stripe/webhook] subscription updated:", { userId, plan, status });
    }
  }

  // ── customer.subscription.deleted ─────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;

    console.log("[stripe/webhook] customer.subscription.deleted", { userId, stripeSubscriptionId: sub.id });

    if (!userId) {
      console.warn("[stripe/webhook] no user_id in subscription metadata — skipping cancellation");
      return NextResponse.json({ received: true });
    }

    const adminSupabase = getAdminSupabase();
    if (!adminSupabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const { error } = await adminSupabase
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      console.error("[stripe/webhook] update failed on customer.subscription.deleted", error);
    } else {
      console.log("[stripe/webhook] subscription marked canceled:", { userId });
    }
  }

  return NextResponse.json({ received: true });
}
