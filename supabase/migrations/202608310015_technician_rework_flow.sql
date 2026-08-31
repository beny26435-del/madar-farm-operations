begin;

alter table public.technician_jobs
add column rework_count integer not null default 0 check (rework_count >= 0),
add column last_reworked_at timestamptz,
add column promised_return_at timestamptz;

alter table public.technician_job_confirmations
drop constraint if exists technician_job_confirmations_job_id_type_key;

create unique index technician_job_confirmations_one_pending_idx
on public.technician_job_confirmations(job_id, type)
where confirmed_at is null;

drop function if exists public.confirm_technician_handover(text);

create function public.confirm_technician_handover(p_token_hash text, p_promised_return_at timestamptz default null)
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

  if confirmation_record.type = 'rework' and job_record.status <> 'awaiting_rework' then
    return query select 'invalid_state', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, null::timestamptz;
    return;
  end if;

  if confirmation_record.type in ('handover', 'rework')
     and (p_promised_return_at is null or p_promised_return_at <= confirmed_time) then
    return query select 'invalid_promised_return', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, null::timestamptz;
    return;
  end if;

  update public.technician_job_confirmations set confirmed_at = confirmed_time where id = confirmation_record.id;

  if confirmation_record.type = 'handover' then
    update public.technician_jobs
    set status = 'with_technician', handed_over_at = confirmed_time, promised_return_at = p_promised_return_at
    where id = job_record.id;
  elsif confirmation_record.type = 'return' then
    update public.technician_jobs
    set status = 'returned', returned_at = confirmed_time
    where id = job_record.id;
  else
    update public.technician_jobs
    set status = 'with_technician', handed_over_at = confirmed_time, returned_at = null,
        promised_return_at = p_promised_return_at,
        rework_count = rework_count + 1, last_reworked_at = confirmed_time
    where id = job_record.id;
  end if;

  return query select 'confirmed', confirmation_record.type, job_record.id, job_record.technician_name, job_record.item_name, job_record.customer_name, job_record.quantity, confirmed_time;
end;
$$;

revoke all on function public.confirm_technician_handover(text, timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_technician_handover(text, timestamptz) to service_role;

commit;
