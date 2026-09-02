import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { ProfileCardGenerator } from "@/components/ProfileCardGenerator";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PaginatedFilms } from "@/components/PaginatedFilms";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHomeMovies } from "@/lib/tmdb";

type ProfileTab = "reviews" | "favourites" | "wishlist";

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [{ username }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const activeTab: ProfileTab = isProfileTab(resolvedSearchParams?.tab) ? resolvedSearchParams.tab : "reviews";
  const supabase = await createSupabaseServerClient();
  const [viewerResult, profileResult] = await Promise.all([
    getCurrentUserProfile(),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, created_at")
      .eq("username", username)
      .maybeSingle()
  ]);
  const { user: viewer } = viewerResult;
  const { data: profile, error: profileError } = profileResult;

  if (!profile || !profile.username) {
    notFound();
  }

  if (profileError) {
    throw profileError;
  }

  const [
    { count: filmsCount },
    { count: reviewsCount },
    { data: logs },
    { data: reviews },
    { data: filmReviews },
    { data: favouriteRows },
    { data: wishlistRows },
    { trending }
  ] = await Promise.all([
    supabase.from("user_movies").select("tmdb_id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "watched"),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_public", true),
    supabase
      .from("user_movies")
      .select("tmdb_id, rating, status, watched_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("status", "watched")
      .order("watched_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, body, rating, created_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("reviews")
      .select("tmdb_id, body, rating")
      .eq("user_id", profile.id)
      .eq("is_public", true),
    supabase
      .from("user_movies")
      .select("tmdb_id, rating, status, watched_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("liked", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("user_movies")
      .select("tmdb_id, rating, status, watched_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("in_watchlist", true)
      .order("updated_at", { ascending: false }),
    getHomeMovies()
  ]);

  const watchedMovies = toMovies(logs ?? []);
  const favouriteMovies = toMovies(favouriteRows ?? []);
  const wishlistMovies = toMovies(wishlistRows ?? []);
  const reviewByMovie = new Map((filmReviews ?? []).map((review) => [
    Number(review.tmdb_id),
    { body: review.body, rating: Number(review.rating ?? 0) }
  ]));
  const isOwnProfile = viewer?.id === profile.id;
  const allMovieIds = [...watchedMovies, ...favouriteMovies, ...wishlistMovies].map((movie) => movie.tmdbId);
  const viewerStates = isOwnProfile ? new Map() : await getUserMovieStates([...new Set(allMovieIds)], viewer?.id);
  const decorateMovie = (movie: Movie) => {
    const resolvedMovie = isOwnProfile
      ? { ...movie, watched: movie.watched }
      : applyUserState(movie, viewerStates.get(movie.tmdbId));
    const review = reviewByMovie.get(movie.tmdbId);

    return review
      ? { ...resolvedMovie, reviewed: true, reviewBody: review.body ?? undefined, userRating: review.rating }
      : resolvedMovie;
  };
  const tabMovies = activeTab === "favourites"
    ? favouriteMovies.map(decorateMovie)
    : wishlistMovies.map(decorateMovie);
  const reviewCount = reviewsCount ?? 0;

  return (
    <div className="profile-page profile-dashboard-page">
      <div className="profile-dashboard">
        <aside className="profile-rail" aria-label="Profile navigation">
          <Link className="profile-rail-logo" href="/" aria-label="Cova home">
            <img src="/assets/Cova-logo-white.svg" alt="Cova" />
          </Link>
        </aside>

        <main className="profile-dashboard-main">
          <header className="profile-sticky-bar">
            <Link className="profile-back-link" href="/" aria-label="Back to home">
              <ArrowLeft size={28} strokeWidth={2.4} />
            </Link>
            <div>
              <strong>{profile.display_name}</strong>
              <span>{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
            </div>
          </header>

          <section className="profile-cover" aria-label={`${profile.display_name}'s profile header`}>
            <img className="profile-cover-art" src="/profile/profile-banner.svg" alt="" />
            <div className="profile-avatar-lockup">
              <img className="profile-avatar-shape" src="/profile/profile-picture.svg" alt="" />
              {profile.avatar_url ? <img className="profile-avatar-photo" src={profile.avatar_url} alt={`${profile.display_name}'s profile`} /> : null}
            </div>
          </section>

          <section className="profile-overview">
            <div className="profile-identity-copy">
              {isOwnProfile ? (
                <ProfileEditor displayName={profile.display_name} username={profile.username} avatarUrl={profile.avatar_url} />
              ) : (
                <h1>{profile.display_name}</h1>
              )}
              <p>@{profile.username}</p>
            </div>

            <div className="profile-facts" aria-label="Profile details">
              <span><strong>{filmsCount ?? 0}</strong> movies</span>
              <span><CalendarDays size={18} aria-hidden /> Joined {formatJoinedDate(profile.created_at)}</span>
              {isOwnProfile ? (
                <ProfileCardGenerator filmsCount={filmsCount ?? 0} username={profile.username} label="CARD" />
              ) : null}
            </div>
          </section>

          <nav className="profile-tabs" aria-label="Profile collections">
            <ProfileTabLink activeTab={activeTab} href={`/${profile.username}`} tab="reviews">Reviews</ProfileTabLink>
            <ProfileTabLink activeTab={activeTab} href={`/${profile.username}?tab=favourites`} tab="favourites">Favourites</ProfileTabLink>
            <ProfileTabLink activeTab={activeTab} href={`/${profile.username}?tab=wishlist`} tab="wishlist">Wishlist</ProfileTabLink>
          </nav>

          {activeTab === "reviews" ? (
            <section className="profile-review-feed" aria-label={`${profile.display_name}'s reviews`}>
              {(reviews ?? []).length ? (reviews ?? []).map((review) => {
                const movie = fromReviewMovie(review);
                return (
                  <article className="profile-review-row" key={review.id}>
                    {movie ? <img className="profile-review-poster" src={posterUrl(movie.posterPath, "w342")} alt={`${movie.title} poster`} /> : <div className="profile-review-poster" aria-hidden />}
                    <div className="profile-review-copy">
                      <p className="profile-review-meta">
                        <strong>{profile.display_name}</strong><span>@{profile.username}</span><span>{movie?.title ?? "Film"}</span><time dateTime={review.created_at}>{formatReviewDate(review.created_at)}</time>
                      </p>
                      <p className="profile-review-quote">{formatReviewQuote(review.body)}</p>
                    </div>
                  </article>
                );
              }) : <div className="profile-tab-empty">No public reviews yet.</div>}
            </section>
          ) : (
            <section className="profile-tab-films" aria-label={`${profile.display_name}'s ${activeTab}`}>
              <PaginatedFilms
                movies={tabMovies}
                isSignedIn={Boolean(viewer)}
                itemsPerPage={24}
                showYears={false}
                showReviewTooltip
              />
            </section>
          )}
        </main>

        <aside className="profile-trends" aria-label="Trending films">
          <section className="profile-trends-card">
            <h2>What&apos;s happening</h2>
            {trending.slice(0, 3).map((movie) => (
              <Link className="profile-trend" href={`/movie/${movie.tmdbId}`} key={movie.tmdbId}>
                <span>Trending</span>
                <strong>{movie.title}</strong>
              </Link>
            ))}
            {!trending.length ? <p>Cova is quiet right now.</p> : null}
          </section>
          <footer className="profile-trends-footer">
            <Link href="/company/legal">Terms</Link>
            <Link href="/company/legal">Privacy</Link>
            <Link href="/company/legal">Cookies</Link>
            <span>© 2026 Cova by Bloho</span>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function ProfileTabLink({
  activeTab,
  href,
  tab,
  children
}: {
  activeTab: ProfileTab;
  href: string;
  tab: ProfileTab;
  children: React.ReactNode;
}) {
  return <Link className={activeTab === tab ? "active" : undefined} href={href}>{children}</Link>;
}

function isProfileTab(value: string | undefined): value is ProfileTab {
  return value === "reviews" || value === "favourites" || value === "wishlist";
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatReviewQuote(body: string | null) {
  const text = (body ?? "").trim();
  return text || "No written review.";
}

function toMovies(rows: any[]): Movie[] {
  return rows.map(fromLoggedMovie).filter(Boolean) as Movie[];
}

function fromLoggedMovie(row: any): Movie | null {
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
  if (!movie) return null;

  return {
    tmdbId: movie.tmdb_id,
    title: movie.title,
    releaseYear: movie.release_date ? String(movie.release_date).slice(0, 4) : "Film",
    rating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    userRating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    watched: row.status === "watched",
    reviewed: false,
    posterPath: movie.poster_path,
    overview: movie.overview ?? "",
    reviewCount: 0
  };
}

function fromReviewMovie(row: any): Movie | null {
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
  if (!movie) return null;

  return {
    tmdbId: movie.tmdb_id,
    title: movie.title,
    releaseYear: movie.release_date ? String(movie.release_date).slice(0, 4) : "Film",
    rating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    userRating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    watched: false,
    reviewed: true,
    posterPath: movie.poster_path,
    overview: movie.overview ?? "",
    reviewCount: 0
  };
}
