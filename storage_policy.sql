-- Create a bucket named 'avatars' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Safely create policies (drop first to avoid errors on retry)
-- Note: We do NOT try to enable RLS on storage.objects as it requires superuser. 
-- It is usually enabled by default.

drop policy if exists "Public Avatars" on storage.objects;
create policy "Public Avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Authenticated Users Can Upload Avatars" on storage.objects;
create policy "Authenticated Users Can Upload Avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

drop policy if exists "Users Can Update Own Avatar" on storage.objects;
create policy "Users Can Update Own Avatar"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner )
  with check ( bucket_id = 'avatars' and auth.uid() = owner );

drop policy if exists "Users Can Delete Own Avatar" on storage.objects;
create policy "Users Can Delete Own Avatar"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid() = owner );
