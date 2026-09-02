import { NextResponse } from "next/server";
import { PROFILE_MOVIE_PAGE_SIZE, toProfileMovies } from "@/lib/profile-movies";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? String(PROFILE_MOVIE_PAGE_SIZE), 10);
  const limit = Math.min(Math.max(requestedLimit || PROFILE_MOVIE_PAGE_SIZE, 1), 24);
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();

  if (!profile) {
    return NextResponse.json({ movies: [], hasMore: false }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("user_movies")
    .select("tmdb_id, rating, status, watched_at, movies(tmdb_id, title, poster_path, overview, release_date)")
    .eq("user_id", profile.id)
    .eq("status", "watched")
    .order("watched_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return NextResponse.json({ movies: [], hasMore: false }, { status: 500 });
  }

  const rows = data ?? [];
  return NextResponse.json(
    {
      movies: toProfileMovies(rows.slice(0, limit)),
      hasMore: rows.length > limit
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
