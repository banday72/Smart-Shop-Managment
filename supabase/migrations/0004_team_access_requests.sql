-- Team access requests: owners and managers can approve pending members.
create table if not exists public.team_access_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  requested_role public.user_role not null default 'cashier',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(shop_id, user_id)
);

alter table public.team_access_requests enable row level security;

create or replace function public.is_shop_admin(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and shop_id = p_shop_id
      and role in ('owner', 'manager')
  )
$$;

create policy "users can create own access request"
on public.team_access_requests
for insert
with check (user_id = auth.uid() and status = 'pending');

create policy "requesters can view own access request"
on public.team_access_requests
for select
using (user_id = auth.uid() or public.is_shop_admin(shop_id));

create policy "shop admins can review access requests"
on public.team_access_requests
for update
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));

drop policy if exists "owners can insert shop profiles" on public.profiles;
create policy "shop admins can insert shop profiles"
on public.profiles
for insert
with check (
  public.is_shop_admin(profiles.shop_id)
  and role in ('manager', 'cashier')
);

drop policy if exists "owners can manage shop profiles" on public.profiles;
create policy "owners can manage shop profiles"
on public.profiles
for update
using (public.is_shop_owner(profiles.shop_id) or public.is_shop_admin(profiles.shop_id))
with check (
  public.is_shop_owner(profiles.shop_id)
  or (public.is_shop_admin(profiles.shop_id) and role in ('manager', 'cashier'))
);
