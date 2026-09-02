"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { posterUrl, type Movie } from "@/lib/data";
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
  const [resultsQuery, setResultsQuery] = useState("");
  const debounceTimerRef = useRef<number | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchRequestRef = useRef(0);

  const searchMovies = useCallback(async (searchTerm: string) => {
    const trimmedQuery = searchTerm.trim();

    if (!trimmedQuery) {
      searchControllerRef.current?.abort();
      searchRequestRef.current += 1;
      setMovies([]);
      setResultsQuery("");
      setBusy(false);
      return;
    }

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    searchControllerRef.current = controller;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal });
      const data = response.ok ? ((await response.json()) as { results: Movie[] }) : { results: [] };

      if (controller.signal.aborted || requestId !== searchRequestRef.current) return;

      setMovies(data.results ?? []);
      setResultsQuery(trimmedQuery);
      if (!response.ok) {
        setMessage("Could not search movies right now.");
      }
    } catch {
      if (controller.signal.aborted || requestId !== searchRequestRef.current) return;

      setMovies([]);
      setResultsQuery(trimmedQuery);
      setMessage("Could not search movies right now.");
    } finally {
      if (requestId === searchRequestRef.current) {
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      void searchMovies("");
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void searchMovies(trimmedQuery);
    }, 350);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [open, query, searchMovies]);

  useEffect(() => () => {
    searchControllerRef.current?.abort();
  }, []);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void searchMovies(query);
  }

  function closeDialog() {
    if (status !== "idle") {
      return;
    }

    setStatus("closing");
    searchControllerRef.current?.abort();
    searchRequestRef.current += 1;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    window.setTimeout(() => {
      setQuery("");
      setMovies([]);
      setResultsQuery("");
      setMessage("");
      setStatus("idle");
      onClose();
    }, 240);
  }

  function openMovie(movie: Movie) {
    setStatus("routing");
    window.covaProgressRouteStart?.();
    window.setTimeout(() => {
      router.push(`/movie/${movie.tmdbId}`);
      onClose();
      setStatus("idle");
    }, 160);
  }

  if (!open) {
    return null;
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
              }}
              placeholder="Search your film here..."
              autoFocus
            />
            <button className="log-search-submit" disabled={busy || !query.trim()} type="submit" aria-label="Search films">
              <Search size={18} />
            </button>
          </form>
          <div className="log-stage log-stage-results">
            <div className="log-results search-results">
              {busy && query.trim()
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div className="log-result skeleton-log-result" key={index}>
                      <Skeleton className="search-result-poster-skeleton" />
                      <span>
                        <Skeleton className="skeleton-line medium" />
                        <Skeleton className="skeleton-line short" />
                      </span>
                    </div>
                  ))
                : resultsQuery === query.trim() ? movies.map((movie) => (
                    <button key={movie.tmdbId} className="log-result" onClick={() => openMovie(movie)} type="button">
                      <img src={posterUrl(movie.posterPath, "w92")} alt="" />
                      <span>
                        <strong>{movie.title}</strong>
                        <small>{movie.releaseYear}</small>
                      </span>
                    </button>
                  )) : null}
              {!busy && query.trim() && resultsQuery === query.trim() && movies.length === 0 ? (
                <div className="search-empty-state" role="status">
                  <img src="/assets/error.png" alt="" />
                  <p>We couldnt find anything</p>
                </div>
              ) : null}
            </div>
          </div>
          {message ? <p className="form-message">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
