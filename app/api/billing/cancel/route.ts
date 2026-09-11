import { NextResponse } from "next/server";
import { getDodoPaymentsClient, isDodoSubscriptionId } from "@/lib/billing/dodo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: subscription, error } = await admin
      .from("subscriptions")
      .select("id, payment_provider, provider_subscription_id, subscription_status")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !subscription || subscription.payment_provider !== "dodo" || !isDodoSubscriptionId(subscription.provider_subscription_id)) {
      return NextResponse.json({ error: "No Dodo subscription was found to cancel." }, { status: 404 });
    }
    if (["cancelled", "expired", "failed"].includes(subscription.subscription_status)) {
      return NextResponse.json({ error: "This subscription has already ended." }, { status: 400 });
    }

    const remote = await getDodoPaymentsClient().subscriptions.update(subscription.provider_subscription_id, {
      cancel_at_next_billing_date: true
    });
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        subscription_status: remote.status,
        current_period_end: toIso(remote.next_billing_date),
        cancel_at_period_end: remote.cancel_at_next_billing_date,
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Dodo cancellation persistence failed", updateError.message);
      return NextResponse.json({ error: "Cancellation was requested, but we could not save the status yet." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Your subscription will end after the current billing period." });
  } catch (error) {
    console.error("Dodo cancellation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Your subscription could not be cancelled. Please try again later." }, { status: 502 });
  }
}

function toIso(value: string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}
