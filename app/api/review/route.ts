import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before deleting reviews." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tmdbId?: number };

  if (!body.tmdbId) {
    return NextResponse.json({ error: "Missing movie." }, { status: 400 });
  }

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", body.tmdbId);

  if (error) {
    return NextResponse.json({ error: databaseErrorMessage(error.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function databaseErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("public.reviews")) {
    return "Database is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor for the project connected to this deployment.";
  }

  return message;
}
