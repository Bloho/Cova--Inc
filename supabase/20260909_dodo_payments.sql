-- Preserve past provider records in neutral columns before removing the old integration.
alter table public.subscriptions add column if not exists payment_provider text;
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists provider_product_id text;
alter table public.subscriptions add column if not exists provider_event_at timestamptz;

update public.subscriptions
set
  payment_provider = coalesce(payment_provider, 'legacy'),
  provider_customer_id = coalesce(provider_customer_id, razorpay_customer_id),
  provider_subscription_id = coalesce(provider_subscription_id, razorpay_subscription_id),
  provider_product_id = coalesce(provider_product_id, razorpay_plan_id),
  provider_event_at = coalesce(provider_event_at, to_timestamp(razorpay_event_created_at));

alter table public.subscriptions alter column payment_provider set not null;
alter table public.subscriptions alter column provider_subscription_id set not null;
alter table public.subscriptions alter column provider_product_id set not null;

alter table public.subscriptions drop constraint if exists subscriptions_payment_provider_check;
alter table public.subscriptions add constraint subscriptions_payment_provider_check
  check (payment_provider in ('dodo', 'legacy'));

create unique index if not exists subscriptions_provider_subscription_id_key
  on public.subscriptions(provider_subscription_id);

alter table public.subscriptions drop column if exists razorpay_customer_id;
alter table public.subscriptions drop column if exists razorpay_subscription_id;
alter table public.subscriptions drop column if exists razorpay_plan_id;
alter table public.subscriptions drop column if exists razorpay_event_created_at;
alter table public.subscriptions drop column if exists razorpay_offer_id;

do $$
begin
  if to_regclass('public.billing_webhook_events') is null and to_regclass('public.razorpay_webhook_events') is not null then
    alter table public.razorpay_webhook_events rename to billing_webhook_events;
  end if;
end $$;

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_name text not null,
  payment_provider text not null check (payment_provider in ('dodo', 'legacy')),
  received_at timestamptz not null default now()
);

alter table public.billing_webhook_events add column if not exists payment_provider text;
update public.billing_webhook_events set payment_provider = coalesce(payment_provider, 'legacy');
alter table public.billing_webhook_events alter column payment_provider set not null;
alter table public.billing_webhook_events drop constraint if exists billing_webhook_events_payment_provider_check;
alter table public.billing_webhook_events add constraint billing_webhook_events_payment_provider_check
  check (payment_provider in ('dodo', 'legacy'));
alter table public.billing_webhook_events enable row level security;

notify pgrst, 'reload schema';
