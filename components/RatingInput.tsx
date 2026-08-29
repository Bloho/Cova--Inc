"use client";

import { Rating } from "@/components/ui/rating";

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
  return (
    <Rating
      className={compact ? "compact" : undefined}
      disabled={disabled}
      precision={0.5}
      size={compact ? 39 : 48}
      value={value}
      onValueChange={onChange}
      aria-label={label}
    />
  );
}
