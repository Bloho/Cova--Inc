-- Supports the profile count/list query and the single-review lookup used on movie pages.
create index if not exists user_movies_user_status_watched_at_idx
  on public.user_movies (user_id, status, watched_at desc);

create index if not exists reviews_user_tmdb_updated_at_idx
  on public.reviews (user_id, tmdb_id, updated_at desc);

-- Enforces the one-review-per-film rule and lets review saves use one upsert.
delete from public.reviews older
using public.reviews newer
where older.user_id = newer.user_id
  and older.tmdb_id = newer.tmdb_id
  and (older.updated_at, older.id) < (newer.updated_at, newer.id);

create unique index if not exists reviews_user_tmdb_unique_idx
  on public.reviews (user_id, tmdb_id);
