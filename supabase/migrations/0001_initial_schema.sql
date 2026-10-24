create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'manager', 'cashier');
create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'credit', 'other');
create type public.payment_status as enum ('paid', 'partial', 'unpaid');
create type public.purchase_status as enum ('pending', 'received', 'cancelled');
create type public.inventory_movement_type as enum ('opening', 'purchase_received', 'sale', 'customer_return', 'supplier_return', 'damage', 'adjustment');

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  logo_url text,
  currency text not null default 'PKR',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'cashier',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(shop_id, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  credit_limit numeric(12,2) not null default 0 check (credit_limit >= 0),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  sku text not null,
  barcode text,
  brand text,
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_stock integer not null default 5 check (minimum_stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, sku)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  tax numeric(12,2) not null default 0 check (tax >= 0),
  total numeric(12,2) not null check (total >= 0),
  gross_profit numeric(12,2) not null default 0,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'paid',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(shop_id, invoice_number)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  status public.purchase_status not null default 'pending',
  total numeric(12,2) not null default 0 check (total >= 0),
  purchased_at date not null default current_date,
  received_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_cost) stored
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type public.inventory_movement_type not null,
  quantity integer not null check (quantity <> 0),
  reference_id uuid,
  reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  description text,
  payment_method public.payment_method not null default 'cash',
  attachment_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index products_shop_name_idx on public.products(shop_id, name);
create index products_shop_barcode_idx on public.products(shop_id, barcode);
create index sales_shop_created_idx on public.sales(shop_id, created_at desc);
create index inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);

create or replace function public.user_shop_id()
returns uuid language sql stable security definer set search_path = public
as $$ select shop_id from public.profiles where id = auth.uid() $$;

alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.expenses enable row level security;

create policy "shop members can access shop" on public.shops for select using (id = public.user_shop_id());
create policy "users can access own profile" on public.profiles for select using (id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','suppliers','customers','products','sales','purchases','inventory_movements','expenses'] loop
    execute format('create policy "%s shop access" on public.%I for all using (shop_id = public.user_shop_id()) with check (shop_id = public.user_shop_id())', table_name, table_name);
  end loop;
end $$;

create policy "sale items follow sale access" on public.sale_items for all
using (exists (select 1 from public.sales s where s.id = sale_id and s.shop_id = public.user_shop_id()))
with check (exists (select 1 from public.sales s where s.id = sale_id and s.shop_id = public.user_shop_id()));
create policy "purchase items follow purchase access" on public.purchase_items for all
using (exists (select 1 from public.purchases p where p.id = purchase_id and p.shop_id = public.user_shop_id()))
with check (exists (select 1 from public.purchases p where p.id = purchase_id and p.shop_id = public.user_shop_id()));

create or replace function public.complete_sale(
  p_invoice_number text,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_shop_id uuid := public.user_shop_id();
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_total numeric := p_subtotal - p_discount + p_tax;
  v_profit numeric := 0;
begin
  if v_shop_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
  if exists (select 1 from public.sales where shop_id = v_shop_id and invoice_number = p_invoice_number) then
    raise exception 'Duplicate invoice number';
  end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Sale must contain at least one item'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and shop_id = v_shop_id and is_active = true for update;
    if not found then raise exception 'Product not found'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity <= 0 or v_product.current_stock < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
    v_profit := v_profit + (v_quantity * ((v_item->>'unit_price')::numeric - v_product.purchase_price));
  end loop;

  insert into public.sales (shop_id, invoice_number, subtotal, discount, tax, total, gross_profit, payment_method, payment_status, created_by)
  values (v_shop_id, p_invoice_number, p_subtotal, p_discount, p_tax, v_total, v_profit, p_payment_method, p_payment_status, v_user_id)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and shop_id = v_shop_id for update;
    v_quantity := (v_item->>'quantity')::integer;
    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    values (v_sale_id, v_product.id, v_quantity, (v_item->>'unit_price')::numeric, v_product.purchase_price);
    update public.products set current_stock = current_stock - v_quantity, updated_at = now() where id = v_product.id;
    insert into public.inventory_movements (shop_id, product_id, movement_type, quantity, reference_id, reason, created_by)
    values (v_shop_id, v_product.id, 'sale', -v_quantity, v_sale_id, 'Customer sale ' || p_invoice_number, v_user_id);
  end loop;
  return v_sale_id;
end;
$$;

create or replace function public.receive_purchase(p_purchase_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_item public.purchase_items%rowtype;
  v_shop_id uuid := public.user_shop_id();
begin
  select * into v_purchase from public.purchases where id = p_purchase_id and shop_id = v_shop_id for update;
  if not found then raise exception 'Purchase not found'; end if;
  if v_purchase.status <> 'pending' then raise exception 'Purchase has already been processed'; end if;
  for v_item in select * from public.purchase_items where purchase_id = p_purchase_id loop
    update public.products set current_stock = current_stock + v_item.quantity, purchase_price = v_item.unit_cost, updated_at = now()
    where id = v_item.product_id and shop_id = v_shop_id;
    insert into public.inventory_movements (shop_id, product_id, movement_type, quantity, reference_id, reason, created_by)
    values (v_shop_id, v_item.product_id, 'purchase_received', v_item.quantity, p_purchase_id, 'Received purchase', auth.uid());
  end loop;
  update public.purchases set status = 'received', received_at = now() where id = p_purchase_id;
end;
$$;
