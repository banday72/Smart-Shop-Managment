-- Make audit logging resilient during shop deletion cascades.
-- Run after 0011_shop_delete_cascade_fks.sql.

-- Allow audit rows to survive shop deletion if needed.
alter table if exists public.audit_logs alter column shop_id drop not null;
alter table if exists public.audit_logs drop constraint if exists audit_logs_shop_id_fkey;
alter table if exists public.audit_logs add constraint audit_logs_shop_id_fkey
  foreign key (shop_id) references public.shops(id) on delete set null;

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
  if TG_OP = 'DELETE' and TG_TABLE_NAME = 'shops' then
    return OLD;
  end if;
  if row_shop_id is null then
    return case when TG_OP = 'DELETE' then OLD else NEW end;
  end if;
  if TG_OP = 'DELETE' and not exists (select 1 from public.shops where id = row_shop_id) then
    return OLD;
  end if;

  begin
    insert into public.audit_logs (shop_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      row_shop_id,
      auth.uid(),
      lower(TG_OP),
      TG_TABLE_NAME,
      row_id,
      jsonb_build_object('old', old_row, 'new', new_row)
    );
  exception when foreign_key_violation then
    null;
  end;

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

revoke all on function public.record_audit_log() from public, anon, authenticated;