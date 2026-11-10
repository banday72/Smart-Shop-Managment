-- Public online orders with staff confirmation.
-- Run after 0008_multi_shop_memberships.sql.

create table if not exists public.online_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_number text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  sale_id uuid references public.sales(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, order_number)
);

create table if not exists public.online_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.online_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

create index if not exists online_orders_shop_created_idx
  on public.online_orders(shop_id, created_at desc);

alter table public.online_orders enable row level security;
alter table public.online_order_items enable row level security;

create policy "members read online orders"
on public.online_orders for select to authenticated
using (shop_id = public.user_shop_id());

create policy "members read online order items"
on public.online_order_items for select to authenticated
using (
  exists (
    select 1 from public.online_orders online_order
    where online_order.id = order_id
      and online_order.shop_id = public.user_shop_id()
  )
);

create or replace function public.create_online_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'WEB-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 10));
  v_item record;
  v_product public.products%rowtype;
  v_subtotal numeric := 0;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then raise exception 'Customer name is required'; end if;
  if length(trim(coalesce(p_customer_phone, ''))) < 5 then raise exception 'Customer phone is required'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one product';
  end if;
  if not exists (select 1 from public.shops where id = p_shop_id) then raise exception 'Shop not found'; end if;

  for v_item in
    select (entry->>'product_id')::uuid as product_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id
      and shop_id = p_shop_id
      and is_active = true
    for update;
    if not found then raise exception 'Product not found'; end if;
    if v_item.quantity <= 0 or v_product.current_stock < v_item.quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
    v_subtotal := v_subtotal + (v_item.quantity * v_product.selling_price);
  end loop;

  insert into public.online_orders (
    id, shop_id, order_number, customer_name, customer_phone, customer_address, subtotal
  )
  values (
    v_order_id,
    p_shop_id,
    v_order_number,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    v_subtotal
  );

  for v_item in
    select (entry->>'product_id')::uuid as product_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    select * into v_product from public.products
    where id = v_item.product_id and shop_id = p_shop_id;
    insert into public.online_order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product.id, v_product.name, v_item.quantity, v_product.selling_price);
  end loop;

  return v_order_number;
end;
$$;

create or replace function public.confirm_online_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.online_orders%rowtype;
  v_items jsonb;
  v_sale_id uuid;
begin
  if public.current_shop_role() not in ('owner', 'manager', 'cashier') then raise exception 'Not allowed'; end if;

  select * into v_order
  from public.online_orders
  where id = p_order_id and shop_id = public.user_shop_id() and status = 'pending'
  for update;
  if not found then raise exception 'Pending order not found'; end if;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity))
  into v_items
  from public.online_order_items
  where order_id = p_order_id;

  v_sale_id := public.complete_sale(
    v_order.order_number,
    0,
    0,
    'cash',
    'unpaid',
    null,
    0,
    v_items
  );

  update public.online_orders
  set status = 'confirmed', sale_id = v_sale_id, updated_at = now()
  where id = p_order_id;
  return v_sale_id;
end;
$$;

create or replace function public.cancel_online_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_shop_role() not in ('owner', 'manager', 'cashier') then raise exception 'Not allowed'; end if;
  update public.online_orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id and shop_id = public.user_shop_id() and status = 'pending';
  if not found then raise exception 'Pending order not found'; end if;
end;
$$;

create or replace function public.fulfill_online_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_shop_role() not in ('owner', 'manager', 'cashier') then raise exception 'Not allowed'; end if;
  update public.online_orders
  set status = 'fulfilled', updated_at = now()
  where id = p_order_id and shop_id = public.user_shop_id() and status = 'confirmed';
  if not found then raise exception 'Confirmed order not found'; end if;
end;
$$;

revoke all on function public.create_online_order(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_online_order(uuid, text, text, text, jsonb) to anon, authenticated;
revoke all on function public.confirm_online_order(uuid) from public, anon, authenticated;
grant execute on function public.confirm_online_order(uuid) to authenticated;
revoke all on function public.cancel_online_order(uuid) from public, anon, authenticated;
grant execute on function public.cancel_online_order(uuid) to authenticated;
revoke all on function public.fulfill_online_order(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_online_order(uuid) to authenticated;

drop trigger if exists audit_online_orders on public.online_orders;
create trigger audit_online_orders
after insert or update or delete on public.online_orders
for each row execute function public.record_audit_log();
