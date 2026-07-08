import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MoviePoster } from "@/components/MoviePoster";
import { ProfileCardGenerator } from "@/components/ProfileCardGenerator";
import { ProfileEditor } from "@/components/ProfileEditor";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
import { formatRatingStars } from "@/lib/ratings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const { user: viewer } = await getCurrentUserProfile();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const [{ count: filmsCount }, { data: logs }, { data: reviews }] = await Promise.all([
    supabase.from("user_movies").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "watched"),
    supabase
      .from("user_movies")
      .select("tmdb_id, rating, status, watched_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("status", "watched")
      .order("watched_at", { ascending: false })
      .limit(28),
    supabase
      .from("reviews")
      .select("id, body, rating, created_at, movies(tmdb_id, title, poster_path, overview, release_date)")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(3)
  ]);

  const movies = (logs ?? []).map((row) => fromLoggedMovie(row)).filter(Boolean) as Movie[];
  const viewerStates = await getUserMovieStates(movies.map((movie) => movie.tmdbId), viewer?.id);
  const displayMovies = movies.map((movie) => applyUserState(movie, viewerStates.get(movie.tmdbId)));
  const isOwnProfile = viewer?.id === profile.id;

  return (
    <>
      <Header />
      <main className="shell site-main">
        <section className="profile-hero">
          <div className="identity">
            {profile.avatar_url ? <img className="avatar" src={profile.avatar_url} alt="" /> : <div className="avatar" aria-hidden />}
            <div>
              {isOwnProfile ? <ProfileEditor displayName={profile.display_name} username={profile.username} avatarUrl={profile.avatar_url} /> : <h1>{profile.display_name}</h1>}
              <div className="handle">@{profile.username}</div>
            </div>
          </div>
          <div className="stats" aria-label="Profile stats">
            <div className="stat">
              <strong>{filmsCount ?? 0}</strong>
              <span>films</span>
            </div>
          </div>
          {isOwnProfile ? <ProfileCardGenerator filmsCount={filmsCount ?? 0} username={profile.username} /> : null}
        </section>

        <nav className="tabs" aria-label="Profile tabs">
          <a href="#profile">Profile</a>
          <a href="#films">Films</a>
          <a href="#reviews">Reviews</a>
        </nav>

        <section id="profile" className="section" aria-labelledby="activity">
          <h2 id="activity" className="section-head">
            <span>Recent activity</span>
          </h2>
          {(reviews ?? []).length ? (
            <div className="review-list">
              {(reviews ?? []).map((review) => {
                const movie = fromReviewMovie(review);
                return (
                  <article className="review" key={review.id}>
                    {movie ? <img className="mini-poster" src={posterUrl(movie.posterPath, "w185")} alt={`${movie.title} poster`} /> : null}
                    <div>
                      <h3>{movie?.title ?? "Film"}</h3>
                      <p>{review.body}</p>
                    </div>
                    <span className="stars">{formatRatingStars(review.rating ?? 0)}</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No public reviews yet.</div>
          )}
        </section>

        <section id="films" className="section" aria-labelledby="seen">
          <h2 id="seen" className="section-head">
            <span>{profile.display_name} has seen {filmsCount ?? 0} films</span>
          </h2>
          {displayMovies.length ? (
            <div className="poster-grid">
              {displayMovies.map((movie) => (
                <MoviePoster key={movie.tmdbId} movie={movie} dense isSignedIn={Boolean(viewer)} />
              ))}
            </div>
          ) : (
            <div className="empty-state">No films logged yet.</div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
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
