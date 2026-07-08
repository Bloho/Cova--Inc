"use client";

import { ArrowLeft, MessageCircle, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingInput } from "@/components/RatingInput";
import { Badge } from "@/components/ui/badge";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { normalizeRating } from "@/lib/ratings";
import { countReviewWords, MAX_REVIEW_WORDS } from "@/lib/reviews";

type MovieDialogState = "closed" | "review" | "saving" | "success" | "share" | "closing";

export function MovieLogActions({
  movie,
  isSignedIn,
  initialRating = 0,
  initialReviewed = false
}: {
  movie: Movie;
  isSignedIn: boolean;
  initialRating?: number;
  initialReviewed?: boolean;
  username?: string | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(normalizeRating(initialRating));
  const [review, setReview] = useState("");
  const [dialogState, setDialogState] = useState<MovieDialogState>("closed");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [message, setMessage] = useState("");
  const reviewWordCount = countReviewWords(review);
  const reviewTooLong = reviewWordCount > MAX_REVIEW_WORDS;
  const dialogOpen = dialogState !== "closed";

  function openReview(nextRating = rating) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setRating(normalizeRating(nextRating));
    setMessage("");
    setDialogState("review");
  }

  function closeDialog() {
    if (busy) {
      return;
    }

    setDialogState("closing");
    window.setTimeout(() => {
      setDialogState("closed");
      setMessage("");
    }, 240);
  }

  async function save() {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    if (reviewTooLong) {
      setMessage(`Reviews can be up to ${MAX_REVIEW_WORDS} words.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setDialogState("saving");
    const savedRating = normalizeRating(rating);
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie, rating: savedRating, review: review.trim() })
    });

    if (response.ok) {
      setRating(savedRating);
      setReviewed(true);
      router.refresh();
      window.setTimeout(() => setDialogState("success"), 650);
      window.setTimeout(() => setDialogState("closing"), 1450);
      window.setTimeout(() => {
        setDialogState("closed");
        setBusy(false);
        setReview("");
      }, 1750);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setMessage(data.error ?? "Could not log this film.");
    setDialogState("review");
    setBusy(false);
  }

  return (
    <>
      <div className="movie-log-panel">
        <RatingInput
          value={rating}
          compact
          disabled={busy}
          label="Your rating"
          onChange={(value) => openReview(value)}
        />
        <button className="pill-button secondary" disabled={busy} onClick={() => openReview()} type="button">
          <MessageCircle size={18} />
          Review
        </button>
        <button className="pill-button secondary" disabled={busy} onClick={() => setDialogState("share")} type="button">
          <Share2 size={18} />
          Share card
        </button>
        {reviewed ? <Badge variant="sky">Watched</Badge> : null}
      </div>

      {dialogOpen ? (
        <div className={`modal-backdrop movie-modal-backdrop${dialogState === "closing" ? " closing" : ""}`} role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}>
          {dialogState === "share" ? (
            <div className="movie-beta-dialog">
              <h2>Movie cards will be introduced in the next beta. Stay tuned!</h2>
              <button className="movie-beta-close" onClick={closeDialog} aria-label="Close movie card notice" type="button">
                <X size={34} />
              </button>
            </div>
          ) : (
            <div className={`movie-review-dialog movie-review-dialog-${dialogState}`}>
              {dialogState === "review" ? (
                <>
                  <button className="text-button log-back movie-dialog-back" onClick={closeDialog} type="button">
                    <ArrowLeft size={18} />
                    Back
                  </button>
                  <div className="movie-review-head">
                    <img src={posterUrl(movie.posterPath, "w185")} alt={`${movie.title} poster`} />
                    <div>
                      <strong>{movie.title}</strong>
                      <span>{movie.releaseYear}</span>
                    </div>
                  </div>
                  <RatingInput value={rating} onChange={(value) => setRating(normalizeRating(value))} disabled={busy} label={`Rate ${movie.title}`} />
                  <div className="log-review-box movie-review-box">
                    <textarea
                      value={review}
                      onChange={(event) => {
                        setReview(event.target.value);
                        setMessage("");
                      }}
                      placeholder="Write your review..."
                      maxLength={5000}
                    />
                    <div className={`review-limit${reviewTooLong ? " over" : ""}`}>
                      {reviewWordCount}/{MAX_REVIEW_WORDS}
                    </div>
                  </div>
                  <button className="pill-button log-complete-button" disabled={busy || reviewTooLong} onClick={save} type="button">
                    Complete
                  </button>
                  {message ? <p className="form-message">{message}</p> : null}
                </>
              ) : null}

              {dialogState === "saving" ? (
                <div className="log-feedback">
                  <h2>Your movie is being added</h2>
                  <span className="log-spinner" aria-label="Adding movie" />
                </div>
              ) : null}

              {dialogState === "success" ? (
                <div className="log-feedback">
                  <h2>Your movie has been added!</h2>
                  <img className="log-success-mark" src="/utilities/Checkmark.png" alt="" />
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
