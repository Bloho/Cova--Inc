import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getRegionalPricing } from "@/lib/billing/pricing";
import { isRazorpaySubscriptionId } from "@/lib/billing/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.halted",
  "subscription.pending"
]);

type RazorpayWebhook = {
  event?: string;
  created_at?: number;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        plan_id?: string;
        customer_id?: string | null;
        status?: string;
        current_end?: number | null;
        ended_at?: number | null;
        notes?: Record<string, unknown>;
      };
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.error("Razorpay webhook secret is not configured");
    return NextResponse.json({ error: "Webhook configuration is missing." }, { status: 500 });
  }

  if (!signature || !isValidWebhookSignature(rawBody, signature, secret)) {
    console.warn("Rejected Razorpay webhook with an invalid signature");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (!eventId) {
    console.warn("Rejected Razorpay webhook without an event id");
    return NextResponse.json({ error: "Missing webhook event id." }, { status: 400 });
  }

  const payload = parsePayload(rawBody);
  if (!payload?.event) return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });

  try {
    const admin = createSupabaseAdminClient();
    const { error: eventError } = await admin.from("razorpay_webhook_events").insert({
      event_id: eventId,
      event_name: payload.event
    });

    if (eventError?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (eventError) {
      console.error("Razorpay webhook idempotency write failed", eventError.message);
      return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
    }

    if (!HANDLED_EVENTS.has(payload.event)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const subscription = payload.payload?.subscription?.entity;
    const subscriptionId = subscription?.id?.trim() ?? "";
    if (!isRazorpaySubscriptionId(subscriptionId) || !subscription?.plan_id) {
      console.warn("Ignored Razorpay subscription webhook with invalid identifiers", payload.event);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const eventCreatedAt = Number.isFinite(payload.created_at) ? Number(payload.created_at) : Math.floor(Date.now() / 1000);
    const { data: existing, error: existingError } = await admin
      .from("subscriptions")
      .select("id, user_id, cancel_at_period_end, razorpay_event_created_at")
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();

    if (existingError) {
      console.error("Razorpay webhook subscription lookup failed", existingError.message);
      return NextResponse.json({ error: "Webhook subscription lookup failed." }, { status: 500 });
    }

    if (existing?.razorpay_event_created_at && existing.razorpay_event_created_at > eventCreatedAt) {
      return NextResponse.json({ ok: true, stale: true });
    }

    const userId = existing?.user_id ?? getUserIdFromNotes(subscription.notes);
    if (!userId) {
      console.warn("Ignored Razorpay subscription webhook without a Cova user", subscriptionId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const pricing = getPricingForPlan(subscription.plan_id);
    if (!pricing) {
      console.warn("Ignored Razorpay subscription webhook with an unknown plan", subscriptionId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const remoteStatus = subscription.status?.trim() || fallbackStatus(payload.event);
    const values = {
      user_id: userId,
      razorpay_customer_id: subscription.customer_id ?? null,
      razorpay_subscription_id: subscriptionId,
      razorpay_plan_id: subscription.plan_id,
      subscription_status: remoteStatus,
      subscription_region: pricing.region,
      subscription_currency: pricing.currency,
      current_period_end: unixToIso(subscription.current_end),
      cancel_at_period_end: remoteStatus === "cancelled" ? false : existing?.cancel_at_period_end ?? false,
      cancelled_at: remoteStatus === "cancelled" ? unixToIso(subscription.ended_at) ?? new Date().toISOString() : null,
      razorpay_event_created_at: eventCreatedAt,
      updated_at: new Date().toISOString()
    };

    const { error: saveError } = existing
      ? await admin.from("subscriptions").update(values).eq("id", existing.id)
      : await admin.from("subscriptions").insert(values);

    if (saveError) {
      console.error("Razorpay webhook subscription sync failed", saveError.message);
      return NextResponse.json({ error: "Webhook subscription sync failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Razorpay webhook processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

function isValidWebhookSignature(body: string, received: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
}

function parsePayload(body: string) {
  try {
    return JSON.parse(body) as RazorpayWebhook;
  } catch {
    return null;
  }
}

function getUserIdFromNotes(notes?: Record<string, unknown>) {
  const value = typeof notes?.cova_user_id === "string" ? notes.cova_user_id : "";
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) ? value : null;
}

function getPricingForPlan(planId: string) {
  if (planId === process.env.RAZORPAY_PLAN_INR) {
    return { region: "IN" as const, currency: "INR" as const };
  }

  if (planId === process.env.RAZORPAY_PLAN_USD) {
    return { region: "GLOBAL" as const, currency: "USD" as const };
  }

  return null;
}

function fallbackStatus(event: string) {
  const status = event.replace("subscription.", "");
  return status === "resumed" ? "active" : status;
}

function unixToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}
