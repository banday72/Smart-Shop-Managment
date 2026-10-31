-- Security hardening, role-aware RLS, safe server-side pricing, and public storefront reads.
-- Run after 0004_team_access_requests.sql.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_shop_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and shop_id = public.user_shop_id()
$$;

-- ---------------------------------------------------------------------------
-- Role-aware RLS: reads for all shop members, writes for the right roles.
-- ---------------------------------------------------------------------------

drop policy if exists "categories shop access" on public.categories;
drop policy if exists "suppliers shop access" on public.suppliers;
drop policy if exists "customers shop access" on public.customers;
drop policy if exists "products shop access" on public.products;
drop policy if exists "sales shop access" on public.sales;
drop policy if exists "purchases shop access" on public.purchases;
drop policy if exists "inventory_movements shop access" on public.inventory_movements;
drop policy if exists "expenses shop access" on public.expenses;
drop policy if exists "sale items follow sale access" on public.sale_items;
drop policy if exists "purchase items follow purchase access" on public.purchase_items;
drop policy if exists "shop settings access" on public.shop_settings;
drop policy if exists "stock adjustments access" on public.stock_adjustments;
drop policy if exists "payments access" on public.payments;

-- Catalog: everyone can read, owners/managers can change.
create policy "members read categories" on public.categories
for select to authenticated using (shop_id = public.user_shop_id());
create policy "admins write categories" on public.categories
for all to authenticated
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));

create policy "members read suppliers" on public.suppliers
for select to authenticated using (shop_id = public.user_shop_id());
create policy "admins write suppliers" on public.suppliers
for all to authenticated
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));

create policy "members read products" on public.products
for select to authenticated using (shop_id = public.user_shop_id());
create policy "admins write products" on public.products
for all to authenticated
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));

-- Customers are created by cashiers at the point of sale.
create policy "members read customers" on public.customers
for select to authenticated using (shop_id = public.user_shop_id());
create policy "members create customers" on public.customers
for insert to authenticated with check (shop_id = public.user_shop_id());
create policy "members update customers" on public.customers
for update to authenticated
using (shop_id = public.user_shop_id())
with check (shop_id = public.user_shop_id());
create policy "admins delete customers" on public.customers
for delete to authenticated using (public.is_shop_admin(shop_id));

-- Sales are read-only to clients; complete_sale() is the only write path.
create policy "members read sales" on public.sales
for select to authenticated using (shop_id = public.user_shop_id());
create policy "members read sale items" on public.sale_items
for select to authenticated using (
  exists (
    select 1 from public.sales s
    where s.id = sale_id and s.shop_id = public.user_shop_id()
  )
);

-- Purchases are managed by admins; receive_purchase() is the stock-in path.
create policy "members read purchases" on public.purchases
for select to authenticated using (shop_id = public.user_shop_id());
create policy "admins write purchases" on public.purchases
for all to authenticated
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));
create policy "members read purchase items" on public.purchase_items
for select to authenticated using (
  exists (
    select 1 from public.purchases p
    where p.id = purchase_id and p.shop_id = public.user_shop_id()
  )
);
create policy "admins write purchase items" on public.purchase_items
for all to authenticated
using (
  exists (
    select 1 from public.purchases p
    where p.id = purchase_id and public.is_shop_admin(p.shop_id)
  )
)
with check (
  exists (
    select 1 from public.purchases p
    where p.id = purchase_id and public.is_shop_admin(p.shop_id)
  )
);

create policy "members read inventory movements" on public.inventory_movements
for select to authenticated using (shop_id = public.user_shop_id());

create policy "members read expenses" on public.expenses
for select to authenticated using (shop_id = public.user_shop_id());
create policy "admins write expenses" on public.expenses
for all to authenticated
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));

create policy "members read stock adjustments" on public.stock_adjustments
for select to authenticated using (shop_id = public.user_shop_id());

create policy "members read payments" on public.payments
for select to authenticated using (shop_id = public.user_shop_id());
create policy "admins write payments" on public.payments
for all to authenticated
using (public.is_shop_admin(shop_id))
with check (public.is_shop_admin(shop_id));

-- Settings: readable by the team, writable by the owner only.
create policy "members read shop settings" on public.shop_settings
for select to authenticated using (shop_id = public.user_shop_id());
create policy "owners manage shop settings" on public.shop_settings
for all to authenticated
using (public.is_shop_owner(shop_id))
with check (public.is_shop_owner(shop_id));

