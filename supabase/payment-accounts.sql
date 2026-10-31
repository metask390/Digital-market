-- Run this after supabase/schema.sql if the base schema is already installed.
-- Admins can add any active Pakistani wallet or bank account; users see only active rows.
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
create index if not exists game_payment_accounts_active_idx
  on public.game_payment_accounts(active, sort_order, created_at);

alter table public.game_payment_accounts enable row level security;
drop policy if exists "payment accounts readable" on public.game_payment_accounts;
drop policy if exists "payment accounts admin write" on public.game_payment_accounts;
create policy "payment accounts readable" on public.game_payment_accounts
  for select to authenticated using (true);
create policy "payment accounts admin write" on public.game_payment_accounts
  for all to authenticated
  using (public.game_is_admin()) with check (public.game_is_admin());
