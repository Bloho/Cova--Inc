import type { Movie } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserMovieState = {
  watched: boolean;
  rating: number;
  reviewed: boolean;
};

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
}

export async function getUserMovieStates(tmdbIds: number[]) {
  const { user } = await getCurrentUserProfile();

  if (!user || tmdbIds.length === 0) {
    return new Map<number, UserMovieState>();
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: userMovies }, { data: reviews }] = await Promise.all([
    supabase
      .from("user_movies")
      .select("tmdb_id, status, rating")
      .eq("user_id", user.id)
      .in("tmdb_id", tmdbIds),
    supabase
      .from("reviews")
      .select("tmdb_id")
      .eq("user_id", user.id)
      .in("tmdb_id", tmdbIds)
  ]);

  const reviewedIds = new Set((reviews ?? []).map((review) => review.tmdb_id as number));
  const state = new Map<number, UserMovieState>();

  for (const row of userMovies ?? []) {
    const tmdbId = row.tmdb_id as number;
    state.set(tmdbId, {
      watched: row.status === "watched",
      rating: Number(row.rating ?? 0),
      reviewed: reviewedIds.has(tmdbId)
    });
  }

  for (const tmdbId of reviewedIds) {
    const current = state.get(tmdbId);
    state.set(tmdbId, {
      watched: current?.watched ?? true,
      rating: current?.rating ?? 0,
      reviewed: true
    });
  }

  return state;
}

export function applyUserState(movie: Movie, state?: UserMovieState): Movie {
  return {
    ...movie,
    watched: Boolean(state?.watched),
    userRating: state?.rating ?? 0,
    reviewed: Boolean(state?.reviewed)
  };
}
