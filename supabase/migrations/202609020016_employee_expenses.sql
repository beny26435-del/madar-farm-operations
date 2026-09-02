begin;

create table public.employee_expenses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  expense_date date not null,
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

create index employee_expenses_employee_date_idx
  on public.employee_expenses(employee_id, expense_date desc, created_at desc);

alter table public.employee_expenses enable row level security;

create policy employee_expenses_select
on public.employee_expenses for select to authenticated
using (
  public.current_app_role() = 'admin'
  or exists (
    select 1 from public.employees
    where employees.id = employee_expenses.employee_id
      and employees.profile_id = auth.uid()
  )
);

create policy employee_expenses_insert
on public.employee_expenses for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.employees
    where employees.id = employee_expenses.employee_id
      and employees.profile_id = auth.uid()
      and employees.status = 'active'
  )
);

grant select, insert on public.employee_expenses to authenticated;
revoke all on public.employee_expenses from anon;

commit;
