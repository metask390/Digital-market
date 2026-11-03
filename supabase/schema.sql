-- =====================================================================
-- Egg Market - Supabase schema, Row Level Security and game RPCs
-- Run this whole file once in the Supabase SQL editor.
--
-- Auth setup: Authentication > Providers > Email: enable "Email",
-- DISABLE "Confirm email" (no OTP / no email verification).
--
-- All money-moving actions are done by SECURITY DEFINER functions so that
-- they are atomic and cannot be forged from the browser. Browsers can only
-- READ their own rows; they never write balances directly.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table if not exists public.game_users (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  wallet_balance          numeric(14,2) not null default 0 check (wallet_balance >= 0),
  egg_stock               numeric(14,2) not null default 0 check (egg_stock >= 0), -- collected, not yet sold
  total_invested          numeric(14,2) not null default 0,
  direct_withdraw_limit   numeric(14,2) not null default 0 check (direct_withdraw_limit >= 0),
  referral_withdraw_limit numeric(14,2) not null default 0 check (referral_withdraw_limit >= 0),
  referred_by             uuid references public.game_users(user_id) on delete set null,
  is_blocked              boolean not null default false,
  created_at              timestamptz not null default now()
  -- NOTE: email is intentionally NOT stored here (it lives in Supabase Auth).
);

create table if not exists public.game_chicken_types (
  id         integer primary key,
  name       text not null,
  price      numeric(14,2) not null check (price > 0),
  egg_value  numeric(14,2) not null check (egg_value > 0),
  color      text not null default '#22c55e'
);

create table if not exists public.game_user_chickens (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.game_users(user_id) on delete cascade,
  chicken_type_id   integer not null references public.game_chicken_types(id),
  last_collected_at timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists game_user_chickens_user_idx on public.game_user_chickens(user_id);

create table if not exists public.game_deposits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.game_users(user_id) on delete cascade,
  chicken_type_id integer not null references public.game_chicken_types(id),
  quantity        integer not null check (quantity > 0),
  total_amount    numeric(14,2) not null check (total_amount > 0),
  transaction_id  text not null,
  sender_name     text not null,
  screenshot_url  text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);
create index if not exists game_deposits_status_idx on public.game_deposits(status, created_at);
-- A transaction id can only be used once unless that deposit was rejected.
create unique index if not exists game_deposits_txn_unique
  on public.game_deposits (lower(transaction_id)) where status <> 'rejected';

create table if not exists public.game_withdrawals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.game_users(user_id) on delete cascade,
  amount              numeric(14,2) not null check (amount > 0),
  method              text not null default 'easypaisa',
  account_number      text not null,
  account_name        text not null,
  status              text not null default 'pending' check (status in ('pending','completed','rejected')),
  direct_limit_used   numeric(14,2) not null default 0,   -- remembered so a rejection can restore it
  referral_limit_used numeric(14,2) not null default 0,
  created_at          timestamptz not null default now(),
  reviewed_at         timestamptz
);
create index if not exists game_withdrawals_user_idx on public.game_withdrawals(user_id, created_at desc);
create index if not exists game_withdrawals_status_idx on public.game_withdrawals(status, created_at);

create table if not exists public.game_settings (
  id                   integer primary key default 1 check (id = 1),
  easypaisa_name       text not null default '',
  easypaisa_number     text not null default '',
  jazzcash_name        text not null default '',
  jazzcash_number      text not null default '',
  bank_name            text not null default '',
  bank_account_name    text not null default '',
  bank_account_number  text not null default ''
);

create table if not exists public.game_payment_accounts (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null default 'other',
  label          text not null,
  account_name   text not null default '',
  account_number text not null,
  active         boolean not null default true,
  sort_order     integer not null default 10,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint game_payment_accounts_number_check check (length(trim(account_number)) > 0)
);
create index if not exists game_payment_accounts_active_idx on public.game_payment_accounts(active, sort_order, created_at);

create table if not exists public.game_referral_earnings (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references public.game_users(user_id) on delete cascade,
  referred_user_id uuid not null references public.game_users(user_id) on delete cascade,
  deposit_id       uuid not null references public.game_deposits(id) on delete cascade,
  amount           numeric(14,2) not null,
  created_at       timestamptz not null default now()
);

