export const MAX_REVIEW_WORDS = 1000;

export function countReviewWords(review: string) {
  return review.trim().split(/\s+/).filter(Boolean).length;
}
