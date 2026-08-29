"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type RatingProps = {
  value: number;
  onValueChange?: (value: number) => void;
  size?: number;
  precision?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

function clampRating(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function roundToPrecision(value: number, precision: number, max: number) {
  return clampRating(Math.round(value / precision) * precision, max);
}

export function Rating({
  value,
  onValueChange,
  size = 24,
  precision = 1,
  max = 5,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Rating"
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const interactive = Boolean(onValueChange) && !disabled;
  const normalizedPrecision = precision > 0 ? precision : 1;
  const currentValue = clampRating(value, max);
  const displayedValue = hoverValue ?? currentValue;

  function getPointerValue(event: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>, index: number) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = clampRating((event.clientX - bounds.left) / bounds.width, 1);
    const valueForStar = index + Math.max(normalizedPrecision, Math.ceil(offset / normalizedPrecision) * normalizedPrecision);
    return roundToPrecision(valueForStar, normalizedPrecision, max);
  }

  function adjustWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!onValueChange) return;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onValueChange(roundToPrecision(currentValue + normalizedPrecision, normalizedPrecision, max));
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onValueChange(roundToPrecision(currentValue - normalizedPrecision, normalizedPrecision, max));
    }

    if (event.key === "Home") {
      event.preventDefault();
      onValueChange(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      onValueChange(max);
    }
  }

  return (
    <div
      className={cn("rating-picker", className)}
      aria-label={`${ariaLabel}: ${displayedValue} out of ${max}`}
      onPointerLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: max }, (_, index) => {
        const fill = Math.max(0, Math.min(1, displayedValue - index));
        const star = (
          <span className="rating-star" style={{ width: size, height: size }} aria-hidden>
            <span className="star-shell" style={{ fontSize: size }}>
              <span className="star-empty">★</span>
              <span className="star-fill" style={{ width: `${fill * 100}%` }}>★</span>
            </span>
          </span>
        );

        if (!interactive) {
          return <span className="rating-readonly-star" key={index}>{star}</span>;
        }

        return (
          <button
            key={index}
            type="button"
            className={fill > 0 ? "active" : undefined}
            disabled={disabled}
            aria-label={`Set rating to ${getAccessibleRange(index, normalizedPrecision, max)}`}
            onPointerMove={(event) => setHoverValue(getPointerValue(event, index))}
            onClick={(event) => onValueChange?.(getPointerValue(event, index))}
            onKeyDown={adjustWithKeyboard}
            style={{ width: size, height: size }}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

function getAccessibleRange(index: number, precision: number, max: number) {
  const from = Math.min(max, index + precision);
  const to = Math.min(max, index + 1);
  return from === to ? `${to} out of ${max}` : `${from} to ${to} out of ${max}`;
}
