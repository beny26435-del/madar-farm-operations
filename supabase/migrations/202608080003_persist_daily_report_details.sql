begin;

alter table public.daily_reports
  add column start_time time,
  add column end_time time,
  add column actions_taken text,
  add column notes text;

commit;
