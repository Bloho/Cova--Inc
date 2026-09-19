begin;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert (follower_id, following_id), delete on public.follows to authenticated;

drop policy if exists "follows are readable" on public.follows;
drop policy if exists "users manage own follows" on public.follows;
drop policy if exists follows_public_read on public.follows;
drop policy if exists follows_own_insert on public.follows;
drop policy if exists follows_own_delete on public.follows;
create policy follows_public_read on public.follows for select using (true);
create policy follows_own_insert on public.follows for insert to authenticated
  with check ((select auth.uid()) = follower_id);
create policy follows_own_delete on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);

create index if not exists follows_followers_page_idx on public.follows (following_id, created_at desc, follower_id);
create index if not exists follows_following_page_idx on public.follows (follower_id, created_at desc, following_id);
create index if not exists user_movies_favourites_page_idx
  on public.user_movies (user_id, updated_at desc, tmdb_id) where liked = true;
create index if not exists user_movies_wishlist_page_idx
  on public.user_movies (user_id, updated_at desc, tmdb_id) where in_watchlist = true;
create index if not exists reviews_public_profile_page_idx
  on public.reviews (user_id, created_at desc, id) where is_public = true;

commit;
