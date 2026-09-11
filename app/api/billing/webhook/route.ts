import { NextResponse } from "next/server";
import { getDodoPaymentsClient, isDodoSubscriptionId } from "@/lib/billing/dodo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.on_hold",
  "subscription.past_due",
  "subscription.paused",
  "subscription.unpaused",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
  "subscription.plan_changed",
  "subscription.updated"
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id");
  const signature = request.headers.get("webhook-signature");
  const timestamp = request.headers.get("webhook-timestamp");

  if (!webhookId || !signature || !timestamp) {
    return NextResponse.json({ error: "Missing webhook signature headers." }, { status: 400 });
  }

  let event: ReturnType<ReturnType<typeof getDodoPaymentsClient>["webhooks"]["unwrap"]>;
  try {
    event = getDodoPaymentsClient().webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": signature,
        "webhook-timestamp": timestamp
      }
    });
  } catch (error) {
    console.warn("Rejected Dodo webhook with an invalid signature", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error: claimError } = await admin.from("billing_webhook_events").insert({
      event_id: webhookId,
      event_name: event.type,
      payment_provider: "dodo"
    });

    if (claimError?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    if (claimError) {
      console.error("Dodo webhook idempotency write failed", claimError.message);
      return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
    }
    if (!HANDLED_EVENTS.has(event.type) || !isSubscriptionPayload(event.data)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const subscription = event.data;
    if (!isDodoSubscriptionId(subscription.subscription_id)) {
      console.warn("Ignored Dodo webhook with an invalid subscription id", event.type);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { data: existing, error: existingError } = await admin
      .from("subscriptions")
      .select("id, user_id, provider_event_at")
      .eq("provider_subscription_id", subscription.subscription_id)
      .maybeSingle();

    if (existingError) {
      console.error("Dodo webhook subscription lookup failed", existingError.message);
      return NextResponse.json({ error: "Webhook subscription lookup failed." }, { status: 500 });
    }

    const eventAt = toIso(event.timestamp);
    if (existing?.provider_event_at && new Date(existing.provider_event_at).getTime() > new Date(eventAt).getTime()) {
      return NextResponse.json({ ok: true, stale: true });
    }

    const userId = existing?.user_id ?? getUserId(subscription.metadata);
    const pricing = getPricingForProduct(subscription.product_id);
    if (!userId || !pricing) {
      console.warn("Ignored Dodo subscription webhook without a Cova user or configured product", subscription.subscription_id);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const values = {
      user_id: userId,
      payment_provider: "dodo",
      provider_customer_id: subscription.customer.customer_id,
      provider_subscription_id: subscription.subscription_id,
      provider_product_id: subscription.product_id,
      subscription_status: subscription.status,
      subscription_region: pricing.region,
      subscription_currency: pricing.currency,
      current_period_end: toNullableIso(subscription.next_billing_date),
      cancel_at_period_end: subscription.cancel_at_next_billing_date,
      cancelled_at: isTerminalStatus(subscription.status) ? eventAt : null,
      provider_event_at: eventAt,
      promotion_code: getPromotionCode(subscription.metadata),
      updated_at: new Date().toISOString()
    };

    const { error: saveError } = existing
      ? await admin.from("subscriptions").update(values).eq("id", existing.id)
      : await admin.from("subscriptions").insert(values);

    if (saveError) {
      console.error("Dodo webhook subscription sync failed", saveError.message);
      return NextResponse.json({ error: "Webhook subscription sync failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Dodo webhook processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

function getPricingForProduct(productId: string) {
  if (productId === process.env.DODO_PAYMENTS_PRODUCT_INR) return { region: "IN" as const, currency: "INR" as const };
  if (productId === process.env.DODO_PAYMENTS_PRODUCT_USD) return { region: "GLOBAL" as const, currency: "USD" as const };
  return null;
}

type DodoSubscriptionPayload = {
  subscription_id: string;
  product_id: string;
  status: string;
  next_billing_date: string | null;
  cancel_at_next_billing_date: boolean;
  customer: { customer_id: string };
  metadata: Record<string, unknown>;
};

function isSubscriptionPayload(value: unknown): value is DodoSubscriptionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<DodoSubscriptionPayload>;
  return typeof payload.subscription_id === "string"
    && typeof payload.product_id === "string"
    && typeof payload.status === "string"
    && typeof payload.cancel_at_next_billing_date === "boolean"
    && Boolean(payload.customer && typeof payload.customer.customer_id === "string")
    && Boolean(payload.metadata && typeof payload.metadata === "object");
}

function getUserId(metadata: Record<string, unknown>) {
  const value = typeof metadata.cova_user_id === "string" ? metadata.cova_user_id : "";
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) ? value : null;
}

function getPromotionCode(metadata: Record<string, unknown>) {
  const value = typeof metadata.cova_promotion === "string" ? metadata.cova_promotion : null;
  return value?.slice(0, 120) ?? null;
}

function isTerminalStatus(status: string) {
  return ["cancelled", "expired", "failed"].includes(status);
}

function toIso(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString();
}

function toNullableIso(value: string | null | undefined) {
  return value ? toIso(value) : null;
}
