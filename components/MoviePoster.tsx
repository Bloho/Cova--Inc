"use client";

import Link from "next/link";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TooltipVariant = "home" | "profile";

export function MoviePoster({
  movie,
  dense = false,
  isSignedIn = false,
  showYear = true,
  showTooltip = false,
  tooltipVariant = "home"
}: {
  movie: Movie;
  dense?: boolean;
  isSignedIn?: boolean;
  showYear?: boolean;
  showTooltip?: boolean;
  tooltipVariant?: TooltipVariant;
}) {
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
      <TooltipContent
        side="top"
        sideOffset={0}
        className={tooltipVariant === "profile" ? "profile-film-tooltip" : "home-poster-tooltip"}
      >
        {tooltipVariant === "profile" ? <ProfileFilmTooltip movie={movie} /> : movie.title}
      </TooltipContent>
    </Tooltip>
  );
}

function ProfileFilmTooltip({ movie }: { movie: Movie }) {
  const rating = Math.max(0, Math.min(5, movie.userRating ?? movie.rating));
  const review = movie.reviewBody?.trim();

  return (
    <div className="profile-film-tooltip-content">
      <p>{review ? `“${review}”` : movie.title}</p>
      <div className="profile-film-tooltip-stars" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.max(0, Math.min(1, rating - index)) * 100;
          return (
            <span className="profile-film-tooltip-star" key={index} aria-hidden>
              <span>★</span>
              <span className="profile-film-tooltip-star-fill" style={{ width: `${fill}%` }}>★</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
