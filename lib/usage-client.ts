"use client";

import { isLimitResponse, openUpgradePrompt } from "@/lib/upgrade-prompt";

export type UsageFeature = "movie_share_card" | "profile_card_export";

export async function consumeFreeUsage(feature: UsageFeature, tmdbId?: number) {
  const response = await fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature, tmdbId })
  });
  const data = await response.json().catch(() => ({}));

  if (response.ok) return true;
  if (isLimitResponse(data)) {
    openUpgradePrompt(data.feature);
    return false;
  }

  throw new Error(data.error ?? "We could not check your plan limit. Please try again.");
}
