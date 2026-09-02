import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile";
import { hasActiveCovaMembership } from "@/lib/billing/subscription";
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
    typeof movie.tmdbId !== "number" ||
    !Number.isInteger(movie.tmdbId) ||
    !movie.title?.trim()
  ) {
    return NextResponse.json({ error: "Invalid collection request." }, { status: 400 });
  }

  const tmdbId = movie.tmdbId;

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
  const movieResult = tmdbId > 0
    ? await supabase.from("movies").upsert(
        {
          tmdb_id: tmdbId,
          title: movie.title.trim(),
          poster_path: movie.posterPath || null,
          release_date: releaseDate,
          overview: movie.overview || null,
          cached_at: new Date().toISOString()
        },
        { onConflict: "tmdb_id" }
      )
    : { error: null };

  if (movieResult.error) {
    return NextResponse.json({ error: collectionDatabaseError(movieResult.error.message) }, { status: 500 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_movies")
    .select("tmdb_id, in_watchlist, liked")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: collectionDatabaseError(existingError.message) }, { status: 500 });
  }

  const wasActive = body.collection === "wishlist" ? Boolean(existing?.in_watchlist) : Boolean(existing?.liked);
  if (body.active && !wasActive && !await hasActiveCovaMembership(user.id)) {
    const column = body.collection === "wishlist" ? "in_watchlist" : "liked";
    const { count, error: countError } = await supabase
      .from("user_movies")
      .select("tmdb_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq(column, true);

    if (countError) {
      return NextResponse.json({ error: collectionDatabaseError(countError.message) }, { status: 500 });
    }

    if ((count ?? 0) >= 5) {
      return limitReached(body.collection);
    }
  }

  const update = body.collection === "wishlist" ? { in_watchlist: body.active } : { liked: body.active };
  const { error } = existing
    ? await supabase
        .from("user_movies")
        .update(update)
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
    : body.active
      ? await supabase.from("user_movies").insert({
          user_id: user.id,
          tmdb_id: tmdbId,
          status: "watchlist",
          rating: null,
          liked: body.collection === "favourite",
          in_watchlist: body.collection === "wishlist"
        })
      : { error: null };

  if (error) {
    const feature = getLimitFeature(error.message);
    if (feature) return limitReached(feature === "wishlist" ? "wishlist" : "favourite");
    return NextResponse.json({ error: collectionDatabaseError(error.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function getLimitFeature(message: string) {
  if (message.includes("COVA_FREE_LIMIT:wishlist")) return "wishlist";
  if (message.includes("COVA_FREE_LIMIT:favourites")) return "favourite";
  return null;
}

function limitReached(collection: Collection) {
  const feature = collection === "wishlist" ? "wishlist" : "favourites";
  return NextResponse.json({
    error: `The free plan includes up to 5 ${feature}.`,
    code: "FREE_LIMIT_REACHED",
    feature
  }, { status: 403 });
}
