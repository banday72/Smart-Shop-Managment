-- File attachments for direct messages (Supabase Storage).
-- Run after 0014_direct_messages.sql.

alter table public.direct_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

alter table public.direct_messages alter column body drop not null;

alter table public.direct_messages drop constraint if exists direct_messages_body_length;
alter table public.direct_messages add constraint direct_messages_body_length
  check (
    (body is not null and char_length(btrim(body)) between 1 and 2000)
    or attachment_path is not null
  );

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

drop policy if exists "shop members can upload chat attachments" on storage.objects;
create policy "shop members can upload chat attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = public.user_shop_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "shop members can read chat attachments" on storage.objects;
create policy "shop members can read chat attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = public.user_shop_id()::text
);

notify pgrst, 'reload schema';
