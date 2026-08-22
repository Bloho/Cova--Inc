import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Collection = "wishlist" | "favourite";

type CollectionRequest = {
  collection?: Collection;
  active?: boolean;
  movie?: {
    tmdbId?: number;
    title?: string;
    releaseYear?: string;
    posterPath?: string;
    overview?: string;
  };
};

function collectionDatabaseError(message: string) {
  if (message.includes("in_watchlist") || message.includes("schema cache")) {
    return "Wishlist storage is not set up yet. Run supabase/20260822_collections.sql in the Supabase project connected to this deployment, then try again.";
  }

  return "Could not update this collection. Please try again.";
}

export async function POST(request: Request) {
  const body = (await request.json()) as CollectionRequest;
  const movie = body.movie;

  if (
    (body.collection !== "wishlist" && body.collection !== "favourite") ||
    typeof body.active !== "boolean" ||
    !movie ||
    !Number.isInteger(movie.tmdbId) ||
    !movie.title?.trim()
  ) {
    return NextResponse.json({ error: "Invalid collection request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const profile = await ensureProfile(supabase, user);
  if (profile.error) {
    return NextResponse.json({ error: collectionDatabaseError(profile.error.message) }, { status: 500 });
  }

  const releaseDate = /^\d{4}$/.test(movie.releaseYear ?? "") ? `${movie.releaseYear}-01-01` : null;
  const { error: movieError } = await supabase.from("movies").upsert(
    {
      tmdb_id: movie.tmdbId,
      title: movie.title.trim(),
      poster_path: movie.posterPath || null,
      release_date: releaseDate,
      overview: movie.overview || null,
      cached_at: new Date().toISOString()
    },
    { onConflict: "tmdb_id" }
  );

  if (movieError) {
    return NextResponse.json({ error: collectionDatabaseError(movieError.message) }, { status: 500 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_movies")
    .select("tmdb_id")
    .eq("user_id", user.id)
    .eq("tmdb_id", movie.tmdbId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: collectionDatabaseError(existingError.message) }, { status: 500 });
  }

  const update = body.collection === "wishlist" ? { in_watchlist: body.active } : { liked: body.active };
  const { error } = existing
    ? await supabase
        .from("user_movies")
        .update(update)
        .eq("user_id", user.id)
        .eq("tmdb_id", movie.tmdbId)
    : body.active
      ? await supabase.from("user_movies").insert({
          user_id: user.id,
          tmdb_id: movie.tmdbId,
          status: "watchlist",
          rating: null,
          liked: body.collection === "favourite",
          in_watchlist: body.collection === "wishlist"
        })
      : { error: null };

  if (error) {
    return NextResponse.json({ error: collectionDatabaseError(error.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
