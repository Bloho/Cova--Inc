"use client";

import { useState } from "react";
import { MAX_RATING, normalizeRating } from "@/lib/ratings";

export function RatingInput({
  value,
  onChange,
  disabled = false,
  compact = false,
  label = "Rating"
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating ?? value;

  function ratingFromPointer(event: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>, star: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left <= rect.width / 2;
    return normalizeRating(star - (isLeftHalf ? 0.5 : 0));
  }

  return (
    <div className={`rating-picker${compact ? " compact" : ""}`} aria-label={label} onPointerLeave={() => setHoverRating(null)}>
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const star = index + 1;
        const fill = Math.max(0, Math.min(1, displayRating - index));

        return (
          <button
            key={star}
            type="button"
            className={fill > 0 ? "active" : ""}
            disabled={disabled}
            aria-label={`${star - 0.5} or ${star} stars`}
            onPointerMove={(event) => setHoverRating(ratingFromPointer(event, star))}
            onClick={(event) => onChange(ratingFromPointer(event, star))}
          >
            <span className="star-shell" aria-hidden>
              <span className="star-empty">★</span>
              <span className="star-fill" style={{ width: `${fill * 100}%` }}>
                ★
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
