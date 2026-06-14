import { NextResponse } from "next/server";
import type { Movie } from "@/lib/data";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before logging films." }, { status: 401 });
  }

  const body = (await request.json()) as {
    movie?: Movie;
    rating?: number;
    review?: string;
  };

  if (!body.movie?.tmdbId) {
    return NextResponse.json({ error: "Missing movie." }, { status: 400 });
  }

  const rating = Math.max(0, Math.min(5, Number(body.rating ?? 0)));
  const review = body.review?.trim() ?? "";

  const profile = await ensureProfile(supabase, user);
  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }

  const movie = body.movie;

  const { error: movieError } = await supabase.from("movies").upsert({
    tmdb_id: movie.tmdbId,
    title: movie.title,
    poster_path: movie.posterPath,
    overview: movie.overview,
    release_date: movie.releaseYear && /^\d{4}$/.test(movie.releaseYear) ? `${movie.releaseYear}-01-01` : null
  });

  if (movieError) {
    return NextResponse.json({ error: movieError.message }, { status: 500 });
  }

  const { error: logError } = await supabase.from("user_movies").upsert(
    {
      user_id: user.id,
      tmdb_id: movie.tmdbId,
      status: "watched",
      rating: rating || null,
      watched_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,tmdb_id" }
  );

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  if (review) {
    const { error: reviewError } = await supabase.from("reviews").insert({
      user_id: user.id,
      tmdb_id: movie.tmdbId,
      rating: rating || null,
      body: review,
      is_public: true
    });

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
