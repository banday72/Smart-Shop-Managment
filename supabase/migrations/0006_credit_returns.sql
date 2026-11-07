-- Customer credit, payment tracking, and sales returns.
-- Run after 0005_hardening_and_public_store.sql.

alter table public.payments
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.sales
  add column if not exists amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0);

create table if not exists public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  reason text not null,
  total numeric(12,2) not null default 0 check (total >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.sales_returns(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

alter table public.sales_returns enable row level security;
alter table public.sales_return_items enable row level security;

create policy "members read sales returns" on public.sales_returns
for select to authenticated using (shop_id = public.user_shop_id());
create policy "members read sales return items" on public.sales_return_items
for select to authenticated using (
  exists (
    select 1 from public.sales_returns r
    where r.id = return_id and r.shop_id = public.user_shop_id()
  )
);

create or replace function public.complete_sale(
  p_invoice_number text,
  p_discount numeric,
  p_tax numeric,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_customer_id uuid,
  p_amount_paid numeric,
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
  if p_discount is null or p_discount < 0 or p_tax is null or p_tax < 0 then raise exception 'Invalid discount or tax'; end if;
  if p_amount_paid is null or p_amount_paid < 0 then raise exception 'Invalid amount paid'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Sale must contain at least one item'; end if;
  if p_payment_method = 'credit' and p_customer_id is null then raise exception 'Select a customer for credit sales'; end if;
  if p_customer_id is not null and not exists (select 1 from public.customers where id = p_customer_id and shop_id = v_shop_id) then raise exception 'Customer not found'; end if;
  if exists (select 1 from public.sales where shop_id = v_shop_id and invoice_number = p_invoice_number) then raise exception 'Duplicate invoice number'; end if;

  for v_item in
    select (entry->>'product_id')::uuid as product_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    select * into v_product from public.products
    where id = v_item.product_id and shop_id = v_shop_id and is_active = true
    for update;
    if not found then raise exception 'Product not found'; end if;
    v_quantity := v_item.quantity;
    if v_quantity <= 0 or v_product.current_stock < v_quantity then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_subtotal := v_subtotal + (v_quantity * v_product.selling_price);
    v_profit := v_profit + (v_quantity * (v_product.selling_price - v_product.purchase_price));
  end loop;

  v_total := v_subtotal - p_discount + p_tax;
  if p_amount_paid > v_total then raise exception 'Amount paid cannot exceed total'; end if;
  if p_payment_status = 'paid' and p_amount_paid <> v_total then raise exception 'Paid sales must include the full amount'; end if;

  insert into public.sales (
    shop_id, customer_id, invoice_number, subtotal, discount, tax, total, gross_profit,
    payment_method, payment_status, amount_paid, created_by
  )
  values (
    v_shop_id, p_customer_id, p_invoice_number, v_subtotal, p_discount, p_tax, v_total, v_profit,
    p_payment_method, p_payment_status, p_amount_paid, v_user_id
  )
  returning id into v_sale_id;

  if p_amount_paid > 0 then
    insert into public.payments (shop_id, sale_id, customer_id, amount, method, created_by)
    values (v_shop_id, v_sale_id, p_customer_id, p_amount_paid, p_payment_method, v_user_id);
  end if;

  for v_item in
    select (entry->>'product_id')::uuid as product_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    select * into v_product from public.products where id = v_item.product_id and shop_id = v_shop_id;
    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    values (v_sale_id, v_product.id, v_item.quantity, v_product.selling_price, v_product.purchase_price);
    update public.products set current_stock = current_stock - v_item.quantity, updated_at = now() where id = v_product.id;
    insert into public.inventory_movements (shop_id, product_id, movement_type, quantity, reference_id, reason, created_by)
    values (v_shop_id, v_product.id, 'sale', -v_item.quantity, v_sale_id, 'Customer sale ' || p_invoice_number, v_user_id);
  end loop;
  return v_sale_id;
end;
$$;

create or replace function public.record_customer_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_method public.payment_method,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_shop_id uuid := public.user_shop_id();
begin
  if v_shop_id is null or public.current_shop_role() not in ('owner', 'manager', 'cashier') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.customers where id = p_customer_id and shop_id = v_shop_id) then raise exception 'Customer not found'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  insert into public.payments (shop_id, customer_id, amount, method, created_by)
  values (v_shop_id, p_customer_id, p_amount, p_method, auth.uid())
  returning id into v_payment_id;
  return v_payment_id;
end;
$$;

create or replace function public.return_sale(
  p_sale_id uuid,
  p_items jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return_id uuid;
  v_sale public.sales%rowtype;
  v_item record;
  v_sale_item public.sale_items%rowtype;
  v_returned integer;
  v_shop_id uuid := public.user_shop_id();
begin
  if v_shop_id is null or public.current_shop_role() not in ('owner', 'manager') then raise exception 'Only owners and managers can process returns'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Return reason is required'; end if;
  select * into v_sale from public.sales where id = p_sale_id and shop_id = v_shop_id;
  if not found then raise exception 'Sale not found'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Select at least one item'; end if;

  insert into public.sales_returns (shop_id, sale_id, reason, created_by)
  values (v_shop_id, p_sale_id, trim(p_reason), auth.uid())
  returning id into v_return_id;

  for v_item in select (entry->>'product_id')::uuid as product_id, (entry->>'quantity')::integer as quantity from jsonb_array_elements(p_items) as entry loop
    select * into v_sale_item from public.sale_items where sale_id = p_sale_id and product_id = v_item.product_id;
    if not found or v_item.quantity <= 0 then raise exception 'Invalid return item'; end if;
    select coalesce(sum(ri.quantity), 0) into v_returned
    from public.sales_return_items ri
    join public.sales_returns r on r.id = ri.return_id
    where r.sale_id = p_sale_id and ri.product_id = v_item.product_id;
    if v_returned + v_item.quantity > v_sale_item.quantity then raise exception 'Return quantity exceeds sold quantity'; end if;
    insert into public.sales_return_items (return_id, product_id, quantity, unit_price)
    values (v_return_id, v_item.product_id, v_item.quantity, v_sale_item.unit_price);
    update public.products set current_stock = current_stock + v_item.quantity, updated_at = now()
    where id = v_item.product_id and shop_id = v_shop_id;
    insert into public.inventory_movements (shop_id, product_id, movement_type, quantity, reference_id, reason, created_by)
    values (v_shop_id, v_item.product_id, 'customer_return', v_item.quantity, v_return_id, trim(p_reason), auth.uid());
  end loop;

  update public.sales_returns set total = (select coalesce(sum(line_total), 0) from public.sales_return_items where return_id = v_return_id) where id = v_return_id;
  return v_return_id;
end;
$$;

drop function if exists public.complete_sale(text, numeric, numeric, public.payment_method, public.payment_status, jsonb);
revoke all on function public.complete_sale(text, numeric, numeric, public.payment_method, public.payment_status, uuid, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.complete_sale(text, numeric, numeric, public.payment_method, public.payment_status, uuid, numeric, jsonb) to authenticated;
revoke all on function public.record_customer_payment(uuid, numeric, public.payment_method, text) from public, anon, authenticated;
grant execute on function public.record_customer_payment(uuid, numeric, public.payment_method, text) to authenticated;
revoke all on function public.return_sale(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.return_sale(uuid, jsonb, text) to authenticated;
