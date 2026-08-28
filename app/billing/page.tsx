import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BillingPanel } from "@/components/BillingPanel";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { getRegionalPricing } from "@/lib/billing/pricing";
import { getActiveMembershipGrant, getLatestSubscription, hasActiveCovaMembership } from "@/lib/billing/subscription";
import { getCurrentUserProfile } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paymentMethods = [
  "Visa",
  "Mastercard",
  "Amex",
  "Discover",
  "Klarna",
  "AmazonPay",
  "GooglePay",
  "SamsungPay",
  "MetaPay",
  "Paypal",
  "Maestro",
  "ApplePay",
  "phonepe-circle"
];

export default async function BillingPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const [profileResult, subscriptionResult, membershipGrantResult, requestHeaders] = await Promise.all([
    supabase.from("profiles").select("verified_country, billing_country").eq("id", user.id).maybeSingle(),
    getLatestSubscription(user.id).catch(() => null),
    getActiveMembershipGrant(user.id).catch(() => null),
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
        currentPeriodEnd: subscriptionResult.current_period_end
      }
    : null;
  const hasCovaPro = await hasActiveCovaMembership(user.id).catch(() => false);

  return (
    <div className="profile-page billing-page">
      <MoviePageHeader
        isSignedIn
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? user.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        hasCovaPro={hasCovaPro}
        hidePrimaryActions
      />
      <main className="profile-main billing-main">
        <BillingPanel
          subscription={subscription}
          membershipGrant={membershipGrantResult}
          currentPrice={pricing?.formattedPrice ?? "$1.99"}
          currentCurrency={pricing?.currency ?? "USD"}
          configured={Boolean(pricing)}
        />
      </main>
      <footer className="billing-footer">
        <div className="billing-footer-content">
          <section className="billing-payment-methods" aria-labelledby="payment-methods-title">
            <h2 id="payment-methods-title">Pay your way.</h2>
            <div className="billing-payment-grid">
              {paymentMethods.map((method) => (
                <span className="billing-payment-logo" key={method}>
                  <img src={`/payments/${method}.svg`} alt={method === "phonepe-circle" ? "PhonePe" : method} />
                </span>
              ))}
            </div>
          </section>
          <nav className="billing-footer-links" aria-label="Billing links">
            <Link href="/">Home</Link>
            <a href="https://bloho.space" rel="noreferrer" target="_blank">Bloho.space</a>
            <Link href="/legal">Terms and conditions</Link>
            <Link href="/legal">Privacy Policy</Link>
            <Link href="/legal">Legal</Link>
            <Link href="/about">About</Link>
          </nav>
        </div>
        <div className="billing-footer-bottom">
          <span>© Cova by Bloho, 2026</span>
          <img src="/assets/Cova-logo-white.svg" alt="" />
        </div>
      </footer>
    </div>
  );
}
