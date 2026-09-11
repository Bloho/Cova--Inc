"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type BillingSubscription = {
  subscriptionId: string;
  status: string;
  currency: "INR" | "USD";
  currentPeriodEnd: string | null;
} | null;

type MembershipGrant = {
  promotionCode: string;
  endsAt: string;
} | null;

type CheckoutData = {
  checkoutUrl: string;
};

export function BillingPanel({
  subscription,
  membershipGrant,
  currentPrice,
  currentCurrency,
  configured
}: {
  subscription: BillingSubscription;
  membershipGrant: MembershipGrant;
  currentPrice: string;
  currentCurrency: "INR" | "USD";
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"subscribe" | "promotion" | null>(null);
  const [message, setMessage] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const canSubscribe = !subscription || ["halted", "cancelled", "completed", "expired"].includes(subscription.status);
  const canCheckout = !membershipGrant && canSubscribe;
  const priceVideo = currentCurrency === "INR" ? "/assets/99.webm" : "/assets/1.99.webm";

  async function startCheckout() {
    if (!configured) {
      setMessage("Billing is not configured yet.");
      return;
    }

    setBusy("subscribe");
    setMessage("");
    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotionCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Subscription checkout could not be started.");

      window.location.assign((data as CheckoutData).checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Subscription checkout could not be started.");
      setBusy(null);
    }
  }

  async function applyPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!promotionCode.trim()) return;

    setBusy("promotion");
    setMessage("");
    try {
      const response = await fetch("/api/billing/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promotionCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "That code could not be applied.");
      setMessage(data.message ?? "Your promotion is active.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That code could not be applied.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="billing-panel" aria-labelledby="billing-title">
      <img className="billing-brand-loop" src="/assets/cova-loop.webp" alt="Cova" />
      <div className="billing-offer">
        <h1 id="billing-title">{canCheckout ? "Get Cova for just" : "Your Cova membership"}</h1>
        {canCheckout ? (
          <>
            <video autoPlay className="billing-price-video" loop muted playsInline preload="metadata" aria-label={`${currentPrice} per month`}>
              <source src={priceVideo} type="video/webm" />
            </video>
            <p className="billing-month">/month</p>
          </>
        ) : (
          <div className="billing-membership-summary">
            <strong>{membershipGrant ? "Free month" : formatStatus(subscription?.status ?? "free")}</strong>
            {membershipGrant ? <span>Access ends {formatDate(membershipGrant.endsAt)}</span> : null}
            {!membershipGrant && subscription?.currentPeriodEnd ? <span>Renews {formatDate(subscription.currentPeriodEnd)}</span> : null}
          </div>
        )}

        {canCheckout ? (
          <button className="billing-primary-action" disabled={busy !== null || !configured} onClick={() => void startCheckout()} type="button">
            {busy === "subscribe" ? "Opening checkout..." : "Checkout"}
          </button>
        ) : null}
        <p className="billing-provider-note">{canCheckout ? "*you will be directed to our payments provider" : membershipGrant ? "Your free month is active." : "Your subscription is managed securely by Dodo Payments."}</p>
        {canCheckout ? (
          <form className="billing-promotion" onSubmit={(event) => void applyPromotion(event)}>
            <label className="sr-only" htmlFor="billing-promotion-code">Promotion code</label>
            <input
              autoCapitalize="characters"
              autoComplete="off"
              disabled={busy !== null}
              id="billing-promotion-code"
              onChange={(event) => setPromotionCode(event.target.value)}
              placeholder="Got a code?"
              value={promotionCode}
            />
            <button disabled={busy !== null || !promotionCode.trim()} type="submit">
              {busy === "promotion" ? "Applying..." : "Apply"}
            </button>
          </form>
        ) : null}
      </div>

      {message ? <p className="billing-message" role="status">{message}</p> : null}
    </section>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
