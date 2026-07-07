import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
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
  const movie = await getMovie(Number(id));
  const { user, profile } = await getCurrentUserProfile();
  const states = await getUserMovieStates([movie.tmdbId], user?.id);
  const movieWithState = applyUserState(movie, states.get(movie.tmdbId));
  const supabase = await createSupabaseServerClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, body, rating, created_at, profiles(username, display_name, avatar_url)")
    .eq("tmdb_id", movie.tmdbId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <>
      <Header />
      <main className="shell site-main">
        <Link href="/" className="back-link">
          <ArrowLeft size={18} />
          Home
        </Link>

        <section className="movie-detail">
          <div className="movie-detail-poster">
            <img src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} />
          </div>
          <div className="movie-detail-copy">
            <p className="handle">{movie.releaseYear}</p>
            <h1>{movie.title}</h1>
            <div className="detail-rating">
              <span className="stars">{"★".repeat(movieWithState.userRating || movie.rating)}{"☆".repeat(5 - (movieWithState.userRating || movie.rating))}</span>
              <span>{reviews?.length ?? 0} Cova reviews</span>
            </div>
            <p>{movie.overview}</p>
            <MovieLogActions
              movie={movie}
              isSignedIn={Boolean(user)}
              initialRating={movieWithState.userRating ?? 0}
              initialReviewed={Boolean(movieWithState.reviewed)}
              username={profile?.username}
            />
          </div>
        </section>

        <section className="section" aria-labelledby="film-reviews">
          <h2 id="film-reviews" className="section-head">
            <span>Friend reviews</span>
          </h2>
          {(reviews ?? []).length ? (
            <div className="review-list">
              {(reviews ?? []).map((review: any) => {
                const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
                return (
                  <article className="review" key={review.id}>
                    {profile?.avatar_url ? <img className="mini-poster" src={profile.avatar_url} alt="" /> : <div className="mini-poster avatar-fallback" />}
                    <div>
                      <h3>{profile?.display_name ?? profile?.username ?? "Cova user"}</h3>
                      <p>{review.body}</p>
                    </div>
                    <span className="stars">{"★".repeat(review.rating ?? 0)}{"☆".repeat(5 - (review.rating ?? 0))}</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No reviews for this film yet.</div>
          )}
        </section>

      </main>
      <Footer />
    </>
  );
}
