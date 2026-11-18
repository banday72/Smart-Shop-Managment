-- Direct messages between shop members (1-to-1), Supabase Realtime.
-- Run after 0013_team_messages.sql.

drop policy if exists "shop members can read shop memberships" on public.shop_members;
create policy "shop members can read shop memberships"
on public.shop_members for select to authenticated
using (shop_id = public.user_shop_id());

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint direct_messages_body_length check (char_length(btrim(body)) between 1 and 2000),
  constraint direct_messages_not_self check (sender_id <> recipient_id)
);

create index if not exists direct_messages_shop_created_idx on public.direct_messages(shop_id, created_at desc);
create index if not exists direct_messages_pair_idx on public.direct_messages(shop_id, sender_id, recipient_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists "participants can read direct messages" on public.direct_messages;
create policy "participants can read direct messages"
on public.direct_messages for select to authenticated
using (
  shop_id = public.user_shop_id()
  and (sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "members can send direct messages" on public.direct_messages;
create policy "members can send direct messages"
on public.direct_messages for insert to authenticated
with check (
  shop_id = public.user_shop_id()
  and sender_id = auth.uid()
  and recipient_id <> auth.uid()
  and exists (
    select 1 from public.shop_members m
    where m.shop_id = direct_messages.shop_id and m.user_id = direct_messages.recipient_id
  )
);

do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
