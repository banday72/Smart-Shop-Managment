create table public.shop_settings (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  locale text not null default 'en',
  allow_negative_stock boolean not null default false,
  payment_methods public.payment_method[] not null default array['cash','card','bank_transfer','credit','other']::public.payment_method[],
  updated_at timestamptz not null default now()
);

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity <> 0),
  reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

alter table public.shop_settings enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.payments enable row level security;
create policy "shop settings access" on public.shop_settings for all using (shop_id = public.user_shop_id()) with check (shop_id = public.user_shop_id());
create policy "stock adjustments access" on public.stock_adjustments for all using (shop_id = public.user_shop_id()) with check (shop_id = public.user_shop_id());
create policy "payments access" on public.payments for all using (shop_id = public.user_shop_id()) with check (shop_id = public.user_shop_id());

create or replace function public.adjust_stock(p_product_id uuid, p_quantity integer, p_reason text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_product public.products%rowtype; v_shop_id uuid := public.user_shop_id();
begin
  if p_quantity = 0 or length(trim(p_reason)) < 3 then raise exception 'Invalid stock adjustment'; end if;
  select * into v_product from public.products where id = p_product_id and shop_id = v_shop_id for update;
  if not found then raise exception 'Product not found'; end if;
  if v_product.current_stock + p_quantity < 0 then raise exception 'Stock cannot become negative'; end if;
  update public.products set current_stock = current_stock + p_quantity, updated_at = now() where id = p_product_id;
  insert into public.stock_adjustments(shop_id, product_id, quantity, reason, created_by) values (v_shop_id, p_product_id, p_quantity, p_reason, auth.uid());
  insert into public.inventory_movements(shop_id, product_id, movement_type, quantity, reference_id, reason, created_by)
  values (v_shop_id, p_product_id, 'adjustment', p_quantity, null, p_reason, auth.uid());
end;
$$;
