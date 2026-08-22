-- Persistent wishlist and favourites, without changing a user's watched state.
alter table public.user_movies
add column if not exists in_watchlist boolean not null default false;

update public.user_movies
set in_watchlist = true
where status = 'watchlist' and in_watchlist = false;

create index if not exists user_movies_user_wishlist_updated_at_idx
  on public.user_movies(user_id, updated_at desc) where in_watchlist;

create index if not exists user_movies_user_favourites_updated_at_idx
  on public.user_movies(user_id, updated_at desc) where liked;

notify pgrst, 'reload schema';
