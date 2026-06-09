import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[stripe/portal] STRIPE_SECRET_KEY not configured");
    return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(`${origin}/pricing`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-05-27.dahlia",
  });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/billing`,
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("[stripe/portal] failed to create portal session", err);
    return NextResponse.json(
      { error: "Could not open billing portal. Please try again." },
      { status: 500 },
    );
  }
}
