import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { ProfileCardGenerator } from "@/components/ProfileCardGenerator";
import { ProfileContent, type ProfileTab } from "@/components/ProfileContent";
import { ProfileEditor } from "@/components/ProfileEditor";
import type { Movie } from "@/lib/data";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
import { PROFILE_REVIEW_PAGE_SIZE, toProfileReviewItem } from "@/lib/profile-reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHomeMovies } from "@/lib/tmdb";

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
    { data: reviews },
    { data: favouriteRows },
    { data: wishlistRows },
    { trending }
  ] = await Promise.all([
    supabase.from("user_movies").select("tmdb_id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "watched"),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_public", true),
    supabase
      .from("reviews")
      .select("id, body, rating, created_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(PROFILE_REVIEW_PAGE_SIZE + 1),
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

  const favouriteMovies = toMovies(favouriteRows ?? []);
  const wishlistMovies = toMovies(wishlistRows ?? []);
  const isOwnProfile = viewer?.id === profile.id;
  const allMovieIds = [...favouriteMovies, ...wishlistMovies].map((movie) => movie.tmdbId);
  const viewerStates = isOwnProfile ? new Map() : await getUserMovieStates([...new Set(allMovieIds)], viewer?.id);
  const decorateMovie = (movie: Movie) => {
    return isOwnProfile
      ? { ...movie, watched: movie.watched }
      : applyUserState(movie, viewerStates.get(movie.tmdbId));
  };
  const initialReviews = (reviews ?? []).slice(0, PROFILE_REVIEW_PAGE_SIZE).map(toProfileReviewItem);
  const initialReviewsHaveMore = (reviews?.length ?? 0) > PROFILE_REVIEW_PAGE_SIZE;
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
            {isOwnProfile ? (
              <div className="profile-card-corner">
                <ProfileCardGenerator filmsCount={filmsCount ?? 0} username={profile.username} label="CARD" />
              </div>
            ) : null}
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
            </div>
          </section>

          <ProfileContent
            displayName={profile.display_name}
            favouriteMovies={favouriteMovies.map(decorateMovie)}
            initialReviews={initialReviews}
            initialReviewsHaveMore={initialReviewsHaveMore}
            initialTab={activeTab}
            isSignedIn={Boolean(viewer)}
            username={profile.username}
            wishlistMovies={wishlistMovies.map(decorateMovie)}
          />
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

function isProfileTab(value: string | undefined): value is ProfileTab {
  return value === "reviews" || value === "favourites" || value === "wishlist";
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
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
