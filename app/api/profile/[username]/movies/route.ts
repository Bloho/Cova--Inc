import { NextResponse } from "next/server";
import { PROFILE_MOVIE_PAGE_SIZE, toProfileMovies } from "@/lib/profile-movies";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyUserState, getUserMovieStates } from "@/lib/library";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get("collection") ?? "movies";
  if (!["movies", "favourites", "wishlist"].includes(collection)) return NextResponse.json({ error: "Invalid collection." }, { status: 400 });
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? String(PROFILE_MOVIE_PAGE_SIZE), 10);
  const limit = Math.min(Math.max(requestedLimit || PROFILE_MOVIE_PAGE_SIZE, 1), 24);
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();

  if (!profile) {
    return NextResponse.json({ movies: [], hasMore: false }, { status: 404 });
  }

  const query = supabase
    .from("user_movies")
    .select("tmdb_id, rating, status, watched_at, movies(tmdb_id, title, poster_path, overview, release_date)")
    .eq("user_id", profile.id);
  const filtered = collection === "movies" ? query.eq("status", "watched") : collection === "favourites" ? query.eq("liked", true) : query.eq("in_watchlist", true);
  const { data, error } = await filtered
    .order(collection === "movies" ? "watched_at" : "updated_at", { ascending: false })
    .order("tmdb_id")
    .range(offset, offset + limit);

  if (error) {
    return NextResponse.json({ movies: [], hasMore: false }, { status: 500 });
  }

  const rows = data ?? [];
  let movies = toProfileMovies(rows.slice(0, limit));
  if (collection !== "movies") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id !== profile.id) {
      const states = await getUserMovieStates(movies.map(movie => movie.tmdbId), user?.id ?? null);
      movies = movies.map(movie => applyUserState(movie, states.get(movie.tmdbId)));
    }
  }
  return NextResponse.json(
    {
      movies,
      nextOffset: offset + Math.min(rows.length, limit),
      hasMore: rows.length > limit
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
