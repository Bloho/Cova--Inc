import { NextResponse } from "next/server";
import { getDodoPaymentsClient } from "@/lib/billing/dodo";
import { getRegionalPricing } from "@/lib/billing/pricing";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BLOCKING_STATUSES = ["pending", "active", "on_hold", "paused"];
const SUCCESSFUL_STATUSES = ["authenticated", "active"];
const WELCOME_PROMOTION_CODE = "WELCOME50";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Please sign in before subscribing." }, { status: 401 });

  const profileResult = await ensureProfile(supabase, user);
  if (profileResult.error) return NextResponse.json({ error: "Your billing profile could not be prepared." }, { status: 500 });

  const payload = await request.json().catch(() => null) as { promotionCode?: unknown } | null;
  const promotionCode = typeof payload?.promotionCode === "string" ? payload.promotionCode.trim().toUpperCase() : "";

  try {
    const [{ data: profile, error: profileError }, admin] = await Promise.all([
      supabase
        .from("profiles")
        .select("verified_country, billing_country, display_name")
        .eq("id", user.id)
        .single(),
      Promise.resolve(createSupabaseAdminClient())
    ]);

    if (profileError || !profile) return NextResponse.json({ error: "Your billing profile could not be found." }, { status: 500 });

    const pricing = getRegionalPricing({
      verifiedCountry: profile.verified_country,
      selectedCountry: profile.billing_country,
      headers: request.headers
    });
    const now = new Date().toISOString();
    const [{ data: existing, error: existingError }, { data: paidHistory, error: paidHistoryError }, { data: activeGrant, error: grantError }] = await Promise.all([
      admin
        .from("subscriptions")
        .select("id")
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
      console.error("Dodo subscription lookup failed", existingError?.message ?? paidHistoryError?.message ?? grantError?.message);
      return NextResponse.json({ error: "We could not check your current subscription." }, { status: 500 });
    }
    if (existing) return NextResponse.json({ error: "You already have a subscription in progress or active." }, { status: 409 });
    if (activeGrant) return NextResponse.json({ error: "Your promotional membership is already active." }, { status: 409 });

    const discountCodes = getDiscountCodes(promotionCode, Boolean(paidHistory));
    if (discountCodes instanceof Error) return NextResponse.json({ error: discountCodes.message }, { status: 400 });

    const appUrl = getAppUrl(request);
    const checkout = await getDodoPaymentsClient().checkoutSessions.create({
      product_cart: [{ product_id: pricing.dodoProductId, quantity: 1 }],
      customer: {
        email: user.email ?? "",
        ...(profile.display_name ? { name: profile.display_name } : {})
      },
      discount_codes: discountCodes,
      feature_flags: { allow_discount_code: false },
      customization: { theme: "dark" },
      return_url: `${appUrl}/billing?checkout=returned`,
      cancel_url: `${appUrl}/billing`,
      metadata: {
        cova_user_id: user.id,
        ...(promotionCode ? { cova_promotion: promotionCode } : {})
      }
    });

    if (!checkout.checkout_url) {
      console.error("Dodo checkout session did not include a hosted URL", checkout.session_id);
      return NextResponse.json({ error: "We could not prepare checkout. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl: checkout.checkout_url });
  } catch (error) {
    console.error("Dodo checkout setup failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Billing is not configured yet. Please try again later." }, { status: 503 });
  }
}

function getDiscountCodes(code: string, hasPaidBefore: boolean) {
  if (!code) return null;
  if (code !== WELCOME_PROMOTION_CODE) return new Error("That code is not valid.");
  if (hasPaidBefore) return new Error("WELCOME50 is available only for your first Cova membership.");
  return [WELCOME_PROMOTION_CODE];
}

function getAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/$/, "");
}
