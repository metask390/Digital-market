-- Egg Market registration repair for an existing Supabase project.
-- Run this in Supabase Dashboard -> SQL Editor as a database owner.
-- It does not delete existing users or game records.

alter table if exists public.game_users
  add column if not exists egg_stock numeric(14,2) not null default 0;

-- Older projects may have created game_user_chickens without this column.
alter table if exists public.game_user_chickens
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.game_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.game_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_admins where user_id = auth.uid())
      or exists (
        select 1 from auth.users
        where id = auth.uid() and lower(email) = 'muhammaddanyal4545@gmail.com'
      );
$$;

create or replace function public.game_register(p_referred_by uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ref uuid;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  if p_referred_by is not null
     and p_referred_by <> uid
     and exists (select 1 from public.game_users where user_id = p_referred_by) then
    ref := p_referred_by;
  end if;

  insert into public.game_users (user_id, wallet_balance, total_invested,
    direct_withdraw_limit, referral_withdraw_limit, referred_by, is_blocked, egg_stock)
  values (uid, 0, 0, 0, 0, ref, false, 0)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.game_register(uuid) from public, anon;
grant execute on function public.game_register(uuid) to authenticated;
grant execute on function public.game_is_admin() to authenticated;

-- After running this script, log in with the existing account.
-- To make an account an admin, replace the email below and run:
-- insert into public.game_admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
-- on conflict (user_id) do nothing;
