export const MAX_RATING = 5;
export const RATING_STEP = 0.5;

export function normalizeRating(value: unknown) {
  const rating = Number(value ?? 0);

  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_RATING, Math.round(rating / RATING_STEP) * RATING_STEP));
}

export function formatRatingStars(value: unknown) {
  const rating = normalizeRating(value);
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  const emptyStars = MAX_RATING - fullStars - (hasHalf ? 1 : 0);

  return `${"★".repeat(fullStars)}${hasHalf ? "½" : ""}${"☆".repeat(emptyStars)}`;
}
