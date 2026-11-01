-- Egg Market admin-panel compatibility migration.
-- Run once in Supabase Dashboard -> SQL Editor as a database owner.
-- Safe for an existing project; it does not delete users or game records.

alter table if exists public.game_user_chickens
  add column if not exists created_at timestamptz not null default now();

create or replace function public.game_is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.game_admins where user_id = auth.uid())
      or exists (
        select 1 from auth.users
        where id = auth.uid() and lower(email) = 'muhammaddanyal4545@gmail.com'
      );
$$;

grant execute on function public.game_is_admin() to authenticated;

create or replace function public.game_admin_approve_deposit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.game_deposits;
  ref uuid;
  bonus numeric;
  chicken_price numeric;
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.game_deposits
    where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Deposit not found or already reviewed'; end if;

  insert into public.game_user_chickens (user_id, chicken_type_id, last_collected_at)
    select d.user_id, d.chicken_type_id, now() from generate_series(1, d.quantity);

  update public.game_users set
    total_invested = total_invested + d.total_amount,
    direct_withdraw_limit = direct_withdraw_limit + d.total_amount * 0.30
    where user_id = d.user_id returning referred_by into ref;

  if ref is not null then
    select price into chicken_price from public.game_chicken_types where id = d.chicken_type_id;
    bonus := least(d.total_amount * 0.50, chicken_price * 2);
    update public.game_users
      set referral_withdraw_limit = referral_withdraw_limit + bonus
      where user_id = ref;
    insert into public.game_referral_earnings (referrer_id, referred_user_id, deposit_id, amount)
      values (ref, d.user_id, d.id, bonus);
  end if;

  update public.game_deposits set status = 'approved', reviewed_at = now() where id = d.id;
end;
$$;

grant execute on function public.game_admin_approve_deposit(uuid) to authenticated;
