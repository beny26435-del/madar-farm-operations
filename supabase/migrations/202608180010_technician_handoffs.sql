begin;

create type public.technician_job_status as enum (
  'awaiting_handover',
  'with_technician',
  'awaiting_return',
  'returned'
);

create type public.technician_confirmation_type as enum ('handover', 'return');

create table public.technician_jobs (
  id uuid primary key default gen_random_uuid(),
  repair_item_id uuid not null references public.customer_repair_items(id) on delete restrict,
  technician_name text not null check (char_length(trim(technician_name)) between 2 and 120),
  item_name text not null check (char_length(trim(item_name)) between 2 and 200),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  quantity integer not null check (quantity between 1 and 999),
  status public.technician_job_status not null default 'awaiting_handover',
  created_by uuid not null references public.profiles(id) on delete restrict,
  handed_over_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (handed_over_at is null or handed_over_at >= created_at),
  check (returned_at is null or (handed_over_at is not null and returned_at >= handed_over_at))
);

create index technician_jobs_status_created_idx
  on public.technician_jobs(status, created_at desc);

create index technician_jobs_repair_item_idx
  on public.technician_jobs(repair_item_id, status);

create trigger technician_jobs_set_updated_at before update on public.technician_jobs
for each row execute function public.set_updated_at();

create table public.technician_job_confirmations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.technician_jobs(id) on delete cascade,
  type public.technician_confirmation_type not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (job_id, type),
  check (confirmed_at is null or confirmed_at >= created_at)
);

create index technician_job_confirmations_pending_idx
  on public.technician_job_confirmations(expires_at)
  where confirmed_at is null;

alter table public.technician_jobs enable row level security;
alter table public.technician_job_confirmations enable row level security;

create policy technician_jobs_select
on public.technician_jobs for select to authenticated
using (public.is_active_profile());

create policy technician_job_confirmations_select
on public.technician_job_confirmations for select to authenticated
using (public.is_active_profile());

grant select on public.technician_jobs, public.technician_job_confirmations to authenticated;
revoke all on public.technician_jobs, public.technician_job_confirmations from anon;

create function public.confirm_technician_handover(p_token_hash text)
returns table (
  result text,
  confirmation_type public.technician_confirmation_type,
  technician_job_id uuid,
  technician_name text,
  repair_item_name text,
  customer_name text,
  quantity integer,
  confirmation_time timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmation_record public.technician_job_confirmations%rowtype;
  job_record public.technician_jobs%rowtype;
  confirmed_time timestamptz := now();
begin
  select * into confirmation_record
  from public.technician_job_confirmations
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid', null::public.technician_confirmation_type, null::uuid, null::text, null::text, null::text, null::integer, null::timestamptz;
    return;
  end if;

  select * into job_record from public.technician_jobs where id = confirmation_record.job_id for update;

  if confirmation_record.confirmed_at is not null then
    return query select 'already_confirmed', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, confirmation_record.confirmed_at;
    return;
  end if;

  if confirmation_record.expires_at <= confirmed_time then
    return query select 'expired', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, null::timestamptz;
    return;
  end if;

  if confirmation_record.type = 'handover' and job_record.status <> 'awaiting_handover' then
    return query select 'invalid_state', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, null::timestamptz;
    return;
  end if;

  if confirmation_record.type = 'return' and job_record.status <> 'awaiting_return' then
    return query select 'invalid_state', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, null::timestamptz;
    return;
  end if;

  update public.technician_job_confirmations set confirmed_at = confirmed_time where id = confirmation_record.id;

  if confirmation_record.type = 'handover' then
    update public.technician_jobs
    set status = 'with_technician', handed_over_at = confirmed_time
    where id = job_record.id;
  else
    update public.technician_jobs
    set status = 'returned', returned_at = confirmed_time
    where id = job_record.id;
  end if;

  return query select 'confirmed', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, confirmed_time;
end;
$$;

revoke all on function public.confirm_technician_handover(text) from public, anon, authenticated;
grant execute on function public.confirm_technician_handover(text) to service_role;

commit;
