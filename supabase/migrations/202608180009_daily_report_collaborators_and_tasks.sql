begin;

update public.profiles
set role = 'admin', updated_at = now()
where display_name = 'میلاد' and is_active = true;

alter table public.daily_reports
  add column location text not null default ''
  check (char_length(trim(location)) <= 200);

create table public.daily_report_collaborators (
  daily_report_id uuid not null references public.daily_reports(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (daily_report_id, employee_id)
);

create index daily_report_collaborators_employee_idx
  on public.daily_report_collaborators(employee_id, created_at desc);

create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 300),
  task_date date not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  completed_by uuid references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (completed_at is null and completed_by is null)
    or (completed_at is not null and completed_by is not null)
  )
);

create index daily_tasks_date_status_idx
  on public.daily_tasks(task_date desc, completed_at, created_at);

create or replace function public.is_active_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  )
$$;

create or replace function public.can_access_daily_report(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.daily_reports r
    where r.id = target_id and r.deleted_at is null
      and (
        public.current_app_role() = 'admin'
        or r.employee_id = public.current_employee_id()
      )
  )
$$;

drop policy if exists daily_reports_select on public.daily_reports;
create policy daily_reports_select on public.daily_reports for select to authenticated
using (
  deleted_at is null
  and (
    employee_id = public.current_employee_id()
    or public.current_app_role() = 'admin'
  )
);

drop policy if exists reviews_insert on public.report_reviews;
create policy reviews_insert on public.report_reviews for insert to authenticated
with check (reviewer_id = auth.uid() and public.current_app_role() = 'admin');

alter table public.daily_report_collaborators enable row level security;
alter table public.daily_tasks enable row level security;

create policy daily_report_collaborators_select
on public.daily_report_collaborators for select to authenticated
using (public.can_access_daily_report(daily_report_id));

create policy daily_tasks_select
on public.daily_tasks for select to authenticated
using (public.is_active_profile());

revoke all on public.daily_report_collaborators, public.daily_tasks from anon;
grant select on public.daily_report_collaborators, public.daily_tasks to authenticated;
grant execute on function public.is_active_profile() to authenticated;

commit;
