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
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = CheckoutData & {
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

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
  const canResumeCheckout = subscription?.status === "created";
  const canCheckout = !membershipGrant && (canSubscribe || canResumeCheckout);
  const priceVideo = currentCurrency === "INR" ? "/assets/99.webm" : "/assets/1.99.webm";

  async function startCheckout() {
    if (!configured) {
      setMessage("Billing is not configured yet.");
      return;
    }

    setBusy("subscribe");
    setMessage("");
    try {
      const response = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Subscription checkout could not be started.");

      const checkoutData = data as CheckoutData;
      const Razorpay = await loadRazorpay();
      const checkout = new Razorpay({
        ...checkoutData,
        handler: (payment) => {
          void verifyPayment(payment);
        },
        modal: {
          ondismiss: () => setMessage("Checkout closed. Your subscription has not been activated.")
        },
        theme: { color: "#006dff" }
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Subscription checkout could not be started.");
    } finally {
      setBusy(null);
    }
  }

  async function verifyPayment(payment: RazorpayResponse) {
    setBusy("subscribe");
    try {
      const response = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Payment confirmation could not be verified.");
      setMessage(data.message ?? "Payment verified. Your access will update after Razorpay confirms the subscription.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment confirmation could not be verified.");
    } finally {
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
            {busy === "subscribe" ? "Opening checkout..." : canResumeCheckout ? "Resume checkout" : "Checkout"}
          </button>
        ) : null}
        <p className="billing-provider-note">{canCheckout ? "*you will be directed to our payments provider" : membershipGrant ? "Your free month is active." : "Your subscription is managed securely by Razorpay."}</p>
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

function loadRazorpay(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay Checkout did not load.")), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay Checkout could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay Checkout did not load."));
    script.onerror = () => reject(new Error("Razorpay Checkout could not load."));
    document.body.appendChild(script);
  });
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
