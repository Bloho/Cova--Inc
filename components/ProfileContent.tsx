"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaginatedFilms } from "@/components/PaginatedFilms";
import { MoviePoster } from "@/components/MoviePoster";
import { ClassicSpinner } from "@/components/ui/classic-spinner";
import { posterUrl, type Movie } from "@/lib/data";
import { PROFILE_MOVIE_PAGE_SIZE } from "@/lib/profile-movies";
import { PROFILE_REVIEW_PAGE_SIZE, type ProfileReviewItem } from "@/lib/profile-reviews";

export type ProfileTab = "reviews" | "favourites" | "wishlist" | "movies";

type ProfileContentProps = {
  username: string;
  displayName: string;
  initialTab: ProfileTab;
  initialReviews: ProfileReviewItem[];
  initialReviewsHaveMore: boolean;
  favouriteMovies: Movie[];
  initialMovies: Movie[];
  initialMoviesHaveMore: boolean;
  wishlistMovies: Movie[];
  isSignedIn: boolean;
};

export function ProfileContent({
  username,
  displayName,
  initialTab,
  initialReviews,
  initialReviewsHaveMore,
  favouriteMovies,
  initialMovies,
  initialMoviesHaveMore,
  wishlistMovies,
  isSignedIn
}: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [reviews, setReviews] = useState(initialReviews);
  const [hasMoreReviews, setHasMoreReviews] = useState(initialReviewsHaveMore);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const selectTab = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    const url = tab === "reviews" ? `/${username}` : `/${username}?tab=${tab}`;
    window.history.pushState({ tab }, "", url);
  }, [username]);

  useEffect(() => {
    const handlePopState = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveTab(tab === "favourites" || tab === "wishlist" || tab === "movies" ? tab : "reviews");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadMoreReviews = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreReviews) return;

    isLoadingRef.current = true;
    setIsLoadingReviews(true);

    try {
      const response = await fetch(
        `/api/profile/${encodeURIComponent(username)}/reviews?offset=${reviews.length}&limit=${PROFILE_REVIEW_PAGE_SIZE}`,
        { cache: "no-store" }
      );

      if (!response.ok) return;

      const payload = await response.json() as { reviews?: ProfileReviewItem[]; hasMore?: boolean };
      setReviews((current) => [...current, ...(payload.reviews ?? [])]);
      setHasMoreReviews(Boolean(payload.hasMore));
    } finally {
      isLoadingRef.current = false;
      setIsLoadingReviews(false);
    }
  }, [hasMoreReviews, reviews.length, username]);

  useEffect(() => {
    if (activeTab !== "reviews" || !hasMoreReviews || !loaderRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMoreReviews();
    }, { rootMargin: "360px 0px" });

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [activeTab, hasMoreReviews, loadMoreReviews]);

  return (
    <>
      <nav className="profile-tabs" aria-label="Profile collections" role="tablist">
        <ProfileTabButton active={activeTab === "reviews"} onClick={() => selectTab("reviews")}>Reviews</ProfileTabButton>
        <ProfileTabButton active={activeTab === "favourites"} onClick={() => selectTab("favourites")}>Favourites</ProfileTabButton>
        <ProfileTabButton active={activeTab === "wishlist"} onClick={() => selectTab("wishlist")}>Wishlist</ProfileTabButton>
        <ProfileTabButton active={activeTab === "movies"} onClick={() => selectTab("movies")}>Movies</ProfileTabButton>
      </nav>

      {activeTab === "reviews" ? (
        <section className="profile-review-feed" aria-label={`${displayName}'s reviews`} role="tabpanel">
          {reviews.length ? reviews.map((review) => <ProfileReviewRow displayName={displayName} key={review.id} review={review} username={username} />) : (
            <div className="profile-tab-empty">No public reviews yet.</div>
          )}
          {hasMoreReviews || isLoadingReviews ? (
            <div className="profile-review-loader" ref={loaderRef} aria-live="polite">
              {isLoadingReviews ? <ClassicSpinner theme="dark" /> : null}
            </div>
          ) : null}
        </section>
      ) : activeTab === "movies" ? (
        <InfiniteProfileMovieGrid
          initialHasMore={initialMoviesHaveMore}
          initialMovies={initialMovies}
          isSignedIn={isSignedIn}
          username={username}
        />
      ) : (
        <section className="profile-tab-films" aria-label={`${displayName}'s ${activeTab}`} role="tabpanel">
          <PaginatedFilms
            isSignedIn={isSignedIn}
            itemsPerPage={24}
            movies={activeTab === "favourites" ? favouriteMovies : wishlistMovies}
            showReviewTooltip={false}
            showYears={false}
          />
        </section>
      )}
    </>
  );
}

