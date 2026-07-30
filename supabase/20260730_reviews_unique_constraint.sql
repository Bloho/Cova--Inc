-- Enforce one review per user per movie so the review upsert can be atomic.
delete from public.reviews older
using public.reviews newer
where older.user_id = newer.user_id
  and older.tmdb_id = newer.tmdb_id
  and (older.updated_at, older.id) < (newer.updated_at, newer.id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and contype = 'u'
      and conname = 'reviews_user_tmdb_unique'
  ) then
    if exists (
      select 1
      from pg_class
      where relname = 'reviews_user_tmdb_unique_idx'
        and relnamespace = 'public'::regnamespace
    ) then
      alter table public.reviews
        add constraint reviews_user_tmdb_unique
        unique using index reviews_user_tmdb_unique_idx;
    else
      alter table public.reviews
        add constraint reviews_user_tmdb_unique
        unique (user_id, tmdb_id);
    end if;
  end if;
end $$;
