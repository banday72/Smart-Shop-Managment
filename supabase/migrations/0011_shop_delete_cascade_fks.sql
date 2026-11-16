-- Fix FK constraints so deleting a shop (cascading to products) doesn't fail.
-- Run after 0010_delete_shop.sql.

alter table if exists public.sale_items drop constraint if exists sale_items_product_id_fkey;
alter table if exists public.sale_items add constraint sale_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

alter table if exists public.purchase_items drop constraint if exists purchase_items_product_id_fkey;
alter table if exists public.purchase_items add constraint purchase_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

alter table if exists public.sales_return_items drop constraint if exists sales_return_items_product_id_fkey;
alter table if exists public.sales_return_items add constraint sales_return_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

alter table if exists public.online_order_items drop constraint if exists online_order_items_product_id_fkey;
alter table if exists public.online_order_items add constraint online_order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;