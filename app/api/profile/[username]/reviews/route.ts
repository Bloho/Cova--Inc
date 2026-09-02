import { NextResponse } from "next/server";
import { PROFILE_REVIEW_PAGE_SIZE, toProfileReviewItem } from "@/lib/profile-reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? String(PROFILE_REVIEW_PAGE_SIZE), 10);
  const limit = Math.min(Math.max(requestedLimit || PROFILE_REVIEW_PAGE_SIZE, 1), 16);
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();

  if (!profile) {
    return NextResponse.json({ reviews: [], hasMore: false }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("id, body, created_at, movies(tmdb_id, title, poster_path)")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return NextResponse.json({ reviews: [], hasMore: false }, { status: 500 });
  }

  const rows = data ?? [];
  return NextResponse.json(
    {
      reviews: rows.slice(0, limit).map(toProfileReviewItem),
      hasMore: rows.length > limit
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
