-- Allow a shop owner to permanently delete a shop (and cascaded data).
-- Run after 0009_online_orders.sql.

create or replace function public.delete_shop(p_shop_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_shop_id uuid;
  v_shop_count integer;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if not public.is_shop_owner(p_shop_id) then raise exception 'Only the shop owner can delete this shop'; end if;

  select count(*) into v_shop_count
  from public.shop_members
  where user_id = auth.uid();
  if v_shop_count <= 1 then raise exception 'You cannot delete your only shop'; end if;

  select shop_id into v_next_shop_id
  from public.shop_members
  where user_id = auth.uid() and shop_id <> p_shop_id
  order by created_at
  limit 1;

  delete from public.shops where id = p_shop_id;
  return v_next_shop_id;
end;
$$;

revoke all on function public.delete_shop(uuid) from public, anon, authenticated;
grant execute on function public.delete_shop(uuid) to authenticated;