-- Run once in Supabase SQL Editor as a database owner.
-- The game-media bucket should already exist; this is idempotent if it does not.

insert into storage.buckets (id, name, public)
values ('game-media', 'game-media', false)
on conflict (id) do nothing;

drop policy if exists "screenshots upload own folder" on storage.objects;
drop policy if exists "screenshots read own or admin" on storage.objects;

create policy "screenshots upload own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'game-media'
    and (storage.foldername(name))[1] = 'deposits'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "screenshots read own or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'game-media'
    and (storage.foldername(name))[1] = 'deposits'
    and ((storage.foldername(name))[2] = auth.uid()::text or public.game_is_admin())
  );
