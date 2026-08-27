alter table public.subscriptions add column if not exists promotion_code text;
alter table public.subscriptions add column if not exists razorpay_offer_id text;

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

create index if not exists membership_grants_user_ends_at_idx
  on public.membership_grants(user_id, ends_at desc);

alter table public.membership_grants enable row level security;

drop policy if exists "users read own membership grants" on public.membership_grants;
create policy "users read own membership grants"
  on public.membership_grants for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';
