begin;

create table public.daily_report_expenses (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 2 and 500),
  amount bigint not null check (amount > 0 and amount <= 999999999999),
  invoice_path text unique,
  invoice_original_name text,
  invoice_mime_type text,
  invoice_size_bytes bigint,
  created_at timestamptz not null default now(),
  check (
    (invoice_path is null and invoice_original_name is null and invoice_mime_type is null and invoice_size_bytes is null)
    or
    (invoice_path is not null and invoice_original_name is not null and invoice_mime_type is not null and invoice_size_bytes between 1 and 8388608)
  )
);

create index daily_report_expenses_report_idx
  on public.daily_report_expenses(daily_report_id, created_at);

alter table public.daily_report_expenses enable row level security;

create policy daily_report_expenses_select on public.daily_report_expenses for select to authenticated
using (public.can_access_daily_report(daily_report_id));

create policy daily_report_expenses_insert on public.daily_report_expenses for insert to authenticated
with check (public.can_access_daily_report(daily_report_id));

create policy daily_report_expenses_delete on public.daily_report_expenses for delete to authenticated
using (public.can_access_daily_report(daily_report_id));

grant select, insert, delete on public.daily_report_expenses to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-invoices',
  'report-invoices',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
