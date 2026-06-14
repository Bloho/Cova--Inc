create extension if not exists "pgcrypto";

create type public.watch_status as enum ('watched', 'watchlist');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.movies (
  tmdb_id integer primary key,
  title text not null,
  poster_path text,
  release_date date,
  overview text,
  runtime integer,
  cached_at timestamptz not null default now()
);

create table public.user_movies (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null references public.movies(tmdb_id) on delete cascade,
  status public.watch_status not null,
  rating smallint check (rating between 0 and 5),
  liked boolean not null default false,
  watched_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null references public.movies(tmdb_id) on delete cascade,
  rating smallint check (rating between 0 and 5),
  body text not null check (char_length(body) <= 5000),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table public.card_presets (
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

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.movies enable row level security;
alter table public.user_movies enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.card_presets enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "follows are readable" on public.follows for select using (true);
create policy "users manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "movies are readable" on public.movies for select using (true);
create policy "authenticated users can cache movies" on public.movies for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update cached movies" on public.movies for update using (auth.role() = 'authenticated');

create policy "public user movies readable" on public.user_movies for select using (true);
create policy "users manage own movies" on public.user_movies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public reviews readable" on public.reviews for select using (is_public = true or auth.uid() = user_id);
create policy "users manage own reviews" on public.reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "review likes are readable" on public.review_likes for select using (true);
create policy "users manage own review likes" on public.review_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "card presets readable by owner" on public.card_presets for select using (auth.uid() = user_id);
create policy "users manage own card presets" on public.card_presets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
