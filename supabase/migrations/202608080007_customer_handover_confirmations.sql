begin;

create type public.customer_confirmation_type as enum ('intake', 'delivery');

create table public.customer_handover_confirmations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.customer_repair_items(id) on delete cascade,
  type public.customer_confirmation_type not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (item_id, type),
  check (confirmed_at is null or confirmed_at >= created_at)
);

create index customer_handover_confirmations_pending_idx
  on public.customer_handover_confirmations(expires_at)
  where confirmed_at is null;

alter table public.customer_handover_confirmations enable row level security;

create policy customer_handover_confirmations_select
on public.customer_handover_confirmations for select to authenticated
using (public.is_manager_or_admin());

grant select on public.customer_handover_confirmations to authenticated;
revoke all on public.customer_handover_confirmations from anon;

create or replace function public.confirm_customer_handover(p_token_hash text)
returns table (
  result text,
  confirmation_type public.customer_confirmation_type,
  repair_item_id uuid,
  customer_name text,
  repair_item_name text,
  confirmation_time timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmation_record public.customer_handover_confirmations%rowtype;
  item_record public.customer_repair_items%rowtype;
  name_record text;
  confirmed_time timestamptz := now();
begin
  select * into confirmation_record
  from public.customer_handover_confirmations
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid', null::public.customer_confirmation_type, null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  select * into item_record from public.customer_repair_items where id = confirmation_record.item_id;
  select full_name into name_record from public.customers where id = item_record.customer_id;

  if confirmation_record.confirmed_at is not null then
    return query select 'already_confirmed', confirmation_record.type, item_record.id, name_record, item_record.item_name, confirmation_record.confirmed_at;
    return;
  end if;

  if confirmation_record.expires_at <= confirmed_time then
    return query select 'expired', confirmation_record.type, item_record.id, name_record, item_record.item_name, null::timestamptz;
    return;
  end if;

  update public.customer_handover_confirmations
  set confirmed_at = confirmed_time
  where id = confirmation_record.id;

  if confirmation_record.type = 'delivery' then
    update public.customer_repair_items
    set status = 'delivered', delivered_at = confirmed_time
    where id = item_record.id and status = 'received';
  end if;

  return query select 'confirmed', confirmation_record.type, item_record.id, name_record, item_record.item_name, confirmed_time;
end;
$$;

revoke all on function public.confirm_customer_handover(text) from public, anon, authenticated;
grant execute on function public.confirm_customer_handover(text) to service_role;

commit;
