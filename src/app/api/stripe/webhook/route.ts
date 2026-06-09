import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null;

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

  if (event.type === "checkout.session.completed") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[stripe/webhook] missing SUPABASE_SERVICE_ROLE_KEY — cannot write subscription");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan ?? "starter";
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : null;
    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;
    const status = session.payment_status === "paid" ? "active" : "trialing";

    if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
      console.error("[stripe/webhook] missing metadata on checkout session", {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
      });
      return NextResponse.json({ received: true });
    }

    const { error } = await adminSupabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan,
        status,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("[stripe/webhook] supabase upsert failed", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
