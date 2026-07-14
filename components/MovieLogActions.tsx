"use client";

import { ArrowLeft, MessageCircle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MovieCardGenerator } from "@/components/MovieCardGenerator";
import { RatingInput } from "@/components/RatingInput";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { normalizeRating } from "@/lib/ratings";
import { countReviewWords, MAX_REVIEW_WORDS } from "@/lib/reviews";

type MovieDialogState = "closed" | "review" | "saving" | "success" | "share" | "watchConfirm" | "watchRemoving" | "closing";
type ExistingReview = {
  id: string;
  body: string;
  rating: number | null;
  created_at: string;
  updated_at?: string | null;
};

export function MovieLogActions({
  movie,
  isSignedIn,
  initialRating = 0,
  initialReviewed = false,
  initialReview = null,
  username
}: {
  movie: Movie;
  isSignedIn: boolean;
  initialRating?: number;
  initialReviewed?: boolean;
  initialReview?: ExistingReview | null;
  username?: string | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(normalizeRating(initialRating));
  const [review, setReview] = useState("");
  const [dialogState, setDialogState] = useState<MovieDialogState>("closed");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDeleting, setDrawerDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(initialReview);
  const [reviewed, setReviewed] = useState(initialReviewed || Boolean(initialReview) || initialRating > 0);
  const [message, setMessage] = useState("");
  const reviewWordCount = countReviewWords(review);
  const reviewTooLong = reviewWordCount > MAX_REVIEW_WORDS;
  const dialogOpen = dialogState !== "closed";
  const reviewedOn = existingReview ? formatReviewDate(existingReview.updated_at ?? existingReview.created_at) : "";
  const drawerRating = normalizeRating(Number(existingReview?.rating ?? rating ?? 0));
  const drawerRatingPercent = (drawerRating / 5) * 100;

  function openReview(nextRating = rating) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    if (existingReview) {
      setDrawerOpen(true);
      return;
    }

    setRating(normalizeRating(nextRating));
    setReview("");
    setMessage("");
    setDialogState("review");
  }

  function editReview() {
    if (!existingReview) {
      return;
    }

    setDrawerOpen(false);
    setRating(normalizeRating(Number(existingReview.rating ?? rating)));
    setReview(existingReview.body);
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
      const now = new Date().toISOString();
      setRating(savedRating);
      setReviewed(true);
      if (review.trim()) {
        setExistingReview({
          id: existingReview?.id ?? "current-review",
          body: review.trim(),
          rating: savedRating || null,
          created_at: existingReview?.created_at ?? now,
          updated_at: now
        });
      }
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

  async function deleteReview() {
    if (!existingReview || drawerDeleting) {
      return;
    }

    setDrawerDeleting(true);
    setMessage("");

    const response = await fetch("/api/review", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: movie.tmdbId })
    });

    if (response.ok) {
      setExistingReview(null);
      setReview("");
      setReviewed(Boolean(rating));
      router.refresh();
      window.setTimeout(() => {
        setDrawerOpen(false);
      }, 520);
      window.setTimeout(() => {
        setDrawerDeleting(false);
      }, 820);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setMessage(data.error ?? "Could not delete this review.");
    setDrawerDeleting(false);
  }

  async function removeFromWatchlist() {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setMessage("");
    setDialogState("watchRemoving");
    const response = await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: movie.tmdbId })
    });

    if (response.ok) {
      setReviewed(false);
      setExistingReview(null);
      setReview("");
      setRating(0);
      router.refresh();
      window.setTimeout(() => setDialogState("closing"), 620);
      window.setTimeout(() => {
        setDialogState("closed");
      }, 900);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setMessage(data.error ?? "Could not remove this movie.");
    setDialogState("watchConfirm");
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
        <button className="pill-button secondary" disabled={busy} onClick={() => {
          if (existingReview?.body.trim()) {
            setDialogState("share");
            return;
          }
          openReview();
          setMessage("Write a review before sharing a movie card.");
        }} type="button">
          <Share2 size={18} />
          Share card
        </button>
      </div>
      {reviewed ? (
        <div className="movie-status-row">
          <button className="watched-badge-button" onClick={() => setDialogState("watchConfirm")} type="button">
            <Badge variant="sky">Watched</Badge>
          </button>
        </div>
      ) : null}

      <Drawer open={drawerOpen} onOpenChange={(open) => {
        if (!drawerDeleting) {
          setDrawerOpen(open);
        }
      }}>
        <DrawerContent className={drawerDeleting ? "deleting" : ""} onOpenChange={(open) => {
          if (!drawerDeleting) {
            setDrawerOpen(open);
          }
        }}>
          <DrawerHeader>
            <DrawerTitle>{reviewedOn ? `Reviewed on ${reviewedOn}` : "Your review"}</DrawerTitle>
            <button className="drawer-edit-button" disabled={drawerDeleting} onClick={editReview} type="button">
              Edit
            </button>
          </DrawerHeader>
          <div className="drawer-review-body">
            <div className="drawer-rating-summary">
              <strong>You rated this movie:</strong>
              <div className="radial-score drawer-rating-score user-score" aria-label={`Your rating ${drawerRating.toFixed(1)} out of 5`}>
                <svg viewBox="0 0 64 64" aria-hidden>
                  <circle className="score-ring-track" cx="32" cy="32" r="25" pathLength="100" />
                  <circle className="score-ring-value" cx="32" cy="32" r="25" pathLength="100" strokeDasharray={`${drawerRatingPercent} 100`} />
                </svg>
                <span>{drawerRating.toFixed(1)}</span>
              </div>
            </div>
            <p>{existingReview?.body}</p>
          </div>
          <div className="drawer-footer">
            <button className="drawer-close-button" disabled={drawerDeleting} onClick={() => setDrawerOpen(false)} type="button">
              Close
            </button>
            <button className="drawer-delete-button" disabled={drawerDeleting} onClick={deleteReview} aria-label="Delete review" type="button">
              <img src="/utilities/bin.svg" alt="" />
            </button>
          </div>
          {drawerDeleting ? (
            <div className="drawer-loading-state" aria-live="polite" aria-label="Deleting review">
              <span className="log-spinner" />
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      {dialogOpen ? (
        <div className={`modal-backdrop movie-modal-backdrop${dialogState === "closing" ? " closing" : ""}`} role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}>
          {dialogState === "share" ? (
            <MovieCardGenerator
              movie={movie}
              review={existingReview?.body ?? ""}
              rating={Number(existingReview?.rating ?? rating)}
              username={username}
              onClose={closeDialog}
            />
          ) : dialogState === "watchConfirm" || dialogState === "watchRemoving" ? (
            <div className="watchlist-remove-dialog">
              {dialogState === "watchRemoving" ? (
                <div className="log-feedback">
                  <h2>Removing movie</h2>
                  <span className="log-spinner" aria-label="Removing movie" />
                </div>
              ) : (
                <>
                  <h2>Are you sure you want to remove this movie from your watchlist?</h2>
                  <div className="watchlist-remove-actions">
                    <button className="card-modal-button compact" onClick={closeDialog} type="button">
                      Cancel
                    </button>
                    <button className="card-modal-button compact primary" onClick={removeFromWatchlist} type="button">
                      Confirm
                    </button>
                  </div>
                  {message ? <p className="form-message">{message}</p> : null}
                </>
              )}
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

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
