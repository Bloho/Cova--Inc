"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BillingSubscription = {
  subscriptionId: string;
  status: string;
  currency: "INR" | "USD";
  price: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null;

type CheckoutData = {
  keyId: string;
  subscriptionId: string;
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
  currentPrice,
  currentCurrency,
  billingCountry,
  pricingSource,
  configured
}: {
  subscription: BillingSubscription;
  currentPrice: string;
  currentCurrency: "INR" | "USD";
  billingCountry: string | null;
  pricingSource: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"subscribe" | "cancel" | "country" | null>(null);
  const [country, setCountry] = useState(billingCountry ?? "US");
  const [message, setMessage] = useState("");
  const canCancel = subscription && ["created", "authenticated", "active", "pending", "paused"].includes(subscription.status) && !subscription.cancelAtPeriodEnd;
  const canSubscribe = !subscription || ["halted", "cancelled", "completed", "expired"].includes(subscription.status);

  async function saveCountry(nextCountry: string) {
    setCountry(nextCountry);
    setBusy("country");
    setMessage("");
    try {
      const response = await fetch("/api/billing/country", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: nextCountry })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Billing country could not be saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Billing country could not be saved.");
    } finally {
      setBusy(null);
    }
  }

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

  async function cancelSubscription() {
    setBusy("cancel");
    setMessage("");
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Subscription could not be cancelled.");
      setMessage(data.message ?? "Your subscription will end after the current billing period.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Subscription could not be cancelled.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="billing-panel" aria-labelledby="billing-title">
      <div className="billing-panel-copy">
        <p className="billing-eyebrow">Cova membership</p>
        <h1 id="billing-title">Billing</h1>
        <p className="billing-price">{subscription?.price ?? currentPrice}<span>/ month</span></p>
        <p className="billing-description">Unlock the paid Cova experience with one monthly plan.</p>
      </div>

      <div className="billing-details">
        <dl>
          <div><dt>Status</dt><dd>{subscription ? formatStatus(subscription.status) : "Free"}</dd></div>
          <div><dt>Currency</dt><dd>{subscription?.currency ?? currentCurrency}</dd></div>
          {subscription?.currentPeriodEnd ? <div><dt>{subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}</dt><dd>{formatDate(subscription.currentPeriodEnd)}</dd></div> : null}
        </dl>

        {canSubscribe ? (
          <button className="billing-primary-action" disabled={busy !== null} onClick={() => void startCheckout()} type="button">
            {busy === "subscribe" ? "Opening checkout..." : subscription?.status === "halted" ? "Try subscribing again" : "Subscribe"}
          </button>
        ) : null}
        {subscription?.status === "created" ? (
          <button className="billing-primary-action" disabled={busy !== null} onClick={() => void startCheckout()} type="button">
            {busy === "subscribe" ? "Opening checkout..." : "Resume checkout"}
          </button>
        ) : null}
        {canCancel ? (
          <button className="billing-secondary-action" disabled={busy !== null} onClick={() => void cancelSubscription()} type="button">
            {busy === "cancel" ? "Cancelling..." : "Cancel at period end"}
          </button>
        ) : null}
        {subscription?.cancelAtPeriodEnd ? <p className="billing-note">Cancellation is scheduled; access remains until the current period ends.</p> : null}
      </div>

      <label className="billing-country">
        <span>Billing country</span>
        <select disabled={busy === "country"} onChange={(event) => void saveCountry(event.target.value)} value={country}>
          <option value="IN">India</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="CA">Canada</option>
          <option value="AU">Australia</option>
          <option value="ZZ">Other country</option>
        </select>
        <small>{pricingSource === "user_selection" || pricingSource === "default" ? "Used when a verified account country or trusted server location is unavailable." : "A verified account country or trusted server location is currently setting your price."}</small>
      </label>

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
