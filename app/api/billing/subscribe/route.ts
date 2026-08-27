import { NextResponse } from "next/server";
import { createRazorpaySubscription, getRazorpayKeyId, isRazorpaySubscriptionId, RazorpayRequestError } from "@/lib/billing/razorpay";
import { getRegionalPricing } from "@/lib/billing/pricing";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BLOCKING_STATUSES = ["created", "authenticated", "active", "pending", "paused"];
const SUCCESSFUL_STATUSES = ["authenticated", "active", "completed"];
const WELCOME_PROMOTION_CODE = "WELCOME50";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before subscribing." }, { status: 401 });
  }

  const profileResult = await ensureProfile(supabase, user);
  if (profileResult.error) {
    return NextResponse.json({ error: "Your billing profile could not be prepared." }, { status: 500 });
  }

  try {
    const [{ data: profile, error: profileError }, admin] = await Promise.all([
      supabase
        .from("profiles")
        .select("verified_country, billing_country, display_name")
        .eq("id", user.id)
        .single(),
      Promise.resolve(createSupabaseAdminClient())
    ]);

    if (profileError || !profile) {
      return NextResponse.json({ error: "Your billing profile could not be found." }, { status: 500 });
    }

    const pricing = getRegionalPricing({
      verifiedCountry: profile.verified_country,
      selectedCountry: profile.billing_country,
      headers: request.headers
    });

    if (!/^plan_[A-Za-z0-9]+$/.test(pricing.razorpayPlanId)) {
      return NextResponse.json({ error: "Billing plans are not configured correctly." }, { status: 503 });
    }

    const now = new Date().toISOString();
    const [{ data: existing, error: existingError }, { data: paidHistory, error: paidHistoryError }, { data: activeGrant, error: grantError }] = await Promise.all([
      admin
        .from("subscriptions")
        .select("id, razorpay_subscription_id, razorpay_plan_id, subscription_status")
        .eq("user_id", user.id)
        .in("subscription_status", BLOCKING_STATUSES)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .in("subscription_status", SUCCESSFUL_STATUSES)
        .limit(1)
        .maybeSingle(),
      admin
        .from("membership_grants")
        .select("id")
        .eq("user_id", user.id)
        .lte("starts_at", now)
        .gt("ends_at", now)
        .limit(1)
        .maybeSingle()
    ]);

    if (existingError || paidHistoryError || grantError) {
      console.error("Billing subscription lookup failed", existingError?.message ?? paidHistoryError?.message ?? grantError?.message);
      return NextResponse.json({ error: "We could not check your current subscription." }, { status: 500 });
    }

    if (activeGrant) {
      return NextResponse.json({ error: "Your promotional membership is already active." }, { status: 409 });
    }

    if (existing && isRazorpaySubscriptionId(existing.razorpay_subscription_id) && existing.razorpay_plan_id === pricing.razorpayPlanId) {
      return NextResponse.json(checkoutPayload({
        subscriptionId: existing.razorpay_subscription_id,
        key: getRazorpayKeyId(),
        displayName: profile.display_name,
        email: user.email ?? ""
      }));
    }

    if (existing?.subscription_status === "created") {
      const { error: supersedeError } = await admin
        .from("subscriptions")
        .update({ subscription_status: "superseded", updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (supersedeError) {
        console.error("Billing subscription replacement failed", supersedeError.message);
        return NextResponse.json({ error: "We could not replace an earlier checkout session. Please try again." }, { status: 500 });
      }
    }

    const welcomeOfferId = getWelcomeOfferId(pricing.currency, Boolean(paidHistory));
    const subscription = await createRazorpaySubscription({
      planId: pricing.razorpayPlanId,
      userId: user.id,
      offerId: welcomeOfferId ?? undefined,
      promotionCode: welcomeOfferId ? WELCOME_PROMOTION_CODE : undefined
    });

    if (!isRazorpaySubscriptionId(subscription.id)) {
      console.error("Razorpay returned an invalid subscription identifier");
      return NextResponse.json({ error: "Razorpay returned an invalid subscription. Please try again." }, { status: 502 });
    }

    const { error: insertError } = await admin.from("subscriptions").insert({
      user_id: user.id,
      razorpay_customer_id: subscription.customer_id ?? null,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: pricing.razorpayPlanId,
      subscription_status: subscription.status,
      subscription_region: pricing.region,
      subscription_currency: pricing.currency,
      promotion_code: welcomeOfferId ? WELCOME_PROMOTION_CODE : null,
      razorpay_offer_id: welcomeOfferId,
      current_period_end: unixToIso(subscription.current_end),
      cancel_at_period_end: false,
      razorpay_event_created_at: null,
      updated_at: new Date().toISOString()
    });

    if (insertError) {
      console.error("Billing subscription persistence failed", insertError.message);
      return NextResponse.json({ error: "Your subscription was created but could not be saved. Please contact support." }, { status: 500 });
    }

    return NextResponse.json(checkoutPayload({
      subscriptionId: subscription.id,
      key: getRazorpayKeyId(),
      displayName: profile.display_name,
      email: user.email ?? ""
    }));
  } catch (error) {
    if (error instanceof RazorpayRequestError) {
      console.error("Razorpay subscription creation failed", error.status);
      return NextResponse.json({ error: "Razorpay could not create your subscription. Please try again." }, { status: 502 });
    }

    console.error("Billing subscription setup failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Billing is not configured yet. Please try again later." }, { status: 503 });
  }
}

function getWelcomeOfferId(currency: "INR" | "USD", hasPaidBefore: boolean) {
  if (currency !== "INR" || hasPaidBefore) return null;
  const offerId = process.env.RAZORPAY_OFFER_WELCOME50_INR?.trim();
  return offerId && /^offer_[A-Za-z0-9]+$/.test(offerId) ? offerId : null;
}

function checkoutPayload(input: { subscriptionId: string; key: string; displayName: string; email: string }) {
  return {
    key: input.key,
    subscription_id: input.subscriptionId,
    name: "Cova",
    description: "Cova monthly subscription",
    prefill: {
      name: input.displayName,
      email: input.email
    }
  };
}

function unixToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}
