-- Immutable shop activity history for sensitive business changes.
-- Run after 0006_credit_returns.sql.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_shop_created_idx
  on public.audit_logs(shop_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy "managers can read audit logs" on public.audit_logs
for select to authenticated
using (
  shop_id = public.user_shop_id()
  and public.current_shop_role() in ('owner', 'manager')
);

create or replace function public.record_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb := case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end;
  new_row jsonb := case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end;
  row_data jsonb := coalesce(new_row, old_row);
  row_shop_id uuid := nullif(row_data->>'shop_id', '')::uuid;
  row_id uuid := nullif(row_data->>'id', '')::uuid;
begin
  if row_shop_id is null then
    return case when TG_OP = 'DELETE' then OLD else NEW end;
  end if;

  insert into public.audit_logs (shop_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    row_shop_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    row_id,
    jsonb_build_object('old', old_row, 'new', new_row)
  );

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

revoke all on function public.record_audit_log() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'shops',
    'profiles',
    'categories',
    'suppliers',
    'customers',
    'products',
    'sales',
    'purchases',
    'inventory_movements',
    'expenses',
    'shop_settings',
    'stock_adjustments',
    'payments',
    'sales_returns'
  ] loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'audit_' || table_name,
      table_name
    );
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.record_audit_log()',
      'audit_' || table_name,
      table_name
    );
  end loop;
end $$;
