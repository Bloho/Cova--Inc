import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mode?: "signin" | "signup";
    email?: string;
    password?: string;
    displayName?: string;
    turnstileToken?: string;
  };

  if (!body.turnstileToken) {
    return NextResponse.json({ error: "Complete the Turnstile check before continuing." }, { status: 400 });
  }

  if (!body.email || !body.password || !body.mode) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const requestUrl = new URL(request.url);
  const siteUrl = getSiteUrl(requestUrl);
  const displayName = body.displayName?.trim() || body.email.split("@")[0];

  const result =
    body.mode === "signup"
      ? await supabase.auth.signUp({
          email: body.email,
          password: body.password,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
            captchaToken: body.turnstileToken,
            data: {
              full_name: displayName
            }
          }
        })
      : await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
          options: {
            captchaToken: body.turnstileToken
          }
        });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  if (result.data.user && result.data.session) {
    const profile = await ensureProfile(supabase, result.data.user);
    if (profile.error) {
      return NextResponse.json({ error: profile.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: body.mode === "signup" && !result.data.session
  });
}
