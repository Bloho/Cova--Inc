"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  favouritesHaveMore?: boolean;
  wishlistHasMore?: boolean;
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
  favouritesHaveMore = false,
  wishlistHasMore = false,
  initialMovies,
  initialMoviesHaveMore,
  wishlistMovies,
  isSignedIn
}: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [visited, setVisited] = useState<ProfileTab[]>([initialTab]);
  useEffect(() => { setVisited(current => current.includes(activeTab) ? current : [...current, activeTab]); }, [activeTab]);
  const [reviews, setReviews] = useState(initialReviews);
  const [hasMoreReviews, setHasMoreReviews] = useState(initialReviewsHaveMore);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState(false);
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
    setReviewsError(false);

    try {
      const response = await fetch(
        `/api/profile/${encodeURIComponent(username)}/reviews?offset=${reviews.length}&limit=${PROFILE_REVIEW_PAGE_SIZE}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error("Could not load reviews");

      const payload = await response.json() as { reviews?: ProfileReviewItem[]; hasMore?: boolean };
      setReviews((current) => [...current, ...(payload.reviews ?? [])]);
      setHasMoreReviews(Boolean(payload.hasMore));
    } catch {
      setReviewsError(true);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingReviews(false);
    }
  }, [hasMoreReviews, reviews.length, username]);

  useEffect(() => {
    if (activeTab !== "reviews" || reviewsError || !hasMoreReviews || !loaderRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMoreReviews();
    }, { rootMargin: "360px 0px" });

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [activeTab, reviewsError, hasMoreReviews, loadMoreReviews]);

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
              {reviewsError ? <button className="profile-load-more" onClick={() => void loadMoreReviews()}>Could not load reviews. Retry</button> : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {(["movies", "favourites", "wishlist"] as const).map(tab => visited.includes(tab) || activeTab === tab ? (
        <div key={tab} hidden={activeTab !== tab}>
          <InfiniteProfileMovieGrid
            active={activeTab === tab}
            collection={tab}
            initialHasMore={tab === "movies" ? initialMoviesHaveMore : tab === "favourites" ? favouritesHaveMore : wishlistHasMore}
            initialMovies={tab === "movies" ? initialMovies : tab === "favourites" ? favouriteMovies : wishlistMovies}
            isSignedIn={isSignedIn}
            username={username}
          />
        </div>
      ) : null)}
    </>
  );
}

function InfiniteProfileMovieGrid({
  active,
  collection,
  initialHasMore,
  initialMovies,
  isSignedIn,
  username
}: {
  active: boolean;
  collection: "movies" | "favourites" | "wishlist";
  initialHasMore: boolean;
  initialMovies: Movie[];
  isSignedIn: boolean;
  username: string;
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const movieCountRef = useRef(initialHasMore ? PROFILE_MOVIE_PAGE_SIZE : initialMovies.length);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(false);

    try {
      const response = await fetch(
        `/api/profile/${encodeURIComponent(username)}/movies?collection=${collection}&offset=${movieCountRef.current}&limit=${PROFILE_MOVIE_PAGE_SIZE}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error("Could not load movies");

      const payload = await response.json() as { movies?: Movie[]; hasMore?: boolean; nextOffset?: number };
      const nextMovies = payload.movies ?? [];
      movieCountRef.current = payload.nextOffset ?? movieCountRef.current + nextMovies.length;
      setMovies((current) => [...new Map([...current, ...nextMovies].map(movie => [movie.tmdbId, movie])).values()]);
      setHasMore(Boolean(payload.hasMore));
    } catch {
      setError(true);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, username, collection]);

  useEffect(() => {
    if (!active || error) return;
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
  }, [active, error, hasMore, loadMore]);

  return (
    <section className="profile-tab-films profile-movies-feed" aria-label={collection} role="tabpanel">
      {movies.length ? (
        <div className="poster-grid">
          {movies.map((movie, index) => (
            <MoviePoster dense isSignedIn={isSignedIn} key={`${movie.tmdbId}-${index}`} movie={movie} showTooltip={false} showYear={false} />
          ))}
        </div>
      ) : <div className="profile-tab-empty">{collection === "movies" ? "No films logged yet." : collection === "favourites" ? "No favourites yet." : "Your wishlist is empty."}</div>}

      {hasMore || isLoading ? (
        <div className="profile-movies-loader" ref={sentinelRef} aria-live="polite">
          {isLoading ? <ClassicSpinner theme="dark" /> : null}
          {!isLoading ? <button className="profile-load-more" onClick={() => void loadMore()} type="button">{error ? "Could not load. Retry" : "Load more"}</button> : null}
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
      {review.movie?.posterPath ? <img className="profile-review-poster" src={posterUrl(review.movie.posterPath, "w185")} alt={`${review.movie.title} poster`} loading="lazy" decoding="async" /> : <div className="profile-review-poster" aria-hidden />}
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
