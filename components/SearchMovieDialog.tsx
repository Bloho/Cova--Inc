"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Movie } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";

type SearchStatus = "idle" | "closing" | "routing";

export function SearchMovieDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");

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
    const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query.trim())}`).catch(() => null);
    const data = response?.ok ? ((await response.json()) as { results: Movie[] }) : { results: [] };
    setMovies(data.results ?? []);
    setBusy(false);
    if (!response?.ok) {
      setMessage("Could not search movies right now.");
    }
  }

  function closeDialog() {
    if (status !== "idle") {
      return;
    }

    setStatus("closing");
    window.setTimeout(() => {
      setQuery("");
      setMovies([]);
      setMessage("");
      setStatus("idle");
      onClose();
    }, 240);
  }

  function openMovie(movie: Movie) {
    setStatus("routing");
    window.covaProgressStart?.();
    window.setTimeout(() => {
      router.push(`/movie/${movie.tmdbId}`);
      onClose();
      setStatus("idle");
    }, 160);
  }

  return (
    <div
      className={`modal-backdrop log-modal-backdrop search-modal-backdrop${status === "closing" ? " closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Search movies"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
    >
      <div className={`log-dialog search-dialog${status === "routing" ? " search-dialog-routing" : ""}`}>
        <div className="dialog-head">
          <strong>{query.trim() ? query.trim().toUpperCase() : "Search movies"}</strong>
          <button className="icon-button" onClick={closeDialog} aria-label="Close search" disabled={status !== "idle"}>
            <X size={20} />
          </button>
        </div>
        <div className="log-stage-shell">
          <form className="search-form" onSubmit={search}>
            <input
              className="input log-search-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setMessage("");
                if (!event.target.value.trim()) {
                  setMovies([]);
                }
              }}
              placeholder="Search your film here..."
              autoFocus
            />
            <button className="log-search-submit" disabled={busy || !query.trim()} type="submit" aria-label="Search films">
              <Search size={18} />
            </button>
          </form>
          <div className="log-stage log-stage-results">
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
                    <button key={movie.tmdbId} className="log-result" onClick={() => openMovie(movie)} type="button">
                      <span>
                        <strong>{movie.title}</strong>
                        <small>{movie.releaseYear}</small>
                      </span>
                    </button>
                  ))}
              {!busy && query.trim() && movies.length === 0 ? <div className="empty-state">No movies found.</div> : null}
            </div>
          </div>
          {message ? <p className="form-message">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
