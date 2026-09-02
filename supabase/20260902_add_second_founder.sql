-- Run this once in the existing production project after deploying the
-- two-founder server change. It does not modify ordinary user accounts.
insert into public.admin_roles (user_id, granted_by)
select users.id, users.id
from auth.users as users
where lower(users.email) in ('ayush.lowkey@gmail.com', 'ayushsamanta904@gmail.com')
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
