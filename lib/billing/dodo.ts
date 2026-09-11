import "server-only";
import DodoPayments from "dodopayments";

export function getDodoPaymentsClient() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!bearerToken) throw new Error("Dodo Payments is not configured on this server.");

  return new DodoPayments({
    bearerToken,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || undefined
  });
}

export function isDodoSubscriptionId(value: string) {
  return /^sub_[A-Za-z0-9]+$/.test(value);
}
