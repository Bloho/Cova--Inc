export const PROFILE_REVIEW_PAGE_SIZE = 8;

export type ProfileReviewItem = {
  id: string;
  body: string | null;
  createdAt: string;
  movie: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
  } | null;
};

export function toProfileReviewItem(row: any): ProfileReviewItem {
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;

  return {
    id: row.id,
    body: row.body ?? null,
    createdAt: row.created_at,
    movie: movie ? {
      tmdbId: Number(movie.tmdb_id),
      title: movie.title,
      posterPath: movie.poster_path ?? null
    } : null
  };
}