-- Shops: team can read, owner can update.
create policy "owners update shop" on public.shops
for update to authenticated
using (public.is_shop_owner(id))
with check (public.is_shop_owner(id));

-- Profiles: owners may change any role; managers may only change non-owner rows.
drop policy if exists "owners can manage shop profiles" on public.profiles;
drop policy if exists "shop admins can insert shop profiles" on public.profiles;

create policy "owners manage shop profiles" on public.profiles
for update to authenticated
using (public.is_shop_owner(shop_id))
with check (public.is_shop_owner(shop_id) and shop_id = public.user_shop_id());

create policy "managers manage non-owner profiles" on public.profiles
for update to authenticated
using (public.is_shop_admin(shop_id) and role in ('manager', 'cashier'))
with check (
  public.is_shop_admin(shop_id)
  and role in ('manager', 'cashier')
  and shop_id = public.user_shop_id()
);

-- Access reviews happen through approve_team_request()/reject_team_request().
drop policy if exists "shop admins can review access requests" on public.team_access_requests;

-- ---------------------------------------------------------------------------
-- Public storefront: expose only safe product columns to anonymous visitors.
-- ---------------------------------------------------------------------------

revoke select on public.products from anon;
grant select (id, name, sku, selling_price, current_stock, brand) on public.products to anon;

drop policy if exists "public can view active products" on public.products;
create policy "public can view active products" on public.products
for select to anon using (is_active = true and current_stock > 0);

-- ---------------------------------------------------------------------------
-- Atomic, server-priced sale
-- ---------------------------------------------------------------------------

drop function if exists public.complete_sale(text, numeric, numeric, numeric, public.payment_method, public.payment_status, jsonb);

