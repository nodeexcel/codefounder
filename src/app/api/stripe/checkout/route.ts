import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-05-28.basil" })
  : null;

const PLAN_CONFIG = {
  starter: {
    name: "CodeFounder Starter",
    amount: 2900,
  },
  growth: {
    name: "CodeFounder Growth",
    amount: 7900,
  },
  pro: {
    name: "CodeFounder Pro",
    amount: 19900,
  },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;

function isPlanKey(value: string): value is PlanKey {
  return value in PLAN_CONFIG;
}

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { plan?: string };
    const requestedPlan = body.plan;

    if (!requestedPlan || !isPlanKey(requestedPlan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "Please log in before checkout" },
        { status: 401 },
      );
    }

    const origin = new URL(request.url).origin;
    const plan = PLAN_CONFIG[requestedPlan];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        plan: requestedPlan,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.amount,
            recurring: { interval: "month" },
            product_data: {
              name: plan.name,
            },
          },
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          plan: requestedPlan,
        },
      },
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout]", error);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 },
    );
  }
}
