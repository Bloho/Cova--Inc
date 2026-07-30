create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'watch_status' and typnamespace = 'public'::regnamespace) then
    create type public.watch_status as enum ('watched', 'watchlist');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null,
  avatar_url text,
  bio text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles alter column username drop not null;
alter table public.profiles add column if not exists onboarded_at timestamptz;
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9-]{3,10}$') not valid;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.movies (
  tmdb_id integer primary key,
  title text not null,
  poster_path text,
  release_date date,
  overview text,
  runtime integer,
  cached_at timestamptz not null default now()
);

create table if not exists public.user_movies (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null references public.movies(tmdb_id) on delete cascade,
  status public.watch_status not null,
  rating numeric(2,1) check (rating between 0 and 5 and rating * 2 = floor(rating * 2)),
  liked boolean not null default false,
  watched_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null references public.movies(tmdb_id) on delete cascade,
  rating numeric(2,1) check (rating between 0 and 5 and rating * 2 = floor(rating * 2)),
  body text not null check (char_length(body) <= 5000),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table if not exists public.card_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('profile', 'movie')),
  name text not null,
  background_color text not null,
  shape_color text not null,
  text_color text not null,
  accent_color text not null,
  created_at timestamptz not null default now()
);

create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists user_movies_user_id_idx on public.user_movies(user_id);
create index if not exists user_movies_user_status_watched_at_idx on public.user_movies(user_id, status, watched_at desc);
create index if not exists reviews_user_id_created_at_idx on public.reviews(user_id, created_at desc);
create index if not exists reviews_tmdb_id_created_at_idx on public.reviews(tmdb_id, created_at desc);
create index if not exists reviews_user_tmdb_updated_at_idx on public.reviews(user_id, tmdb_id, updated_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, onboarded_at)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Cova user'),
    new.raw_user_meta_data->>'avatar_url',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, username, display_name, avatar_url)
select
  users.id,
  null,
  coalesce(users.raw_user_meta_data->>'full_name', users.email, 'Cova user'),
  users.raw_user_meta_data->>'avatar_url'
from auth.users
left join public.profiles on profiles.id = users.id
where profiles.id is null;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.movies enable row level security;
alter table public.user_movies enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.card_presets enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "follows are readable" on public.follows;
drop policy if exists "users manage own follows" on public.follows;
create policy "follows are readable" on public.follows for select using (true);
create policy "users manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

drop policy if exists "movies are readable" on public.movies;
drop policy if exists "authenticated users can cache movies" on public.movies;
drop policy if exists "authenticated users can update cached movies" on public.movies;
create policy "movies are readable" on public.movies for select using (true);
create policy "authenticated users can cache movies" on public.movies for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update cached movies" on public.movies for update using (auth.role() = 'authenticated');

drop policy if exists "public user movies readable" on public.user_movies;
drop policy if exists "users manage own movies" on public.user_movies;
create policy "public user movies readable" on public.user_movies for select using (true);
create policy "users manage own movies" on public.user_movies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public reviews readable" on public.reviews;
drop policy if exists "users manage own reviews" on public.reviews;
create policy "public reviews readable" on public.reviews for select using (is_public = true or auth.uid() = user_id);
create policy "users manage own reviews" on public.reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "review likes are readable" on public.review_likes;
drop policy if exists "users manage own review likes" on public.review_likes;
create policy "review likes are readable" on public.review_likes for select using (true);
create policy "users manage own review likes" on public.review_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "card presets readable by owner" on public.card_presets;
drop policy if exists "users manage own card presets" on public.card_presets;
create policy "card presets readable by owner" on public.card_presets for select using (auth.uid() = user_id);
create policy "users manage own card presets" on public.card_presets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
