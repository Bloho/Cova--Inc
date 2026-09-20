import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before deleting reviews." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tmdbId?: number; keepWatched?: boolean } | null;

  if (!body || !Number.isSafeInteger(body.tmdbId) || !body.tmdbId || Math.abs(body.tmdbId) > 2147483647 || (body.keepWatched !== undefined && typeof body.keepWatched !== "boolean")) {
    return NextResponse.json({ error: "Invalid movie or Watched preference." }, { status: 400 });
  }

  const { error } = await supabase.rpc("delete_own_review", {
    movie_id: body.tmdbId,
    keep_watched: body.keepWatched ?? false
  });

  if (error) {
    return NextResponse.json({ error: "Could not delete your review. Please try again later." }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
