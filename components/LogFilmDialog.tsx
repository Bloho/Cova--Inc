"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { normalizeRating } from "@/lib/ratings";
import { countReviewWords, MAX_REVIEW_WORDS } from "@/lib/reviews";
import { RatingInput } from "@/components/RatingInput";
import { Skeleton } from "@/components/ui/skeleton";

type LogStep = "search" | "results" | "review";
type LogStatus = "idle" | "saving" | "success" | "closing";

export function LogFilmDialog({
  open,
  onClose,
  isSignedIn
}: {
  open: boolean;
  onClose: () => void;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<LogStep>("search");
  const [status, setStatus] = useState<LogStatus>("idle");

  const canSave = useMemo(() => Boolean(selected && isSignedIn), [selected, isSignedIn]);
  const reviewWordCount = countReviewWords(review);
  const reviewTooLong = reviewWordCount > MAX_REVIEW_WORDS;

  if (!open) {
    return null;
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!query.trim()) {
      setMovies([]);
      setStep("search");
      return;
    }

    setBusy(true);
    setStep("results");
    const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query.trim())}`).catch(() => null);
    const data = response?.ok ? ((await response.json()) as { results: Movie[] }) : { results: [] };
    setMovies(data.results ?? []);
    setBusy(false);
  }

  function selectMovie(movie: Movie) {
    setSelected(movie);
    setRating(0);
    setReview("");
    setMessage("");
    setStep("review");
  }

  function resetDialog() {
    setQuery("");
    setMovies([]);
    setSelected(null);
    setRating(0);
    setReview("");
    setMessage("");
    setBusy(false);
    setStep("search");
    setStatus("idle");
  }

  async function save() {
    if (!selected) {
      return;
    }

    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setBusy(true);
    setMessage("");

    if (reviewTooLong) {
      setMessage(`Reviews can be up to ${MAX_REVIEW_WORDS} words.`);
      setBusy(false);
      return;
    }

    setStatus("saving");
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movie: selected,
        rating,
        review: review.trim()
      })
    });

    if (response.ok) {
      router.refresh();
      window.setTimeout(() => {
        setStatus("success");
      }, 650);
      window.setTimeout(() => {
        setStatus("closing");
      }, 1450);
      window.setTimeout(() => {
        resetDialog();
        onClose();
      }, 1750);
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "Could not log this film.");
      setStatus("idle");
      setBusy(false);
    }
  }

  function closeDialog() {
    if (status !== "idle") {
      return;
    }

    setStatus("closing");
    window.setTimeout(() => {
      resetDialog();
      onClose();
    }, 240);
  }

  return (
    <div
      className={`modal-backdrop log-modal-backdrop${status === "closing" ? " closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Log a film"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
    >
      <div className={`log-dialog log-dialog-${status === "saving" || status === "success" ? status : step}`}>
        <div className="dialog-head">
          {status === "saving" || status === "success" ? null : step === "review" ? (
            <button className="text-button log-back" onClick={() => setStep(movies.length ? "results" : "search")} type="button">
              <ArrowLeft size={18} />
              Back
            </button>
          ) : (
            <strong>{step === "results" ? query.trim().toUpperCase() : "Add your film!"}</strong>
          )}
          {status === "idle" ? (
            <button className="icon-button" onClick={closeDialog} aria-label="Close">
              <X size={20} />
            </button>
          ) : null}
        </div>

        {!isSignedIn ? (
          <div className="empty-state">
            <p>Sign in to log films, rate them, and publish reviews to your profile.</p>
            <Link className="pill-button" href="/login">
              Sign in
            </Link>
          </div>
        ) : (
          <div className="log-stage-shell">
            {status === "idle" ? (
              <form className="search-form" onSubmit={search}>
                <input
                  className="input log-search-input"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setMessage("");
                    if (!event.target.value.trim()) {
                      setMovies([]);
                      setStep("search");
                    }
                  }}
                  placeholder="Search your film here..."
                />
                <button className="log-search-submit" disabled={busy || !query.trim()} type="submit" aria-label="Search films">
                  <Search size={18} />
                </button>
              </form>
            ) : null}

            <div className={`log-stage log-stage-${status === "idle" ? step : status}`}>
              {status === "saving" ? (
                <div className="log-feedback">
                  <h2>Your movie is being added</h2>
                  <span className="log-spinner" aria-label="Adding movie" />
                </div>
              ) : null}

              {status === "success" ? (
                <div className="log-feedback">
                  <h2>Your movie has been added!</h2>
                  <img className="log-success-mark" src="/utilities/Checkmark.png" alt="" />
                </div>
              ) : null}

              {status === "idle" && step === "results" ? (
                <div className="log-results">
                  {busy && query.trim()
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div className="log-result skeleton-log-result" key={index}>
                          <span>
                            <Skeleton className="skeleton-line medium" />
                            <Skeleton className="skeleton-line short" />
                          </span>
                        </div>
                      ))
                    : movies.map((movie) => (
                        <button key={movie.tmdbId} className="log-result" onClick={() => selectMovie(movie)}>
                          <span>
                            <strong>{movie.title}</strong>
                            <small>{movie.releaseYear}</small>
                          </span>
                        </button>
                      ))}
                </div>
              ) : null}

              {status === "idle" && step === "review" && selected ? (
                <div className="log-editor">
                  <div className="selected-film">
                    <img src={posterUrl(selected.posterPath, "w185")} alt={`${selected.title} poster`} />
                    <div>
                      <strong>{selected.title}</strong>
                      <span>{selected.releaseYear}</span>
                    </div>
                  </div>
                  <RatingInput value={rating} onChange={(value) => setRating(normalizeRating(value))} disabled={busy} label={`Rate ${selected.title}`} />
                  <div className="log-review-box">
                    <textarea
                      value={review}
                      onChange={(event) => setReview(event.target.value)}
                      placeholder="Write your review..."
                      maxLength={5000}
                    />
                    <div className={`review-limit${reviewTooLong ? " over" : ""}`}>
                      {reviewWordCount}/{MAX_REVIEW_WORDS}
                    </div>
                  </div>
                  <button className="pill-button log-complete-button" disabled={!canSave || busy || reviewTooLong} onClick={save}>
                    Complete
                  </button>
                </div>
              ) : null}
            </div>

            {message ? <p className="form-message">{message}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
