import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const kind = url.searchParams.get("kind");
  if (kind === "followers" || kind === "following") {
    const offset = Math.min(10000, Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0));
    const followers = kind === "followers";
    const relation = followers ? "follower_id" : "following_id";
    const { data, error } = await supabase.from("follows")
      .select(`created_at, person:profiles!follows_${relation}_fkey(id, username, display_name, avatar_url)`)
      .eq(followers ? "following_id" : "follower_id", id)
      .order("created_at", { ascending: false }).order(relation)
      .range(offset, offset + 20);
    if (error) return NextResponse.json({ error: "Could not load connections." }, { status: 503, headers });
    return NextResponse.json({ people: (data ?? []).slice(0, 20).map(row => row.person), hasMore: (data?.length ?? 0) > 20 }, { headers });
  }
  const { data: { user } } = await supabase.auth.getUser();
  const [followers, following, relationship] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
    user ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", id).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);
  if (followers.error || following.error || relationship.error) return NextResponse.json({ error: "Connections are temporarily unavailable." }, { status: 503, headers });
  return NextResponse.json({ followers: followers.count ?? 0, following: following.count ?? 0, isFollowing: Boolean(relationship.data) }, { headers });
}

async function mutate(request: Request, follow: boolean) {
  // Cookie-authenticated writes must originate from this site.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to follow people." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== "string" || !uuid.test(id) || id === user.id) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  const { error } = follow
    ? await supabase.from("follows").insert({ follower_id: user.id, following_id: id })
    : await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
  // Repeated follow requests are idempotent; the primary key prevents duplicates.
  if (error && !(follow && error.code === "23505")) return NextResponse.json({ error: "Could not update follow. Please try again." }, { status: 503 });
  return NextResponse.json({ isFollowing: follow }, { headers });
}

export const POST = (request: Request) => mutate(request, true);
export const DELETE = (request: Request) => mutate(request, false);
