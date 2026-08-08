begin;

alter table public.employees
  add column email extensions.citext;

update public.employees as employee
set email = auth_user.email
from auth.users as auth_user
where auth_user.id = employee.profile_id;

alter table public.employees
  alter column email set not null,
  add constraint employees_email_key unique (email),
  drop column personnel_code,
  drop column mobile;

drop index if exists public.daily_reports_employee_date_shift_live_key;

alter table public.daily_reports
  drop column shift,
  drop column next_shift_notes;

create unique index daily_reports_employee_date_live_key
  on public.daily_reports(employee_id, report_date)
  where deleted_at is null;

drop type public.shift_type;

commit;
