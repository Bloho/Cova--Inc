import { NextResponse } from "next/server";
import { cancelRazorpaySubscription, isRazorpaySubscriptionId, RazorpayRequestError } from "@/lib/billing/razorpay";
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
      .select("id, razorpay_subscription_id, subscription_status")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !subscription || !isRazorpaySubscriptionId(subscription.razorpay_subscription_id)) {
      return NextResponse.json({ error: "No cancellable subscription was found." }, { status: 404 });
    }

    if (["cancelled", "completed", "expired"].includes(subscription.subscription_status)) {
      return NextResponse.json({ error: "This subscription has already ended." }, { status: 400 });
    }

    const remote = await cancelRazorpaySubscription(subscription.razorpay_subscription_id);
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        subscription_status: remote.status,
        current_period_end: unixToIso(remote.current_end),
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Billing cancellation persistence failed", updateError.message);
      return NextResponse.json({ error: "Cancellation was requested, but we could not save the status yet." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Your subscription will end after the current billing period." });
  } catch (error) {
    if (error instanceof RazorpayRequestError) {
      console.error("Razorpay cancellation failed", error.status);
      return NextResponse.json({ error: "Razorpay could not cancel this subscription. Please try again." }, { status: 502 });
    }

    console.error("Billing cancellation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Billing is not configured yet. Please try again later." }, { status: 503 });
  }
}

function unixToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}
