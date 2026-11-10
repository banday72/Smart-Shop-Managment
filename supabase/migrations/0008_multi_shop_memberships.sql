-- Multi-shop memberships and secure active-shop selection.
-- Run after 0007_audit_logs.sql.

create table if not exists public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'cashier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, user_id)
);

insert into public.shop_members (shop_id, user_id, full_name, role)
select shop_id, id, full_name, role
from public.profiles
on conflict (shop_id, user_id) do update
set full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

alter table public.shop_members enable row level security;

create or replace function public.user_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select nullif(auth.jwt()->'user_metadata'->>'active_shop_id', '')::uuid as shop_id
  )
  select coalesce(
    (
      select member.shop_id
      from public.shop_members member, requested
      where member.user_id = auth.uid() and member.shop_id = requested.shop_id
    ),
    (
      select member.shop_id
      from public.shop_members member
      where member.user_id = auth.uid()
      order by member.created_at
      limit 1
    ),
    (
      select profile.shop_id
      from public.profiles profile
      where profile.id = auth.uid()
    )
  )
$$;

create or replace function public.current_shop_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select member.role
  from public.shop_members member
  where member.user_id = auth.uid()
    and member.shop_id = public.user_shop_id()
$$;

create or replace function public.is_shop_owner(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_members
    where user_id = auth.uid() and shop_id = p_shop_id and role = 'owner'
  )
$$;

create or replace function public.is_shop_admin(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_members
    where user_id = auth.uid()
      and shop_id = p_shop_id
      and role in ('owner', 'manager')
  )
$$;

create policy "members can read own memberships"
on public.shop_members for select to authenticated
using (user_id = auth.uid());

create policy "shop admins can read memberships"
on public.shop_members for select to authenticated
using (public.is_shop_admin(shop_id));

drop policy if exists "shop members can access shop" on public.shops;
create policy "shop members can access shops"
on public.shops for select to authenticated
using (
  exists (
    select 1 from public.shop_members member
    where member.shop_id = shops.id and member.user_id = auth.uid()
  )
);

create policy "owners manage memberships"
on public.shop_members for update to authenticated
using (public.is_shop_owner(shop_id))
with check (public.is_shop_owner(shop_id) and role in ('owner', 'manager', 'cashier'));

create or replace function public.create_shop(
  p_name text,
  p_address text default null,
  p_phone text default null,
  p_currency text default 'PKR',
  p_full_name text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Shop name is required'; end if;
  if length(trim(coalesce(p_currency, ''))) <> 3 then raise exception 'Currency must be 3 characters'; end if;

  insert into public.shops (name, address, phone, currency)
  values (trim(p_name), nullif(trim(p_address), ''), nullif(trim(p_phone), ''), upper(trim(p_currency)))
  returning id into v_shop_id;

  insert into public.shop_members (shop_id, user_id, full_name, role)
  values (v_shop_id, auth.uid(), trim(coalesce(p_full_name, '')), 'owner');

  insert into public.shop_settings (shop_id)
  values (v_shop_id);

  return v_shop_id;
end;
$$;

revoke all on function public.create_shop(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_shop(text, text, text, text, text) to authenticated;

create or replace function public.approve_team_request(
  p_request_id uuid,
  p_role public.user_role default 'cashier'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.team_access_requests%rowtype;
  v_shop_id uuid := public.user_shop_id();
  v_role public.user_role := public.current_shop_role();
begin
  if v_shop_id is null then raise exception 'Unauthorized'; end if;
  if v_role not in ('owner', 'manager') then raise exception 'Not allowed'; end if;
  if p_role not in ('manager', 'cashier') then raise exception 'Invalid role'; end if;

  select * into v_request from public.team_access_requests
  where id = p_request_id and shop_id = v_shop_id and status = 'pending'
  for update;
  if not found then raise exception 'Request not found'; end if;

  insert into public.shop_members (shop_id, user_id, full_name, role)
  values (v_shop_id, v_request.user_id, coalesce(nullif(v_request.full_name, ''), 'Team member'), p_role)
  on conflict (shop_id, user_id) do update
    set full_name = excluded.full_name, role = excluded.role, updated_at = now();

  update public.team_access_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  return v_request.user_id;
end;
$$;

create or replace function public.reject_team_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid := public.user_shop_id();
  v_role public.user_role := public.current_shop_role();
begin
  if v_shop_id is null then raise exception 'Unauthorized'; end if;
  if v_role not in ('owner', 'manager') then raise exception 'Not allowed'; end if;

  update public.team_access_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id and shop_id = v_shop_id and status = 'pending';

  if not found then raise exception 'Request not found'; end if;
end;
$$;

revoke all on function public.approve_team_request(uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.approve_team_request(uuid, public.user_role) to authenticated;
revoke all on function public.reject_team_request(uuid) from public, anon, authenticated;
grant execute on function public.reject_team_request(uuid) to authenticated;

drop trigger if exists audit_shop_members on public.shop_members;
create trigger audit_shop_members
after insert or update or delete on public.shop_members
for each row execute function public.record_audit_log();
