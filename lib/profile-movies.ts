import type { Movie } from "@/lib/data";

export const PROFILE_MOVIE_PAGE_SIZE = 12;

export function toProfileMovies(rows: any[]): Movie[] {
  return rows.map(toProfileMovie).filter(Boolean) as Movie[];
}

function toProfileMovie(row: any): Movie | null {
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
  if (!movie) return null;

  const rating = Math.max(0, Math.min(5, Number(row.rating ?? 0)));

  return {
    tmdbId: Number(movie.tmdb_id),
    title: movie.title,
    releaseYear: movie.release_date ? String(movie.release_date).slice(0, 4) : "Film",
    rating,
    userRating: rating,
    watched: true,
    reviewed: false,
    posterPath: movie.poster_path ?? "",
    overview: movie.overview ?? "",
    reviewCount: 0
  };
}
