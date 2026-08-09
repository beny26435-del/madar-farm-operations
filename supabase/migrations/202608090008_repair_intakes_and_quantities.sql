begin;

create table public.customer_repair_intakes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index customer_repair_intakes_customer_date_idx
  on public.customer_repair_intakes(customer_id, received_at desc);

alter table public.customer_repair_items
  add column intake_id uuid references public.customer_repair_intakes(id) on delete cascade,
  add column quantity integer not null default 1 check (quantity between 1 and 999);

create index customer_repair_items_intake_idx
  on public.customer_repair_items(intake_id)
  where intake_id is not null;

alter table public.customer_handover_confirmations
  add column intake_id uuid references public.customer_repair_intakes(id) on delete cascade,
  alter column item_id drop not null,
  drop constraint if exists customer_handover_confirmations_item_id_type_key;

alter table public.customer_handover_confirmations
  add constraint customer_handover_confirmation_target_check
  check (num_nonnulls(item_id, intake_id) = 1),
  add constraint customer_handover_intake_type_check
  check (intake_id is null or type = 'intake');

create unique index customer_handover_confirmation_item_type_key
  on public.customer_handover_confirmations(item_id, type)
  where item_id is not null;

create unique index customer_handover_confirmation_intake_type_key
  on public.customer_handover_confirmations(intake_id, type)
  where intake_id is not null;

alter table public.customer_repair_intakes enable row level security;

create policy customer_repair_intakes_select
on public.customer_repair_intakes for select to authenticated
using (public.is_manager_or_admin() or created_by = auth.uid());

grant select on public.customer_repair_intakes to authenticated;
revoke all on public.customer_repair_intakes from anon;

drop function public.confirm_customer_handover(text);

create function public.confirm_customer_handover(p_token_hash text)
returns table (
  result text,
  confirmation_type public.customer_confirmation_type,
  repair_item_id uuid,
  repair_intake_id uuid,
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
  intake_record public.customer_repair_intakes%rowtype;
  name_record text;
  confirmed_time timestamptz := now();
begin
  select * into confirmation_record
  from public.customer_handover_confirmations
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid', null::public.customer_confirmation_type, null::uuid, null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  if confirmation_record.item_id is not null then
    select * into item_record from public.customer_repair_items where id = confirmation_record.item_id;
    select full_name into name_record from public.customers where id = item_record.customer_id;
  else
    select * into intake_record from public.customer_repair_intakes where id = confirmation_record.intake_id;
    select full_name into name_record from public.customers where id = intake_record.customer_id;
  end if;

  if confirmation_record.confirmed_at is not null then
    return query select 'already_confirmed', confirmation_record.type, item_record.id, intake_record.id, name_record, item_record.item_name, confirmation_record.confirmed_at;
    return;
  end if;

  if confirmation_record.expires_at <= confirmed_time then
    return query select 'expired', confirmation_record.type, item_record.id, intake_record.id, name_record, item_record.item_name, null::timestamptz;
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

  return query select 'confirmed', confirmation_record.type, item_record.id, intake_record.id, name_record, item_record.item_name, confirmed_time;
end;
$$;

revoke all on function public.confirm_customer_handover(text) from public, anon, authenticated;
grant execute on function public.confirm_customer_handover(text) to service_role;

commit;
