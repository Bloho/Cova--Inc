import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BillingSubscription = {
  id: string;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string;
  razorpay_plan_id: string;
  subscription_status: string;
  subscription_region: "IN" | "GLOBAL";
  subscription_currency: "INR" | "USD";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MembershipGrant = {
  promotionCode: string;
  endsAt: string;
};

const ENTITLED_STATUSES = ["authenticated", "active"];

export async function getLatestSubscription(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, razorpay_customer_id, razorpay_subscription_id, razorpay_plan_id, subscription_status, subscription_region, subscription_currency, current_period_end, cancel_at_period_end, cancelled_at, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as BillingSubscription | null;
}

export async function hasActiveSubscription(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("subscription_status, current_period_end")
    .eq("user_id", userId)
    .in("subscription_status", ENTITLED_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now();
}

export async function getActiveMembershipGrant(userId: string) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("membership_grants")
    .select("promotion_code, ends_at")
    .eq("user_id", userId)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    promotionCode: data.promotion_code,
    endsAt: data.ends_at
  } satisfies MembershipGrant;
}

export async function hasActiveCovaMembership(userId: string) {
  const [hasSubscription, membershipGrant] = await Promise.all([
    hasActiveSubscription(userId),
    getActiveMembershipGrant(userId)
  ]);

  return hasSubscription || Boolean(membershipGrant);
}