create table if not exists public.game_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.game_users(user_id) on delete cascade,
  title      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists game_notifications_user_idx on public.game_notifications(user_id, created_at desc);

create table if not exists public.game_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ------------------------------------------------------------------ seed
insert into public.game_chicken_types (id, name, price, egg_value, color) values
  (1,  'Sunny Chick',      200,   5,   '#facc15'),
  (2,  'Brown Hen',        400,   15,  '#d97706'),
  (3,  'Speckled Hen',     700,   25,  '#a16207'),
  (4,  'Golden Layer',     1000,  50,  '#f59e0b'),
  (5,  'Rosy Rooster',     1500,  60,  '#f43f5e'),
  (6,  'Meadow Queen',     2000,  70,  '#22c55e'),
  (7,  'Sky Feather',      2500,  90,  '#0ea5e9'),
  (8,  'Royal Plume',      3000,  100, '#8b5cf6'),
  (9,  'Emerald Champion', 4000,  150, '#10b981'),
  (10, 'Diamond Cluck',    10000, 400, '#06b6d4')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, egg_value = excluded.egg_value, color = excluded.color;

insert into public.game_settings (id) values (1) on conflict (id) do nothing;

-- --------------------------------------------------------------- helpers
create or replace function public.game_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_admins where user_id = auth.uid())
      or exists (
        select 1 from auth.users
        where id = auth.uid() and lower(email) = 'muhammaddanyal4545@gmail.com'
      );
$$;

-- Locks and returns the caller's row; raises if missing or blocked.
create or replace function public.game_lock_active_user(p_uid uuid) returns public.game_users
language plpgsql security definer set search_path = public as $$
declare u public.game_users;
begin
  if p_uid is null then raise exception 'Please log in first'; end if;
  select * into u from public.game_users where user_id = p_uid for update;
  if not found then raise exception 'Account not found'; end if;
  if u.is_blocked then raise exception 'Your account is blocked. Please contact support.'; end if;
  return u;
end $$;

-- ------------------------------------------------------------------- RLS
alter table public.game_users             enable row level security;
alter table public.game_chicken_types     enable row level security;
alter table public.game_user_chickens     enable row level security;
alter table public.game_deposits          enable row level security;
alter table public.game_withdrawals       enable row level security;
alter table public.game_settings          enable row level security;
alter table public.game_payment_accounts  enable row level security;
alter table public.game_referral_earnings enable row level security;
alter table public.game_admins            enable row level security;
alter table public.game_notifications    enable row level security;

drop policy if exists "users read own or admin"      on public.game_users;
drop policy if exists "chicken types readable"       on public.game_chicken_types;
drop policy if exists "chickens read own or admin"   on public.game_user_chickens;
drop policy if exists "deposits read own or admin"   on public.game_deposits;
drop policy if exists "withdrawals read own or admin" on public.game_withdrawals;
drop policy if exists "settings readable"            on public.game_settings;
drop policy if exists "settings admin write"         on public.game_settings;
drop policy if exists "payment accounts readable"    on public.game_payment_accounts;
drop policy if exists "payment accounts admin write" on public.game_payment_accounts;
drop policy if exists "earnings read own or admin"   on public.game_referral_earnings;
drop policy if exists "admins read self"             on public.game_admins;
drop policy if exists "notifications read own or admin" on public.game_notifications;
drop policy if exists "notifications admin insert"     on public.game_notifications;

create policy "users read own or admin"       on public.game_users for select to authenticated
  using (user_id = auth.uid() or public.game_is_admin());
create policy "chicken types readable"        on public.game_chicken_types for select to anon, authenticated using (true);
create policy "chickens read own or admin"    on public.game_user_chickens for select to authenticated
  using (user_id = auth.uid() or public.game_is_admin());
create policy "deposits read own or admin"    on public.game_deposits for select to authenticated
  using (user_id = auth.uid() or public.game_is_admin());
create policy "withdrawals read own or admin" on public.game_withdrawals for select to authenticated
  using (user_id = auth.uid() or public.game_is_admin());
