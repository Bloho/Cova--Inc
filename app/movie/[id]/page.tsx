import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MovieLogActions } from "@/components/MovieLogActions";
import { Separator } from "@/components/ui/separator";
import { posterUrl } from "@/lib/data";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
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
  const averageRating = movie.averageRating ?? movie.rating;
  const averagePercent = Math.max(0, Math.min(100, (averageRating / 5) * 100));

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
            <p className="movie-overview">{movie.overview}</p>
            <MovieLogActions
              movie={movie}
              isSignedIn={Boolean(user)}
              initialRating={movieWithState.userRating ?? 0}
              initialReviewed={Boolean(movieWithState.reviewed)}
              username={profile?.username}
            />
            <div className="movie-average-rating">
              <div className="radial-score" aria-label={`Average rating ${averageRating.toFixed(1)} out of 5`}>
                <svg viewBox="0 0 64 64" aria-hidden>
                  <circle className="score-ring-track" cx="32" cy="32" r="25" pathLength="100" />
                  <circle className="score-ring-value" cx="32" cy="32" r="25" pathLength="100" strokeDasharray={`${averagePercent} 100`} />
                </svg>
                <span>{averageRating.toFixed(1)}</span>
              </div>
              <strong>Average rating by users</strong>
            </div>
          </div>
        </section>
        <Separator />
      </main>
      <Footer />
    </>
  );
}
