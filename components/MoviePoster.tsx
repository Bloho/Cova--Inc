"use client";

import Link from "next/link";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";

export function MoviePoster({ movie, dense = false, isSignedIn = false }: { movie: Movie; dense?: boolean; isSignedIn?: boolean }) {
  const watched = Boolean(movie.watched);

  return (
    <article className={`poster-card${watched ? " watched" : ""}`} title={movie.title} style={{ minHeight: dense ? 188 : undefined }}>
      <Link className="poster-link" href={`/movie/${movie.tmdbId}`} aria-label={`${movie.title} details`}>
        <img className="poster-image" src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} loading="lazy" />
      </Link>
      <div className="poster-meta">
        <span>{movie.reviewer ?? movie.releaseYear}</span>
      </div>
    </article>
  );
}
