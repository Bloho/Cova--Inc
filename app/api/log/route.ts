import { NextResponse } from "next/server";
import type { Movie } from "@/lib/data";
import { ensureProfile } from "@/lib/profile";
import { normalizeRating } from "@/lib/ratings";
import { countReviewWords, MAX_REVIEW_WORDS } from "@/lib/reviews";
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

  const rating = normalizeRating(body.rating);
  const review = body.review?.trim() ?? "";

  if (countReviewWords(review) > MAX_REVIEW_WORDS) {
    return NextResponse.json({ error: `Reviews can be up to ${MAX_REVIEW_WORDS} words.` }, { status: 400 });
  }

  const profile = await ensureProfile(supabase, user);
  if (profile.error) {
    return NextResponse.json({ error: databaseErrorMessage(profile.error.message) }, { status: 500 });
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
    return NextResponse.json({ error: databaseErrorMessage(movieError.message) }, { status: 500 });
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
    return NextResponse.json({ error: databaseErrorMessage(logError.message) }, { status: 500 });
  }

  if (review) {
    const { data: existingReviews, error: existingReviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("tmdb_id", movie.tmdbId)
      .order("updated_at", { ascending: false });

    if (existingReviewError) {
      return NextResponse.json({ error: databaseErrorMessage(existingReviewError.message) }, { status: 500 });
    }

    const existingReviewId = existingReviews?.[0]?.id;
    const duplicateIds = (existingReviews ?? []).slice(1).map((row) => row.id);

    if (existingReviewId) {
      const { error: reviewError } = await supabase
        .from("reviews")
        .update({
          rating: rating || null,
          body: review,
          is_public: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingReviewId)
        .eq("user_id", user.id);

      if (reviewError) {
        return NextResponse.json({ error: databaseErrorMessage(reviewError.message) }, { status: 500 });
      }
    } else {
      const { error: reviewError } = await supabase.from("reviews").insert({
        user_id: user.id,
        tmdb_id: movie.tmdbId,
        rating: rating || null,
        body: review,
        is_public: true
      });

      if (reviewError) {
        return NextResponse.json({ error: databaseErrorMessage(reviewError.message) }, { status: 500 });
      }
    }

    if (duplicateIds.length) {
      await supabase.from("reviews").delete().in("id", duplicateIds).eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}

function databaseErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("public.profiles")) {
    return "Database is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor for the project connected to this deployment.";
  }

  return message;
}
