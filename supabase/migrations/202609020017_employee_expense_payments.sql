begin;

alter table public.employee_expenses
  add column paid_at timestamptz,
  add column paid_by uuid references public.profiles(id) on delete restrict,
  add constraint employee_expenses_payment_state_check check (
    (paid_at is null and paid_by is null)
    or (paid_at is not null and paid_by is not null)
  );

create index employee_expenses_unpaid_idx
  on public.employee_expenses(employee_id, expense_date desc, created_at desc)
  where paid_at is null;

create policy employee_expenses_update_admin
on public.employee_expenses for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

grant update on public.employee_expenses to authenticated;

commit;
