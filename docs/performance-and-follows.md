# Performance and follows rollout

## Required database migration

Apply `supabase/20260919_follows_and_profile_indexes.sql` in the Supabase SQL editor for the project used by this deployment, then deploy the application. This reuses the existing follows table, tightens its grants/policies, and adds indexes. It is safe to rerun. No service-role key is needed in the browser. If the table is missing, profiles show a retryable connections-unavailable state instead of fabricated counts.

Follows are public, matching public profiles. The authenticated session supplies the follower ID. RLS allows users to insert/delete only their own relationships; self-follows and duplicates are rejected by database constraints. Deleting a profile cascades its relationships. No update privilege is granted.

## Changes

- Independent homepage/movie requests run concurrently rather than serially.
- Profile trending data streams independently; a slow TMDB response does not block profile content.
- Favourites and wishlist first-page queries are bounded, with subsequent small batches fetched on scroll or Load more.
- Visited collection tabs retain loaded data. Inactive tabs do not prefetch more pages.
- Dense poster grids request smaller TMDB images and prefetch movie routes only on hover/keyboard focus, not for every visible poster.
- Search/log dialogs and the movie share-card renderer are separate on-demand chunks.
- Review poster images decode asynchronously and load lazily. Offscreen review rows can skip rendering work.
- Added partial profile-query indexes and both directions of follow-list indexes.

## Verification

Run `node --test tests/follows.test.cjs`, `npx tsc --noEmit`, and `npm run build`.

After applying the migration, verify with two disposable test accounts: follow/unfollow, duplicate follow, self-follow rejection, both counts, lists larger than 20, and rollback after a failed request. Test direct Supabase requests as account B attempting to delete account A's follow: RLS must prevent it. The automated route tests mock Supabase and do not substitute for this database check.

Use a production build for timing comparisons, not Next development compilation. Compare cold/warm homepage, movie and profile navigations on throttled mobile networking; inspect transferred JS, image bytes, request count, LCP and INP. No speed multiplier is claimed without before/after production measurements. Authenticated responses are not shared-cacheable.
