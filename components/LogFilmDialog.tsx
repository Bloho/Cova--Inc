"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";

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

  const canSave = useMemo(() => Boolean(selected && isSignedIn), [selected, isSignedIn]);

  if (!open) {
    return null;
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!query.trim()) {
      setMovies([]);
      return;
    }

    setBusy(true);
    const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query.trim())}`);
    const data = (await response.json()) as { results: Movie[] };
    setMovies(data.results ?? []);
    setBusy(false);
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
      setMessage("Logged.");
      router.refresh();
      setTimeout(onClose, 350);
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "Could not log this film.");
    }

    setBusy(false);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Log a film">
      <div className="log-dialog">
        <div className="dialog-head">
          <strong>Log a film</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!isSignedIn ? (
          <div className="empty-state">
            <p>Sign in to log films, rate them, and publish reviews to your profile.</p>
            <Link className="pill-button" href="/login">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <form className="search-form" onSubmit={search}>
              <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search TMDB" />
              <button className="pill-button" disabled={busy} type="submit">
                <Search size={18} />
                Search
              </button>
            </form>

            <div className="log-results">
              {movies.map((movie) => (
                <button
                  key={movie.tmdbId}
                  className={`log-result${selected?.tmdbId === movie.tmdbId ? " active" : ""}`}
                  onClick={() => setSelected(movie)}
                >
                  <img src={posterUrl(movie.posterPath, "w185")} alt="" />
                  <span>
                    <strong>{movie.title}</strong>
                    <small>{movie.releaseYear}</small>
                  </span>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="log-editor">
                <div className="rating-picker" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} className={value <= rating ? "active" : ""} onClick={() => setRating(value)}>
                      ★
                    </button>
                  ))}
                </div>
                <textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Review, optional" />
                <button className="pill-button" disabled={!canSave || busy} onClick={save}>
                  Save log
                </button>
              </div>
            ) : null}

            {message ? <p className="form-message">{message}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
