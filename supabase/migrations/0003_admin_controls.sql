-- Admin controls: owners can manage shop profiles and categories.
create or replace function public.is_shop_owner(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (
  select 1 from public.profiles
  where id = auth.uid() and shop_id = p_shop_id and role = 'owner'
) $$;

create policy "shop members can view team profiles" on public.profiles
for select using (shop_id = public.user_shop_id());

create policy "owners can manage shop profiles" on public.profiles
for update using (
  public.is_shop_owner(profiles.shop_id)
)
with check (
  public.is_shop_owner(profiles.shop_id)
  and role in ('owner', 'manager', 'cashier')
);

create policy "owners can insert shop profiles" on public.profiles
for insert with check (
  public.is_shop_owner(profiles.shop_id)
);