function InfiniteProfileMovieGrid({
  initialHasMore,
  initialMovies,
  isSignedIn,
  username
}: {
  initialHasMore: boolean;
  initialMovies: Movie[];
  isSignedIn: boolean;
  username: string;
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const movieCountRef = useRef(initialMovies.length);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/profile/${encodeURIComponent(username)}/movies?offset=${movieCountRef.current}&limit=${PROFILE_MOVIE_PAGE_SIZE}`,
        { cache: "no-store" }
      );

      if (!response.ok) return;

      const payload = await response.json() as { movies?: Movie[]; hasMore?: boolean };
      const nextMovies = payload.movies ?? [];
      movieCountRef.current += nextMovies.length;
      setMovies((current) => [...current, ...nextMovies]);
      setHasMore(Boolean(payload.hasMore));
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, username]);

  useEffect(() => {
    let animationFrame: number | null = null;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();

    function onScroll() {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const now = performance.now();
        const currentScrollY = window.scrollY;
        const distanceScrolled = currentScrollY - lastScrollY;
        const elapsed = Math.max(now - lastScrollTime, 1);
        lastScrollY = currentScrollY;
        lastScrollTime = now;

        if (distanceScrolled <= 0 || !sentinelRef.current || isLoadingRef.current || !hasMore) return;

        // Faster downward motion starts the next small batch earlier, but never chains requests while idle.
        const scrollSpeed = distanceScrolled / elapsed;
        const prefetchDistance = Math.min(900, Math.max(260, 260 + scrollSpeed * 720));
        const distanceToSentinel = sentinelRef.current.getBoundingClientRect().top - window.innerHeight;

        if (distanceToSentinel <= prefetchDistance) {
          void loadMore();
        }
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [hasMore, loadMore]);

  return (
    <section className="profile-tab-films profile-movies-feed" aria-label="Movies" role="tabpanel">
      {movies.length ? (
        <div className="poster-grid">
          {movies.map((movie, index) => (
            <MoviePoster dense isSignedIn={isSignedIn} key={`${movie.tmdbId}-${index}`} movie={movie} showTooltip={false} showYear={false} />
          ))}
        </div>
      ) : <div className="profile-tab-empty">No films logged yet.</div>}

      {hasMore || isLoading ? (
        <div className="profile-movies-loader" ref={sentinelRef} aria-live="polite">
          {isLoading ? <ClassicSpinner theme="dark" /> : null}
        </div>
      ) : null}
    </section>
  );
}

function ProfileTabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button aria-selected={active} className={active ? "active" : undefined} onClick={onClick} role="tab" type="button">
      {children}
    </button>
  );
}

function ProfileReviewRow({ displayName, review, username }: { displayName: string; review: ProfileReviewItem; username: string }) {
  return (
    <article className="profile-review-row">
      {review.movie?.posterPath ? <img className="profile-review-poster" src={posterUrl(review.movie.posterPath, "w342")} alt={`${review.movie.title} poster`} /> : <div className="profile-review-poster" aria-hidden />}
      <div className="profile-review-copy">
        <p className="profile-review-meta">
          <strong>{displayName}</strong><span>@{username}</span><span>{review.movie?.title ?? "Film"}</span><time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
        </p>
        <p className="profile-review-quote">{formatReviewQuote(review.body)}</p>
      </div>
    </article>
  );
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatReviewQuote(body: string | null) {
  const text = (body ?? "").trim();
  return text || "No written review.";
}
