import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isRazorpaySubscriptionId } from "@/lib/billing/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type VerifyRequest = {
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null) as VerifyRequest | null;
  const paymentId = body?.razorpay_payment_id?.trim() ?? "";
  const subscriptionId = body?.razorpay_subscription_id?.trim() ?? "";
  const signature = body?.razorpay_signature?.trim() ?? "";

  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId) || !isRazorpaySubscriptionId(subscriptionId) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: subscription, error } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();

    if (error || !subscription) {
      return NextResponse.json({ error: "This subscription does not belong to your account." }, { status: 404 });
    }

    const expected = createHmac("sha256", secret).update(`${paymentId}|${subscriptionId}`).digest("hex");
    const valid = timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
    if (!valid) return NextResponse.json({ error: "Payment confirmation could not be verified." }, { status: 400 });

    return NextResponse.json({ ok: true, message: "Payment was verified. Access will update once Razorpay confirms the subscription." });
  } catch (error) {
    console.error("Billing payment verification failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We could not verify this payment." }, { status: 500 });
  }
}
