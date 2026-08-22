import { cache } from "react";
import type { Movie } from "@/lib/data";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserMovieState = {
  watched: boolean;
  rating: number;
  reviewed: boolean;
  inWatchlist: boolean;
  isFavourite: boolean;
};

export const getCurrentUserProfile = cache(async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await ensureProfile(supabase, user);
    const { data: createdProfile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = createdProfile;
  }

  return { user, profile };
});

export async function getUserMovieStates(tmdbIds: number[], userId?: string | null) {
  let resolvedUserId = userId;

  if (resolvedUserId === undefined) {
    const { user } = await getCurrentUserProfile();
    resolvedUserId = user?.id;
  }

  if (!resolvedUserId || tmdbIds.length === 0) {
    return new Map<number, UserMovieState>();
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: userMovies }, { data: reviews }] = await Promise.all([
    supabase
      .from("user_movies")
      .select("tmdb_id, status, rating, in_watchlist, liked")
      .eq("user_id", resolvedUserId)
      .in("tmdb_id", tmdbIds),
    supabase
      .from("reviews")
      .select("tmdb_id")
      .eq("user_id", resolvedUserId)
      .in("tmdb_id", tmdbIds)
  ]);

  const reviewedIds = new Set((reviews ?? []).map((review) => review.tmdb_id as number));
  const state = new Map<number, UserMovieState>();

  for (const row of userMovies ?? []) {
    const tmdbId = row.tmdb_id as number;
    state.set(tmdbId, {
      watched: row.status === "watched",
      rating: Number(row.rating ?? 0),
      reviewed: reviewedIds.has(tmdbId),
      inWatchlist: Boolean(row.in_watchlist),
      isFavourite: Boolean(row.liked)
    });
  }

  for (const tmdbId of reviewedIds) {
    const current = state.get(tmdbId);
    state.set(tmdbId, {
      watched: current?.watched ?? true,
      rating: current?.rating ?? 0,
      reviewed: true,
      inWatchlist: current?.inWatchlist ?? false,
      isFavourite: current?.isFavourite ?? false
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
