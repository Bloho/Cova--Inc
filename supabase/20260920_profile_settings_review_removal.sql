begin;
alter table public.profiles add column if not exists banner_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists profile_media_insert on storage.objects;
drop policy if exists profile_media_delete on storage.objects;
drop policy if exists profile_media_read on storage.objects;
create policy profile_media_read on storage.objects for select using (bucket_id = 'profile-media');
create policy profile_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Both changes commit together; collection flags are preserved when removing Watched.
create or replace function public.delete_own_review(movie_id integer, keep_watched boolean default false)
returns void language plpgsql security invoker set search_path = public as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Sign in required'; end if;
  delete from public.reviews where user_id = viewer and tmdb_id = movie_id;
  if not keep_watched then
    update public.user_movies set status = 'watchlist', rating = null, watched_at = null, updated_at = now()
      where user_id = viewer and tmdb_id = movie_id and (liked or in_watchlist);
    delete from public.user_movies where user_id = viewer and tmdb_id = movie_id and not liked and not in_watchlist;
  end if;
end;
$$;
revoke all on function public.delete_own_review(integer, boolean) from public, anon;
grant execute on function public.delete_own_review(integer, boolean) to authenticated;
commit;
