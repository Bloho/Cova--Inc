"use client";

import Link from "next/link";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MoviePoster({ movie, dense = false, isSignedIn = false, showYear = true, showTooltip = false }: { movie: Movie; dense?: boolean; isSignedIn?: boolean; showYear?: boolean; showTooltip?: boolean }) {
  const watched = Boolean(movie.watched);

  const card = (
    <article className={`poster-card${watched ? " watched" : ""}`} style={{ minHeight: dense ? 188 : undefined }}>
      <Link className="poster-link" href={`/movie/${movie.tmdbId}`} aria-label={`${movie.title} details`} prefetch>
        <img className="poster-image" src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} loading="lazy" />
      </Link>
      {movie.reviewer || showYear ? (
        <div className="poster-meta">
          <span>{movie.reviewer ?? movie.releaseYear}</span>
        </div>
      ) : null}
    </article>
  );

  if (!showTooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={0} className="home-poster-tooltip">
        {movie.title}
      </TooltipContent>
    </Tooltip>
  );
}
