export type LimitedFeature = "reviews" | "wishlist" | "favourites" | "movie_share_card" | "profile_card_export";

export function openUpgradePrompt(feature: LimitedFeature) {
  window.dispatchEvent(new CustomEvent<LimitedFeature>("cova-upgrade-required", { detail: feature }));
}

export function isLimitResponse(value: unknown): value is { code: "FREE_LIMIT_REACHED"; feature: LimitedFeature } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "code" in value &&
      "feature" in value &&
      (value as { code?: string }).code === "FREE_LIMIT_REACHED"
  );
}
