"use client";

import { MessageCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Movie } from "@/lib/data";

export function MovieLogActions({
  movie,
  isSignedIn,
  initialRating = 0
}: {
  movie: Movie;
  isSignedIn: boolean;
  initialRating?: number;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(nextRating = rating, nextReview = review) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie, rating: nextRating, review: nextReview.trim() })
    });

    if (response.ok) {
      router.refresh();
      setOpen(false);
    }

    setBusy(false);
  }

  return (
    <div className="movie-log-panel">
      <div className="rating-picker compact" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            className={value <= rating ? "active" : ""}
            disabled={busy}
            onClick={() => {
              setRating(value);
              void save(value, "");
            }}
          >
            <Star size={18} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <button className="pill-button secondary" disabled={busy} onClick={() => setOpen((current) => !current)}>
        <MessageCircle size={18} />
        Review
      </button>
      {open ? (
        <div className="inline-review glass">
          <textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Write a review..." />
          <button className="pill-button" disabled={busy || !review.trim()} onClick={() => save(rating, review)}>
            Save review
          </button>
        </div>
      ) : null}
    </div>
  );
}
