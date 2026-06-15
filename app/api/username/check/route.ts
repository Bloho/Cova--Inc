import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-z0-9-]{3,10}$/;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const username = normalizeUsername(requestUrl.searchParams.get("username") ?? "");

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({
      available: false,
      valid: false,
      message: "Username should be 3-10 characters using letters, numbers, and dashes."
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ available: false, valid: true, message: error.message }, { status: 500 });
  }

  const available = !data || data.id === user?.id;

  return NextResponse.json({
    available,
    valid: true,
    username,
    message: available ? "Username available" : "Username is taken"
  });
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 10);
}
