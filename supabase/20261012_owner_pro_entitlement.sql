-- Founder accounts are entitled to Cova Pro without a paid subscription.
-- This function is used by the review, wishlist, favourites, and usage-limit
-- database guards, so it must agree with the application-level membership check.
create or replace function public.is_cova_member(member_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where id = member_user_id
      and lower(email) in ('ayush.lowkey@gmail.com', 'ayushsamanta904@gmail.com')
  ) or exists (
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

revoke all on function public.is_cova_member(uuid) from public;
notify pgrst, 'reload schema';
