"use client";

import Link from "next/link";
import { Check, Eye, MessageCircle } from "lucide-react";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MoviePoster({ movie, dense = false, isSignedIn = false }: { movie: Movie; dense?: boolean; isSignedIn?: boolean }) {
  const router = useRouter();
  const [watched, setWatched] = useState(Boolean(movie.watched));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  async function log(nextReview = review) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movie,
        rating: movie.userRating ?? 0,
        review: nextReview.trim()
      })
    });

    if (response.ok) {
      setWatched(true);
      router.refresh();
    }

    setBusy(false);
  }

  return (
    <article className={`poster-card${watched ? " watched" : ""}`} title={movie.title} style={{ minHeight: dense ? 188 : undefined }}>
      <Link className="poster-link" href={`/movie/${movie.tmdbId}`} aria-label={`${movie.title} details`}>
        <img className="poster-image" src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} loading="lazy" />
      </Link>
      <div className="poster-meta">
        <span>{movie.reviewer ?? movie.releaseYear}</span>
      </div>
      <div className="poster-actions">
        <button aria-label={`Log ${movie.title}`} className={watched ? "active" : ""} disabled={busy} onClick={() => log("")}>
          {watched ? <Check size={16} /> : <Eye size={16} />}
        </button>
        <button aria-label={`Review ${movie.title}`} className={movie.reviewed ? "active" : ""} disabled={busy} onClick={() => setReviewOpen(true)}>
          <MessageCircle size={16} />
        </button>
      </div>
      {reviewOpen ? (
        <div className="review-popover">
          <strong>{movie.title}</strong>
          <textarea value={review} placeholder="Write a review..." onChange={(event) => setReview(event.target.value)} />
          <button
            className="pill-button"
            disabled={busy || !review.trim()}
            onClick={async () => {
              await log(review);
              setReviewOpen(false);
            }}
          >
            Save review
          </button>
        </div>
      ) : null}
    </article>
  );
}
