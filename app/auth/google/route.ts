import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const siteUrl = getSiteUrl(requestUrl);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in is not configured.")}`, requestUrl.origin));
  }

  return NextResponse.redirect(data.url);
}
