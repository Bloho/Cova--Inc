import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FREE_MONTH_CODE = "HOTCHICKSDONTPAY100";
const ENTITLED_STATUSES = ["authenticated", "active"];

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before applying a code." }, { status: 401 });
  }

  const profileResult = await ensureProfile(supabase, user);
  if (profileResult.error) {
    return NextResponse.json({ error: "Your billing profile could not be prepared." }, { status: 500 });
  }

  const payload = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";

  if (code !== FREE_MONTH_CODE) {
    return NextResponse.json({ error: "That code is not valid." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const { data: paidSubscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", user.id)
    .in("subscription_status", ENTITLED_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Promotion membership lookup failed", subscriptionError.message);
    return NextResponse.json({ error: "We could not check your membership." }, { status: 500 });
  }

  if (paidSubscription && (!paidSubscription.current_period_end || new Date(paidSubscription.current_period_end).getTime() > now.getTime())) {
    return NextResponse.json({ error: "Your membership is already active." }, { status: 409 });
  }

  const endsAt = new Date(now);
  endsAt.setMonth(endsAt.getMonth() + 1);
  const { error: grantError } = await admin.from("membership_grants").insert({
    user_id: user.id,
    promotion_code: FREE_MONTH_CODE,
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString()
  });

  if (grantError?.code === "23505") {
    return NextResponse.json({ error: "This code has already been used on this account." }, { status: 409 });
  }

  if (grantError) {
    console.error("Promotion grant failed", grantError.message);
    return NextResponse.json({ error: "We could not apply that code. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    message: "Your free month is active.",
    endsAt: endsAt.toISOString()
  });
}
