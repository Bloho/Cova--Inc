"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { Rating } from "@/components/ui/rating";
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
  const router = useRouter();
  const prefetched = useRef(false);
  function prefetchOnIntent() {
    if (prefetched.current) return;
    prefetched.current = true;
    router.prefetch(`/movie/${movie.tmdbId}`);
  }

  const card = (
    <article className={`poster-card${watched ? " watched" : ""}`} style={{ minHeight: dense ? 188 : undefined }}>
      <Link className="poster-link" href={`/movie/${movie.tmdbId}`} aria-label={`${movie.title} details`} prefetch={false} onMouseEnter={prefetchOnIntent} onFocus={prefetchOnIntent}>
        <img className="poster-image" src={posterUrl(movie.posterPath, dense ? "w342" : "w500")} alt={`${movie.title} poster`} loading="lazy" decoding="async" width={dense ? 342 : 500} height={dense ? 513 : 750} />
      </Link>
      {showYear ? (
        <div className="poster-meta">
          <span>{movie.releaseYear}</span>
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
      <Rating className="profile-film-tooltip-stars" precision={0.5} size={25} value={rating} aria-label={`${rating} out of 5 stars`} />
    </div>
  );
}