create or replace function public.complete_sale(
  p_invoice_number text,
  p_discount numeric,
  p_tax numeric,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_shop_id uuid := public.user_shop_id();
  v_user_id uuid := auth.uid();
  v_role public.user_role := public.current_shop_role();
  v_item record;
  v_product public.products%rowtype;
  v_quantity integer;
  v_subtotal numeric := 0;
  v_total numeric;
  v_profit numeric := 0;
begin
  if v_shop_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
  if v_role not in ('owner', 'manager', 'cashier') then raise exception 'Not allowed'; end if;
  if p_discount is null or p_discount < 0 then raise exception 'Invalid discount'; end if;
  if p_tax is null or p_tax < 0 then raise exception 'Invalid tax'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale must contain at least one item';
  end if;
  if exists (select 1 from public.sales where shop_id = v_shop_id and invoice_number = p_invoice_number) then
    raise exception 'Duplicate invoice number';
  end if;

  -- Aggregate duplicate lines, lock products in a stable order, and price them server-side.
  for v_item in
    select (entry->>'product_id')::uuid as product_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id and shop_id = v_shop_id and is_active = true
    for update;
    if not found then raise exception 'Product not found'; end if;
    v_quantity := v_item.quantity;
    if v_quantity <= 0 then raise exception 'Invalid quantity'; end if;
    if v_product.current_stock < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
    v_subtotal := v_subtotal + (v_quantity * v_product.selling_price);
    v_profit := v_profit + (v_quantity * (v_product.selling_price - v_product.purchase_price));
  end loop;

  if p_discount > v_subtotal then raise exception 'Discount cannot exceed subtotal'; end if;
  v_total := v_subtotal - p_discount + p_tax;

  insert into public.sales (
    shop_id, invoice_number, subtotal, discount, tax, total, gross_profit,
    payment_method, payment_status, created_by
  )
  values (
    v_shop_id, p_invoice_number, v_subtotal, p_discount, p_tax, v_total, v_profit,
    p_payment_method, p_payment_status, v_user_id
  )
  returning id into v_sale_id;

  for v_item in
    select (entry->>'product_id')::uuid as product_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    select * into v_product from public.products where id = v_item.product_id;
    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    values (v_sale_id, v_product.id, v_item.quantity, v_product.selling_price, v_product.purchase_price);

    update public.products
    set current_stock = current_stock - v_item.quantity, updated_at = now()
    where id = v_product.id;

    insert into public.inventory_movements (
      shop_id, product_id, movement_type, quantity, reference_id, reason, created_by
    )
    values (
      v_shop_id, v_product.id, 'sale', -v_item.quantity, v_sale_id,
      'Customer sale ' || p_invoice_number, v_user_id
    );
  end loop;

  return v_sale_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hardened stock-in and adjustment functions
-- ---------------------------------------------------------------------------

create or replace function public.receive_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_item public.purchase_items%rowtype;
  v_shop_id uuid := public.user_shop_id();
  v_role public.user_role := public.current_shop_role();
  v_updated integer;
begin
  if v_shop_id is null then raise exception 'Unauthorized'; end if;
  if v_role not in ('owner', 'manager') then raise exception 'Not allowed'; end if;

  select * into v_purchase from public.purchases
  where id = p_purchase_id and shop_id = v_shop_id
  for update;
  if not found then raise exception 'Purchase not found'; end if;
  if v_purchase.status <> 'pending' then raise exception 'Purchase has already been processed'; end if;

  for v_item in select * from public.purchase_items where purchase_id = p_purchase_id loop
    update public.products
    set current_stock = current_stock + v_item.quantity,
        purchase_price = v_item.unit_cost,
        updated_at = now()
    where id = v_item.product_id and shop_id = v_shop_id;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'Product not found for this shop'; end if;

    insert into public.inventory_movements (
      shop_id, product_id, movement_type, quantity, reference_id, reason, created_by
    )
    values (
      v_shop_id, v_item.product_id, 'purchase_received', v_item.quantity,
      p_purchase_id, 'Received purchase', auth.uid()
    );
  end loop;

  update public.purchases
  set status = 'received', received_at = now()
  where id = p_purchase_id;
end;
$$;

create or replace function public.adjust_stock(p_product_id uuid, p_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_shop_id uuid := public.user_shop_id();
  v_role public.user_role := public.current_shop_role();
begin
  if v_shop_id is null then raise exception 'Unauthorized'; end if;
  if v_role not in ('owner', 'manager') then raise exception 'Not allowed'; end if;
  if p_quantity = 0 or length(trim(p_reason)) < 3 then raise exception 'Invalid stock adjustment'; end if;

  select * into v_product from public.products
  where id = p_product_id and shop_id = v_shop_id
  for update;
  if not found then raise exception 'Product not found'; end if;
  if v_product.current_stock + p_quantity < 0 then raise exception 'Stock cannot become negative'; end if;

  update public.products
  set current_stock = current_stock + p_quantity, updated_at = now()
  where id = p_product_id;

  insert into public.stock_adjustments (shop_id, product_id, quantity, reason, created_by)
  values (v_shop_id, p_product_id, p_quantity, p_reason, auth.uid());

  insert into public.inventory_movements (
    shop_id, product_id, movement_type, quantity, reference_id, reason, created_by
  )
  values (v_shop_id, p_product_id, 'adjustment', p_quantity, null, p_reason, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Transactional team access review
-- ---------------------------------------------------------------------------

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
  v_existing public.profiles%rowtype;
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

  select * into v_existing from public.profiles where id = v_request.user_id;
  if found and v_existing.shop_id <> v_shop_id then
    raise exception 'This user already belongs to another shop';
  end if;

  insert into public.profiles (id, shop_id, full_name, role)
  values (
    v_request.user_id,
    v_shop_id,
    coalesce(nullif(v_request.full_name, ''), 'Team member'),
    p_role
  )
  on conflict (id) do update
    set shop_id = excluded.shop_id,
        full_name = excluded.full_name,
        role = excluded.role;

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

-- ---------------------------------------------------------------------------
-- Grants: only signed-in users can call the sensitive functions.
-- ---------------------------------------------------------------------------

revoke all on function public.complete_sale(text, numeric, numeric, public.payment_method, public.payment_status, jsonb) from public, anon, authenticated;
grant execute on function public.complete_sale(text, numeric, numeric, public.payment_method, public.payment_status, jsonb) to authenticated;

revoke all on function public.receive_purchase(uuid) from public, anon, authenticated;
grant execute on function public.receive_purchase(uuid) to authenticated;

revoke all on function public.adjust_stock(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;

revoke all on function public.approve_team_request(uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.approve_team_request(uuid, public.user_role) to authenticated;

revoke all on function public.reject_team_request(uuid) from public, anon, authenticated;
grant execute on function public.reject_team_request(uuid) to authenticated;