create policy "settings readable"             on public.game_settings for select to authenticated using (true);
create policy "settings admin write"          on public.game_settings for all to authenticated
  using (public.game_is_admin()) with check (public.game_is_admin());
create policy "payment accounts readable"    on public.game_payment_accounts for select to authenticated using (true);
create policy "payment accounts admin write" on public.game_payment_accounts for all to authenticated
  using (public.game_is_admin()) with check (public.game_is_admin());
create policy "earnings read own or admin"    on public.game_referral_earnings for select to authenticated
  using (referrer_id = auth.uid() or public.game_is_admin());
create policy "admins read self"              on public.game_admins for select to authenticated using (user_id = auth.uid());
create policy "notifications read own or admin" on public.game_notifications for select to authenticated
  using (user_id = auth.uid() or public.game_is_admin());
create policy "notifications admin insert" on public.game_notifications for insert to authenticated
  with check (public.game_is_admin());

-- No insert/update/delete policies on money tables: only the RPCs below can change them.

-- ------------------------------------------------------------ player RPCs
-- Called right after sign-up. Creates the game_users row with wallet_balance = 0.
create or replace function public.game_register(p_referred_by uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ref uuid;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  if p_referred_by is not null and p_referred_by <> uid
     and exists (select 1 from public.game_users where user_id = p_referred_by) then
    ref := p_referred_by;
  end if;
  insert into public.game_users (user_id, wallet_balance, referred_by)
  values (uid, 0, ref)
  on conflict (user_id) do nothing;
end $$;

-- Creates a pending deposit. The total is computed on the server.
create or replace function public.game_create_deposit(
  p_chicken_type_id integer, p_quantity integer,
  p_transaction_id text, p_sender_name text, p_screenshot_url text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.game_users; t public.game_chicken_types; new_id uuid;
begin
  u := public.game_lock_active_user(uid);
  select * into t from public.game_chicken_types where id = p_chicken_type_id;
  if not found then raise exception 'Unknown chicken type'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100000 then raise exception 'Invalid quantity'; end if;
  if coalesce(trim(p_transaction_id), '') = '' then raise exception 'Transaction ID is required'; end if;
  if coalesce(trim(p_sender_name), '') = '' then raise exception 'Sender name is required'; end if;
  begin
    insert into public.game_deposits (user_id, chicken_type_id, quantity, total_amount, transaction_id, sender_name, screenshot_url, status)
    values (uid, t.id, p_quantity, t.price * p_quantity, trim(p_transaction_id), trim(p_sender_name), p_screenshot_url, 'pending')
    returning id into new_id;
  exception when unique_violation then
    raise exception 'This Transaction ID was already submitted';
  end;
  return new_id;
end $$;

-- Collect one chicken's egg (needs 24h since last collection) into egg stock.
create or replace function public.game_collect_egg(p_chicken_id uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.game_users; c public.game_user_chickens; v numeric;
begin
  u := public.game_lock_active_user(uid);
  select * into c from public.game_user_chickens where id = p_chicken_id and user_id = uid for update;
  if not found then raise exception 'Chicken not found'; end if;
  if now() - c.last_collected_at < interval '24 hours' then raise exception 'This egg is not ready yet'; end if;
  select egg_value into v from public.game_chicken_types where id = c.chicken_type_id;
  update public.game_user_chickens set last_collected_at = now() where id = c.id;
  update public.game_users set egg_stock = egg_stock + v where user_id = uid;
  return v;
end $$;

-- Sell every collected egg: egg_stock -> wallet_balance.
create or replace function public.game_sell_eggs() returns numeric
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.game_users; amt numeric;
begin
  u := public.game_lock_active_user(uid);
  amt := u.egg_stock;
  if amt <= 0 then raise exception 'You have no eggs to sell'; end if;
  update public.game_users set wallet_balance = wallet_balance + amt, egg_stock = 0 where user_id = uid;
  return amt;
end $$;

-- Withdrawal: min 50, max 10000 per day (Pakistan time). Deducts IMMEDIATELY.
-- Backend-only rule: amount must be covered by direct + referral withdraw limits.
create or replace function public.game_request_withdrawal(
  p_amount numeric, p_method text, p_account_number text, p_account_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); u public.game_users; new_id uuid;
  day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Karachi')) at time zone 'Asia/Karachi';
  today_total numeric; take_direct numeric; take_ref numeric;
begin
  u := public.game_lock_active_user(uid);
  if p_amount is null or p_amount < 5 then raise exception 'Minimum withdrawal is 5 Rs'; end if;
  if p_amount > 10000 then raise exception 'Maximum withdrawal is 10,000 Rs per day'; end if;
  if coalesce(trim(p_account_number), '') = '' or coalesce(trim(p_account_name), '') = '' then
    raise exception 'Account name and number are required';
  end if;
  select coalesce(sum(amount), 0) into today_total from public.game_withdrawals
    where user_id = uid and status <> 'rejected' and created_at >= day_start;
  if today_total + p_amount > 10000 then raise exception 'Daily withdrawal limit of 10,000 Rs reached'; end if;
  if u.wallet_balance < p_amount then raise exception 'Insufficient wallet balance'; end if;
  if p_amount > u.direct_withdraw_limit + u.referral_withdraw_limit then
    raise exception 'Withdrawal is not available for this amount yet. Invest in more chickens to unlock withdrawals.';
  end if;
  take_direct := least(p_amount, u.direct_withdraw_limit);
  take_ref := p_amount - take_direct;
  update public.game_users set
    wallet_balance = wallet_balance - p_amount,
    direct_withdraw_limit = direct_withdraw_limit - take_direct,
    referral_withdraw_limit = referral_withdraw_limit - take_ref
  where user_id = uid;
  insert into public.game_withdrawals (user_id, amount, method, account_number, account_name, status, direct_limit_used, referral_limit_used)
  values (uid, p_amount, coalesce(nullif(p_method, ''), 'easypaisa'), trim(p_account_number), trim(p_account_name), 'pending', take_direct, take_ref)
  returning id into new_id;
  return new_id;
end $$;

-- ------------------------------------------------------------- admin RPCs
create or replace function public.game_admin_approve_deposit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.game_deposits; ref uuid; bonus numeric; chicken_price numeric;
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.game_deposits where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Deposit not found or already reviewed'; end if;
  -- 1. exact quantity of chickens
  insert into public.game_user_chickens (user_id, chicken_type_id, last_collected_at)
  select d.user_id, d.chicken_type_id, now() from generate_series(1, d.quantity);
  -- 2 + 3. total invested and 30% direct withdraw limit
  update public.game_users set
    total_invested = total_invested + d.total_amount,
    direct_withdraw_limit = direct_withdraw_limit + d.total_amount * 0.30
  where user_id = d.user_id returning referred_by into ref;
  -- 4. 50% referral reward to the referrer (withdraw limit) + log
  if ref is not null then
    select price into chicken_price from public.game_chicken_types where id = d.chicken_type_id;
    bonus := least(d.total_amount * 0.50, chicken_price * 2);
    update public.game_users set referral_withdraw_limit = referral_withdraw_limit + bonus where user_id = ref;
    insert into public.game_referral_earnings (referrer_id, referred_user_id, deposit_id, amount)
    values (ref, d.user_id, d.id, bonus);
  end if;
  update public.game_deposits set status = 'approved', reviewed_at = now() where id = d.id;
end $$;

create or replace function public.game_admin_reject_deposit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  update public.game_deposits set status = 'rejected', reviewed_at = now() where id = p_id and status = 'pending';
  if not found then raise exception 'Deposit not found or already reviewed'; end if;
end $$;

-- Approve: mark completed. Money was already deducted at request time -> nothing is added back.
create or replace function public.game_admin_approve_withdrawal(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  update public.game_withdrawals set status = 'completed', reviewed_at = now() where id = p_id and status = 'pending';
  if not found then raise exception 'Withdrawal not found or already reviewed'; end if;
end $$;

-- Public-safe trust feed: only completed withdrawals, recent three, with names masked.
create or replace function public.game_global_withdrawals()
returns table(masked_name text, amount numeric, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    case
      when length(trim(account_name)) <= 2 then left(trim(account_name), 1) || '***'
      else left(trim(account_name), 3) || '***' || right(trim(account_name), 1)
    end as masked_name,
    amount,
    created_at
  from public.game_withdrawals
  where status = 'completed'
  order by created_at desc
  limit 3;
$$;

-- Reject: REFUND the wallet (and restore the limits that were consumed), mark rejected.
create or replace function public.game_admin_reject_withdrawal(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare w public.game_withdrawals;
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  select * into w from public.game_withdrawals where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Withdrawal not found or already reviewed'; end if;
  update public.game_users set
    wallet_balance = wallet_balance + w.amount,
    direct_withdraw_limit = direct_withdraw_limit + w.direct_limit_used,
    referral_withdraw_limit = referral_withdraw_limit + w.referral_limit_used
  where user_id = w.user_id;
  update public.game_withdrawals set status = 'rejected', reviewed_at = now() where id = w.id;
end $$;

create or replace function public.game_admin_set_blocked(p_user uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  update public.game_users set is_blocked = p_blocked where user_id = p_user;
end $$;

-- Users list for the admin panel (joins the e-mail from Supabase Auth).
create or replace function public.game_admin_users() returns table (
  user_id uuid, email text, wallet_balance numeric, total_invested numeric,
  is_blocked boolean, chickens bigint, created_at timestamptz
)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.game_is_admin() then raise exception 'Admins only'; end if;
  return query
    select gu.user_id, au.email::text, gu.wallet_balance, gu.total_invested, gu.is_blocked,
           (select count(*) from public.game_user_chickens c where c.user_id = gu.user_id),
           gu.created_at
    from public.game_users gu left join auth.users au on au.id = gu.user_id
    order by gu.created_at desc;
end $$;

-- ----------------------------------------------------------- permissions
revoke all on function public.game_lock_active_user(uuid) from public, anon, authenticated;
revoke all on function public.game_register(uuid) from public, anon;
revoke all on function public.game_create_deposit(integer, integer, text, text, text) from public, anon;
revoke all on function public.game_collect_egg(uuid) from public, anon;
revoke all on function public.game_sell_eggs() from public, anon;
revoke all on function public.game_request_withdrawal(numeric, text, text, text) from public, anon;
revoke all on function public.game_admin_approve_deposit(uuid) from public, anon;
revoke all on function public.game_admin_reject_deposit(uuid) from public, anon;
revoke all on function public.game_admin_approve_withdrawal(uuid) from public, anon;
revoke all on function public.game_admin_reject_withdrawal(uuid) from public, anon;
revoke all on function public.game_admin_set_blocked(uuid, boolean) from public, anon;
revoke all on function public.game_admin_users() from public, anon;

grant execute on function public.game_is_admin() to authenticated;
grant execute on function public.game_register(uuid) to authenticated;
grant execute on function public.game_create_deposit(integer, integer, text, text, text) to authenticated;
grant execute on function public.game_collect_egg(uuid) to authenticated;
grant execute on function public.game_sell_eggs() to authenticated;
grant execute on function public.game_request_withdrawal(numeric, text, text, text) to authenticated;
grant execute on function public.game_admin_approve_deposit(uuid) to authenticated;
grant execute on function public.game_admin_reject_deposit(uuid) to authenticated;
grant execute on function public.game_admin_approve_withdrawal(uuid) to authenticated;
grant execute on function public.game_admin_reject_withdrawal(uuid) to authenticated;
grant execute on function public.game_admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.game_admin_users() to authenticated;
grant execute on function public.game_global_withdrawals() to authenticated;

-- --------------------------------------------- storage: payment screenshots
insert into storage.buckets (id, name, public) values ('game-media', 'game-media', false)
on conflict (id) do nothing;

drop policy if exists "screenshots upload own folder" on storage.objects;
drop policy if exists "screenshots read own or admin" on storage.objects;
create policy "screenshots upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'game-media' and (storage.foldername(name))[1] = 'deposits'
    and (storage.foldername(name))[2] = auth.uid()::text);
create policy "screenshots read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'game-media' and ((storage.foldername(name))[1] = 'deposits'
    and ((storage.foldername(name))[2] = auth.uid()::text or public.game_is_admin())));

-- ------------------------------------------------------ make yourself admin
-- Sign up in the app first, then run (replace the e-mail):
--   insert into public.game_admins (user_id) select id from auth.users where email = 'you@example.com';
