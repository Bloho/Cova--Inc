create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('movie_share_card', 'profile_card_export')),
  target_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_feature_target_created_at_idx
  on public.usage_events(user_id, feature, target_key, created_at desc);

alter table public.usage_events enable row level security;

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
    select 1
    from public.subscriptions
    where user_id = member_user_id
      and subscription_status in ('authenticated', 'active')
      and (current_period_end is null or current_period_end > now())
  ) or exists (
    select 1
    from public.membership_grants
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
  if public.is_cova_member(new.user_id) then
    return new;
  end if;

  if tg_table_name = 'reviews' and tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':reviews', 0));
    select count(*) into existing_count from public.reviews where user_id = new.user_id;
    if existing_count >= 5 then
      raise exception 'COVA_FREE_LIMIT:reviews';
    end if;
  end if;

  if tg_table_name = 'user_movies' then
    if new.in_watchlist and (tg_op = 'INSERT' or not old.in_watchlist) then
      perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':wishlist', 0));
      select count(*) into existing_count from public.user_movies where user_id = new.user_id and in_watchlist;
      if existing_count >= 5 then
        raise exception 'COVA_FREE_LIMIT:wishlist';
      end if;
    end if;

    if new.liked and (tg_op = 'INSERT' or not old.liked) then
      perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':favourites', 0));
      select count(*) into existing_count from public.user_movies where user_id = new.user_id and liked;
      if existing_count >= 5 then
        raise exception 'COVA_FREE_LIMIT:favourites';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_free_plan_limit on public.reviews;
create trigger reviews_free_plan_limit
  before insert on public.reviews
  for each row execute function public.enforce_free_plan_limits();

drop trigger if exists user_movies_free_plan_limit on public.user_movies;
create trigger user_movies_free_plan_limit
  before insert or update of in_watchlist, liked on public.user_movies
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
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_feature not in ('movie_share_card', 'profile_card_export') or char_length(trim(p_target_key)) = 0 then
    raise exception 'Invalid usage request';
  end if;

  if public.is_cova_member(current_user_id) then
    return query select true, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || p_feature || ':' || p_target_key, 0));
  select count(*) into existing_count
  from public.usage_events
  where user_id = current_user_id
    and feature = p_feature
    and target_key = p_target_key;

  if existing_count >= 5 then
    return query select false, existing_count;
    return;
  end if;

  insert into public.usage_events(user_id, feature, target_key)
  values (current_user_id, p_feature, p_target_key);

  return query select true, existing_count + 1;
end;
$$;

revoke all on function public.is_cova_member(uuid) from public;
revoke all on function public.enforce_free_plan_limits() from public;
revoke all on function public.consume_free_usage(text, text) from public;
grant execute on function public.consume_free_usage(text, text) to authenticated;

notify pgrst, 'reload schema';
