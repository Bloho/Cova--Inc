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
5. `npm run dev`

The UI currently uses mock film data so the product surface can be tuned before live auth/data wiring.
