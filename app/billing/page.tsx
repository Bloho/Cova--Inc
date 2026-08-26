import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BillingPanel } from "@/components/BillingPanel";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { getPriceForCurrency, getRegionalPricing } from "@/lib/billing/pricing";
import { getLatestSubscription } from "@/lib/billing/subscription";
import { getCurrentUserProfile } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const [profileResult, subscriptionResult, requestHeaders] = await Promise.all([
    supabase.from("profiles").select("verified_country, billing_country").eq("id", user.id).maybeSingle(),
    getLatestSubscription(user.id).catch(() => null),
    headers()
  ]);

  let pricing = null;
  try {
    pricing = getRegionalPricing({
      verifiedCountry: profileResult.data?.verified_country,
      selectedCountry: profileResult.data?.billing_country,
      headers: requestHeaders
    });
  } catch {
    pricing = null;
  }

  const subscription = subscriptionResult
    ? {
        subscriptionId: subscriptionResult.razorpay_subscription_id,
        status: subscriptionResult.subscription_status,
        currency: subscriptionResult.subscription_currency,
        price: getPriceForCurrency(subscriptionResult.subscription_currency),
        currentPeriodEnd: subscriptionResult.current_period_end,
        cancelAtPeriodEnd: subscriptionResult.cancel_at_period_end
      }
    : null;

  return (
    <div className="profile-page billing-page">
      <MoviePageHeader
        isSignedIn
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? user.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        hidePrimaryActions
      />
      <main className="profile-main billing-main">
        <BillingPanel
          subscription={subscription}
          currentPrice={pricing?.formattedPrice ?? "$2.39"}
          currentCurrency={pricing?.currency ?? "USD"}
          billingCountry={profileResult.data?.billing_country ?? null}
          pricingSource={pricing?.source ?? "default"}
          configured={Boolean(pricing)}
        />
      </main>
      <footer className="movie-page-footer home-page-footer">
        <span>© Cova by Bloho, 2026</span>
        <div><Link href="/about">About</Link><Link href="/legal">Legal</Link></div>
      </footer>
    </div>
  );
}
