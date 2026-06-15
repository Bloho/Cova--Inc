import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-z0-9-]{3,10}$/;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before choosing a username." }, { status: 401 });
  }

  const body = (await request.json()) as { username?: string };
  const username = normalizeUsername(body.username ?? "");

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Username should be 3-10 characters using letters, numbers, and dashes." }, { status: 400 });
  }

  const profile = await ensureProfile(supabase, user);
  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Username is taken." }, { status: 409 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      onboarded_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username });
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 10);
}
