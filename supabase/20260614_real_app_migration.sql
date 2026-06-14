alter table public.user_movies drop constraint if exists user_movies_pkey;

delete from public.user_movies a
using public.user_movies b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.tmdb_id = b.tmdb_id;

alter table public.user_movies
  add constraint user_movies_pkey primary key (user_id, tmdb_id);

drop policy if exists "authenticated users can update cached movies" on public.movies;
create policy "authenticated users can update cached movies"
  on public.movies for update
  using (auth.role() = 'authenticated');
