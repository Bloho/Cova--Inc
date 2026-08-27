import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UsageFeature = "movie_share_card" | "profile_card_export";

const featureLabels = {
  movie_share_card: "movie share cards",
  profile_card_export: "profile card exports"
} satisfies Record<UsageFeature, string>;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { feature?: unknown; tmdbId?: unknown } | null;
  const feature = body?.feature;
  const validFeature = feature === "movie_share_card" || feature === "profile_card_export";
  const validMovie = feature !== "movie_share_card" || Number.isInteger(body?.tmdbId);

  if (!validFeature || !validMovie) {
    return NextResponse.json({ error: "Invalid usage request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const targetKey = feature === "movie_share_card" ? `movie:${body?.tmdbId}` : "profile";
  const { data, error } = await supabase.rpc("consume_free_usage", {
    p_feature: feature,
    p_target_key: targetKey
  });

  if (error) {
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    console.error("Usage quota check failed", error.message);
    return NextResponse.json({ error: "We could not check your plan limit. Please try again." }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (!result?.allowed) {
    return NextResponse.json({
      error: `The free plan includes up to 5 ${featureLabels[feature]}.`,
      code: "FREE_LIMIT_REACHED",
      feature
    }, { status: 403 });
  }

  return NextResponse.json({ ok: true, used: result.used_count });
}
