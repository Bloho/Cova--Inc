alter table public.profiles add column if not exists verified_country text;
alter table public.profiles add column if not exists billing_country text;

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  event_name text not null,
  received_at timestamptz not null default now()
);

create index if not exists subscriptions_user_updated_at_idx
  on public.subscriptions(user_id, updated_at desc);

alter table public.subscriptions enable row level security;
alter table public.razorpay_webhook_events enable row level security;

drop policy if exists "users read own subscriptions" on public.subscriptions;
create policy "users read own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';
