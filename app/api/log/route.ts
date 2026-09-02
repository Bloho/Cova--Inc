import { NextResponse } from "next/server";
import type { Movie } from "@/lib/data";
import { ensureProfile } from "@/lib/profile";
import { normalizeRating } from "@/lib/ratings";
import { countReviewWords, MAX_REVIEW_WORDS } from "@/lib/reviews";
import { hasActiveCovaMembership } from "@/lib/billing/subscription";
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

  const movie = body.movie;
  const [profile, movieResult] = await Promise.all([
    ensureProfile(supabase, user),
    movie.tmdbId > 0
      ? supabase.from("movies").upsert({
          tmdb_id: movie.tmdbId,
          title: movie.title,
          poster_path: movie.posterPath,
          overview: movie.overview,
          release_date: movie.releaseYear && /^\d{4}$/.test(movie.releaseYear) ? `${movie.releaseYear}-01-01` : null
        })
      : Promise.resolve({ error: null })
  ]);

  if (profile.error) {
    return NextResponse.json({ error: databaseErrorMessage(profile.error.message) }, { status: 500 });
  }

  if (movieResult.error) {
    return NextResponse.json({ error: databaseErrorMessage(movieResult.error.message) }, { status: 500 });
  }

  if (review) {
    const [{ data: existingReview, error: existingReviewError }, isMember] = await Promise.all([
      supabase.from("reviews").select("id").eq("user_id", user.id).eq("tmdb_id", movie.tmdbId).maybeSingle(),
      hasActiveCovaMembership(user.id)
    ]);

    if (existingReviewError) {
      return NextResponse.json({ error: databaseErrorMessage(existingReviewError.message) }, { status: 500 });
    }

    if (!existingReview && !isMember) {
      const { count, error: countError } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        return NextResponse.json({ error: databaseErrorMessage(countError.message) }, { status: 500 });
      }

      if ((count ?? 0) >= 5) {
        return limitReached("reviews");
      }
    }
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
    const reviewError = await saveReview(supabase, {
      userId: user.id,
      tmdbId: movie.tmdbId,
      rating: rating || null,
      body: review
    });

    if (reviewError) {
      if (reviewError.includes("COVA_FREE_LIMIT:reviews")) {
        return limitReached("reviews");
      }
      return NextResponse.json({ error: databaseErrorMessage(reviewError) }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

function limitReached(feature: "reviews") {
  return NextResponse.json({
    error: "The free plan includes up to 5 reviews.",
    code: "FREE_LIMIT_REACHED",
    feature
  }, { status: 403 });
}

async function saveReview(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  review: { userId: string; tmdbId: number; rating: number | null; body: string }
) {
  const payload = {
    user_id: review.userId,
    tmdb_id: review.tmdbId,
    rating: review.rating,
    body: review.body,
    is_public: true,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("reviews").upsert(payload, { onConflict: "user_id,tmdb_id" });

  if (!error || !error.message.includes("no unique or exclusion constraint matching the ON CONFLICT specification")) {
    return error?.message ?? null;
  }

  // Older deployments can be missing the unique review key. Keep saves working
  // until the accompanying migration is applied, then use the one-request upsert above.
  const { data: existingReview, error: lookupError } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", review.userId)
    .eq("tmdb_id", review.tmdbId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return lookupError.message;
  }

  const fallback = existingReview
    ? await supabase.from("reviews").update(payload).eq("id", existingReview.id)
    : await supabase.from("reviews").insert(payload);

  return fallback.error?.message ?? null;
}

function databaseErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("public.profiles")) {
    return "Database is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor for the project connected to this deployment.";
  }

  return message;
}
