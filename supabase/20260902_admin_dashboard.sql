-- Private administrator roles and a separate ID range for Cova-created films.
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

-- Regular accounts can only maintain the positive-ID TMDB cache. Custom films
-- are written through server-side admin routes using the service role.
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

-- Bootstrap the founder. Appointed administrators are added only by the
-- founder-authorized server endpoint, never by a browser client.
insert into public.admin_roles (user_id, granted_by)
select users.id, users.id
from auth.users as users
where lower(users.email) in ('ayush.lowkey@gmail.com', 'ayushsamanta904@gmail.com')
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
