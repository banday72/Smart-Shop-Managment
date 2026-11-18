-- Read receipts for direct messages (unread badge/popup support).
-- Run after 0015_direct_message_attachments.sql.

alter table public.direct_messages
  add column if not exists read_at timestamptz;

create index if not exists direct_messages_unread_idx
  on public.direct_messages (shop_id, recipient_id, read_at);

drop policy if exists "recipients can mark direct messages read" on public.direct_messages;
create policy "recipients can mark direct messages read"
on public.direct_messages for update to authenticated
using (shop_id = public.user_shop_id() and recipient_id = auth.uid())
with check (shop_id = public.user_shop_id() and recipient_id = auth.uid());

notify pgrst, 'reload schema';
