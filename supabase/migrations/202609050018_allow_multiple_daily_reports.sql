begin;

drop index if exists public.daily_reports_employee_date_live_key;

create index if not exists daily_reports_employee_date_idx
  on public.daily_reports(employee_id, report_date desc, submitted_at desc)
  where deleted_at is null;

commit;
