import Link from "next/link";
import { MovieCollectionActions } from "@/components/MovieCollectionActions";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { MovieLogActions } from "@/components/MovieLogActions";
import { posterUrl } from "@/lib/data";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMovie } from "@/lib/tmdb";

export default async function MoviePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [movie, { user, profile }] = await Promise.all([
    getMovie(Number(id)),
    getCurrentUserProfile()
  ]);
  const supabase = await createSupabaseServerClient();
  const [states, reviewResult] = await Promise.all([
    getUserMovieStates([movie.tmdbId], user?.id),
    user
      ? supabase
          .from("reviews")
          .select("id, body, rating, created_at, updated_at")
          .eq("user_id", user.id)
          .eq("tmdb_id", movie.tmdbId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  const movieState = states.get(movie.tmdbId);
  const movieWithState = applyUserState(movie, movieState);
  const currentReview = reviewResult.data;

  return (
    <div className="movie-page">
      <MoviePageHeader
        isSignedIn={Boolean(user)}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? user?.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="movie-page-main">
        <div className="movie-page-top-space" aria-hidden />
        <section className="movie-page-feature">
          <div className="movie-page-poster">
            <img src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} />
          </div>
          <div className="movie-page-copy">
            <div className="movie-page-meta">
              <span>{movie.releaseYear}</span>
              {movie.director ? <p>Directed by <u>{movie.director}</u></p> : null}
            </div>
            <h1>{movie.title}</h1>
            <p className="movie-page-overview">{movie.overview}</p>
            <MovieCollectionActions
              movie={movie}
              isSignedIn={Boolean(user)}
              initialInWishlist={movieState?.inWatchlist ?? false}
              initialFavourite={movieState?.isFavourite ?? false}
            />
            <MovieLogActions
              movie={movie}
              isSignedIn={Boolean(user)}
              initialRating={movieWithState.userRating ?? 0}
              initialReviewed={Boolean(movieWithState.reviewed)}
              initialReview={currentReview}
              username={profile?.username}
            />
          </div>
        </section>
      </main>
      <footer className="movie-page-footer">
        <span>© Cova by Bloho, 2026</span>
        <div><Link href="/about">About</Link><Link href="/legal">Legal</Link></div>
      </footer>
    </div>
  );
}
