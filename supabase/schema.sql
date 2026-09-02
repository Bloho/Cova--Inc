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
alter table public.profiles add column if not exists verified_country text;
alter table public.profiles add column if not exists billing_country text;
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
  in_watchlist boolean not null default false,
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

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  razorpay_customer_id text,
  razorpay_subscription_id text not null unique,
  razorpay_plan_id text not null,
  subscription_status text not null,
  subscription_region text not null check (subscription_region in ('IN', 'GLOBAL')),
  subscription_currency text not null check (subscription_currency in ('INR', 'USD')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  razorpay_event_created_at bigint,
  promotion_code text,
  razorpay_offer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  promotion_code text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, promotion_code),
  check (ends_at > starts_at)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('movie_share_card', 'profile_card_export')),
  target_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  event_name text not null,
  received_at timestamptz not null default now()
);

create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists user_movies_user_id_idx on public.user_movies(user_id);
create index if not exists user_movies_user_status_watched_at_idx on public.user_movies(user_id, status, watched_at desc);
create index if not exists user_movies_user_wishlist_updated_at_idx
  on public.user_movies(user_id, updated_at desc) where in_watchlist;
create index if not exists user_movies_user_favourites_updated_at_idx
  on public.user_movies(user_id, updated_at desc) where liked;
create index if not exists reviews_user_id_created_at_idx on public.reviews(user_id, created_at desc);
create index if not exists reviews_tmdb_id_created_at_idx on public.reviews(tmdb_id, created_at desc);
create index if not exists reviews_user_tmdb_updated_at_idx on public.reviews(user_id, tmdb_id, updated_at desc);
create index if not exists subscriptions_user_updated_at_idx on public.subscriptions(user_id, updated_at desc);
create index if not exists membership_grants_user_ends_at_idx on public.membership_grants(user_id, ends_at desc);
create index if not exists usage_events_user_feature_target_created_at_idx on public.usage_events(user_id, feature, target_key, created_at desc);

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
alter table public.subscriptions enable row level security;
alter table public.razorpay_webhook_events enable row level security;
alter table public.membership_grants enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users read own membership grants" on public.membership_grants;
create policy "users read own membership grants"
  on public.membership_grants for select using (auth.uid() = user_id);

drop policy if exists "users read own usage events" on public.usage_events;
create policy "users read own usage events"
  on public.usage_events for select using (auth.uid() = user_id);

create or replace function public.is_cova_member(member_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = member_user_id
      and subscription_status in ('authenticated', 'active')
      and (current_period_end is null or current_period_end > now())
  ) or exists (
    select 1 from public.membership_grants
    where user_id = member_user_id
      and starts_at <= now()
      and ends_at > now()
  );
$$;

create or replace function public.enforce_free_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
begin
  if public.is_cova_member(new.user_id) then return new; end if;

  if tg_table_name = 'reviews' and tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':reviews', 0));
    select count(*) into existing_count from public.reviews where user_id = new.user_id;
    if existing_count >= 5 then raise exception 'COVA_FREE_LIMIT:reviews'; end if;
  end if;

  if tg_table_name = 'user_movies' then
    if new.in_watchlist and (tg_op = 'INSERT' or not old.in_watchlist) then
      perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':wishlist', 0));
      select count(*) into existing_count from public.user_movies where user_id = new.user_id and in_watchlist;
      if existing_count >= 5 then raise exception 'COVA_FREE_LIMIT:wishlist'; end if;
    end if;
    if new.liked and (tg_op = 'INSERT' or not old.liked) then
      perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':favourites', 0));
      select count(*) into existing_count from public.user_movies where user_id = new.user_id and liked;
      if existing_count >= 5 then raise exception 'COVA_FREE_LIMIT:favourites'; end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_free_plan_limit on public.reviews;
create trigger reviews_free_plan_limit before insert on public.reviews
  for each row execute function public.enforce_free_plan_limits();

drop trigger if exists user_movies_free_plan_limit on public.user_movies;
create trigger user_movies_free_plan_limit before insert or update of in_watchlist, liked on public.user_movies
  for each row execute function public.enforce_free_plan_limits();

create or replace function public.consume_free_usage(p_feature text, p_target_key text)
returns table(allowed boolean, used_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_count integer;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if p_feature not in ('movie_share_card', 'profile_card_export') or char_length(trim(p_target_key)) = 0 then
    raise exception 'Invalid usage request';
  end if;
  if public.is_cova_member(current_user_id) then
    return query select true, 0;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || p_feature || ':' || p_target_key, 0));
  select count(*) into existing_count from public.usage_events
  where user_id = current_user_id and feature = p_feature and target_key = p_target_key;
  if existing_count >= 5 then
    return query select false, existing_count;
    return;
  end if;
  insert into public.usage_events(user_id, feature, target_key) values (current_user_id, p_feature, p_target_key);
  return query select true, existing_count + 1;
end;
$$;

revoke all on function public.is_cova_member(uuid) from public;
revoke all on function public.enforce_free_plan_limits() from public;
revoke all on function public.consume_free_usage(text, text) from public;
grant execute on function public.consume_free_usage(text, text) to authenticated;

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

drop policy if exists "users read own subscriptions" on public.subscriptions;
create policy "users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';

-- Admin dashboard: founder-governed roles and an isolated custom-film range.
-- Keep this aligned with supabase/20260902_admin_dashboard.sql for existing projects.
create sequence if not exists public.custom_movie_id_seq
  minvalue -2147483648
  maxvalue -1
  start with -1
  increment by -1;

alter table public.movies
  add column if not exists is_custom boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.movies
  alter column tmdb_id set default nextval('public.custom_movie_id_seq'::regclass);

alter table public.movies
  drop constraint if exists movies_tmdb_id_source_check;

alter table public.movies
  add constraint movies_tmdb_id_source_check
  check (
    (is_custom and tmdb_id < 0 and created_by is not null)
    or
    (not is_custom and tmdb_id > 0 and created_by is null)
  ) not valid;

drop policy if exists "authenticated users can cache movies" on public.movies;
drop policy if exists "authenticated users can update cached movies" on public.movies;

create policy "authenticated users can cache TMDB movies"
  on public.movies for insert to authenticated
  with check (tmdb_id > 0 and is_custom = false and created_by is null);

create policy "authenticated users can update TMDB movies"
  on public.movies for update to authenticated
  using (tmdb_id > 0 and is_custom = false and created_by is null)
  with check (tmdb_id > 0 and is_custom = false and created_by is null);

create table if not exists public.admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;
revoke all on table public.admin_roles from anon, authenticated;
grant all on table public.admin_roles to service_role;
grant usage, select on sequence public.custom_movie_id_seq to service_role;

insert into public.admin_roles (user_id, granted_by)
select users.id, users.id
from auth.users as users
where lower(users.email) = 'ayush.lowkey@gmail.com'
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
