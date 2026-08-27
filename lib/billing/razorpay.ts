import "server-only";

type RazorpayErrorBody = {
  error?: { description?: string };
};

export type RazorpaySubscription = {
  id: string;
  plan_id: string;
  customer_id?: string | null;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  has_scheduled_changes?: boolean;
  notes?: Record<string, string>;
};

export function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId) throw new Error("Billing is not configured on this server.");
  return keyId;
}

function getRazorpayCredentials() {
  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keySecret) throw new Error("Billing is not configured on this server.");
  return { keyId, keySecret };
}

export async function createRazorpaySubscription(input: {
  planId: string;
  userId: string;
  offerId?: string;
  promotionCode?: string;
}) {
  const notes: Record<string, string> = {
    cova_user_id: input.userId
  };

  if (input.promotionCode) notes.cova_promotion = input.promotionCode;

  return razorpayRequest<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: input.planId,
      ...(input.offerId ? { offer_id: input.offerId } : {}),
      total_count: 1200,
      quantity: 1,
      customer_notify: true,
      notes
    })
  });
}

export async function cancelRazorpaySubscription(subscriptionId: string) {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: true })
  });
}

async function razorpayRequest<T>(path: string, init: RequestInit) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init.headers
    },
    cache: "no-store"
  });
  const body = await response.json().catch(() => null) as unknown;

  if (!response.ok) {
    const detail = getRazorpayErrorDetail(body);
    throw new RazorpayRequestError(detail ?? "Razorpay could not process the subscription request.", response.status);
  }

  return body as T;
}

export class RazorpayRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function isRazorpaySubscriptionId(value: string) {
  return /^sub_[A-Za-z0-9]+$/.test(value);
}

function getRazorpayErrorDetail(value: unknown) {
  if (!value || typeof value !== "object" || !("error" in value)) return undefined;
  const error = (value as RazorpayErrorBody).error;
  return error?.description;
}
