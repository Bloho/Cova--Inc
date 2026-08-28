import { notFound } from "next/navigation";
import Link from "next/link";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { ProfileCardGenerator } from "@/components/ProfileCardGenerator";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PaginatedFilms } from "@/components/PaginatedFilms";
import { Separator } from "@/components/ui/separator";
import { hasActiveCovaMembership } from "@/lib/billing/subscription";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const [viewerResult, profileResult] = await Promise.all([
    getCurrentUserProfile(),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .eq("username", username)
      .maybeSingle()
  ]);
  const { user: viewer, profile: viewerProfile } = viewerResult;
  const { data: profile, error: profileError } = profileResult;
  const hasCovaPro = viewer ? await hasActiveCovaMembership(viewer.id).catch(() => false) : false;

  if (profileError || !profile) {
    notFound();
  }

  const [{ count: filmsCount }, { data: logs }, { data: reviews }, { data: filmReviews }] = await Promise.all([
    supabase.from("user_movies").select("tmdb_id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "watched"),
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
      .limit(3),
    supabase
      .from("reviews")
      .select("tmdb_id, body, rating")
      .eq("user_id", profile.id)
      .eq("is_public", true)
  ]);

  const movies = (logs ?? []).map((row) => fromLoggedMovie(row)).filter(Boolean) as Movie[];
  const reviewByMovie = new Map((filmReviews ?? []).map((review) => [
    Number(review.tmdb_id),
    { body: review.body, rating: Number(review.rating ?? 0) }
  ]));
  const isOwnProfile = viewer?.id === profile.id;
  const viewerStates = isOwnProfile
    ? new Map()
    : await getUserMovieStates(movies.map((movie) => movie.tmdbId), viewer?.id);
  const displayMovies = movies.map((movie) => {
    const resolvedMovie = isOwnProfile
      ? { ...movie, watched: true, userRating: movie.userRating ?? movie.rating }
      : applyUserState(movie, viewerStates.get(movie.tmdbId));
    const review = reviewByMovie.get(movie.tmdbId);

    return review
      ? { ...resolvedMovie, reviewed: true, reviewBody: review.body ?? undefined, userRating: review.rating }
      : resolvedMovie;
  });

  return (
    <div className="profile-page">
      <MoviePageHeader
        isSignedIn={Boolean(viewer)}
        username={viewerProfile?.username ?? null}
        displayName={viewerProfile?.display_name ?? null}
        avatarUrl={viewerProfile?.avatar_url ?? null}
        hasCovaPro={hasCovaPro}
        hidePrimaryActions
      />
      <main className="profile-main">
        <section className="profile-page-hero">
          <div className="profile-page-identity">
            {profile.avatar_url ? <img className="profile-page-avatar" src={profile.avatar_url} alt="" /> : <div className="profile-page-avatar" aria-hidden />}
            <div className="profile-page-details">
              {isOwnProfile ? <ProfileEditor displayName={profile.display_name} username={profile.username} avatarUrl={profile.avatar_url} /> : <h1>{profile.display_name}</h1>}
              <div className="profile-page-handle">@{profile.username}</div>
            </div>
          </div>
          <div className="profile-page-actions" aria-label="Profile stats">
            <div className="profile-page-stat">
              <strong>{filmsCount ?? 0}</strong>
              <span>movies</span>
            </div>
            {isOwnProfile ? (
              <div id="cards">
                <ProfileCardGenerator filmsCount={filmsCount ?? 0} username={profile.username} label="CARD" />
              </div>
            ) : null}
          </div>
        </section>

        <section id="profile" className="profile-reviews" aria-labelledby="activity">
          <h2 id="activity" className="profile-reviews-heading">Recent reviews</h2>
          {(reviews ?? []).length ? (
            <div className="profile-reviews-list">
              {(reviews ?? []).map((review) => {
                const movie = fromReviewMovie(review);
                return (
                  <article className="profile-review" key={review.id}>
                    {movie ? <img className="profile-review-poster" src={posterUrl(movie.posterPath, "w342")} alt={`${movie.title} poster`} /> : <div className="profile-review-poster" aria-hidden />}
                    <div className="profile-review-copy">
                      <time dateTime={review.created_at}>{formatReviewDate(review.created_at)}</time>
                      <p className="profile-review-quote">{formatReviewQuote(review.body)}</p>
                      <h3>
                        <span>{movie?.title ?? "Film"}</span>
                      </h3>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No public reviews yet.</div>
          )}
        </section>

        <section id="films" className="section profile-films" aria-labelledby="seen">
          <h2 id="seen" className="section-head">
            <span>{profile.display_name} has seen {filmsCount ?? 0} films</span>
          </h2>
          <Separator />
          <PaginatedFilms
            movies={displayMovies}
            isSignedIn={Boolean(viewer)}
            showYears={false}
            showReviewTooltip
          />
        </section>
      </main>
      <footer className="movie-page-footer home-page-footer">
        <span>© Cova by Bloho, 2026</span>
        <div><Link href="/about">About</Link><Link href="/legal">Legal</Link></div>
      </footer>
    </div>
  );
}

function formatReviewDate(value: string) {
  return `Reviewed on ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value))}`;
}

function formatReviewQuote(body: string | null) {
  const text = (body ?? "").trim();
  if (!text) {
    return "No written review.";
  }

  return text.startsWith("“") || text.startsWith('"') ? text : `“${text}”`;
}

function fromLoggedMovie(row: any): Movie | null {
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
  if (!movie) {
    return null;
  }

  return {
    tmdbId: movie.tmdb_id,
    title: movie.title,
    releaseYear: movie.release_date ? String(movie.release_date).slice(0, 4) : "Film",
    rating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    userRating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    watched: false,
    reviewed: false,
    posterPath: movie.poster_path,
    overview: movie.overview ?? "",
    reviewCount: 0
  };
}

function fromReviewMovie(row: any): Movie | null {
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
  if (!movie) {
    return null;
  }

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
