-- Team chat messages for shop members (Supabase Realtime).
-- Run after 0012_audit_log_delete_fix.sql.

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint team_messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists team_messages_shop_created_idx
  on public.team_messages(shop_id, created_at desc);

alter table public.team_messages enable row level security;

drop policy if exists "shop members can read team messages" on public.team_messages;
create policy "shop members can read team messages"
on public.team_messages for select to authenticated
using (shop_id = public.user_shop_id());

drop policy if exists "shop members can send team messages" on public.team_messages;
create policy "shop members can send team messages"
on public.team_messages for insert to authenticated
with check (shop_id = public.user_shop_id() and sender_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.team_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
