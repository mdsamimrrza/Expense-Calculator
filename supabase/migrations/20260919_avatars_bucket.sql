-- Profile avatars: public bucket for user profile pictures.
-- Uploads/deletes go through server actions using the service role,
-- so no insert/delete policies are needed. Public read for rendering.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
