begin;

create index if not exists activity_logs_entity_idx
  on public.activity_logs(entity_type, entity_id, created_at desc);

insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
select
  e.profile_id,
  'daily_report.submitted',
  'daily_report',
  r.id,
  jsonb_build_object(
    'summary', left(r.work_summary, 180),
    'report_date', r.report_date
  ),
  coalesce(r.submitted_at, r.created_at)
from public.daily_reports r
join public.employees e on e.id = r.employee_id
where r.deleted_at is null
  and e.profile_id is not null
  and not exists (
    select 1 from public.activity_logs a
    where a.entity_type = 'daily_report'
      and a.entity_id = r.id
      and a.action = 'daily_report.submitted'
  );

commit;
