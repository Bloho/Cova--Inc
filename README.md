# Cova

Minimal film reviewing app for `cova.quest`, built for Vercel with Next.js.

## Stack

- Next.js App Router on Vercel
- Supabase Auth for Google, email/password, and password resets
- Supabase Postgres for profiles, follows, movies, ratings, watchlists, reviews, likes, and card presets
- TMDB through `/api/tmdb/search` so `TMDB_API_KEY` stays server-side
- SVG share cards generated from fixed templates in `lib/cards.ts`

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Add Supabase and TMDB credentials
4. Run the SQL in `supabase/schema.sql`
5. Run `supabase/20260614_real_app_migration.sql` if the old schema was already applied
6. `npm run dev`

## Supabase Google Auth

If Google sign-in shows `Unsupported provider: provider is not enabled`, enable it in Supabase:

1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Add the Google OAuth client ID and client secret
3. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://cova.quest/auth/callback`

The app route `/auth/google` already redirects to Supabase with `provider=google`.

If Google returns to `localhost:3000` after granting permission on the deployed site:

1. In Vercel, set `NEXT_PUBLIC_SITE_URL` to your real domain, for example `https://cova.quest`
2. In Supabase Dashboard → Authentication → URL Configuration:
   - Set **Site URL** to `https://cova.quest`
   - Add **Redirect URL** `https://cova.quest/auth/callback`
   - Keep `http://localhost:3000/auth/callback` only for local development
3. In Google Cloud OAuth client, add Authorized redirect URI:
   - `https://jhpmslnoaarvhvvmxnxg.supabase.co/auth/v1/callback`
