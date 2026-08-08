begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.app_role as enum ('admin', 'manager', 'employee');
create type public.employee_status as enum ('active', 'inactive');
create type public.shift_type as enum ('morning', 'evening', 'night');
create type public.report_status as enum ('draft', 'submitted', 'approved', 'rejected', 'revision_requested');
create type public.maintenance_work_status as enum ('completed', 'pending', 'needs_follow_up');
create type public.attachment_kind as enum ('image', 'video', 'audio', 'document');
create type public.review_action as enum ('approved', 'rejected', 'revision_requested');
create type public.report_type as enum ('daily', 'maintenance');
create type public.notification_type as enum ('report_submitted', 'review_completed', 'revision_requested', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  role public.app_role not null default 'employee',
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  personnel_code text not null unique check (char_length(trim(personnel_code)) between 2 and 32),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  mobile text unique,
  status public.employee_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  report_date date not null,
  shift public.shift_type not null,
  work_summary text not null default '',
  issues text,
  next_shift_notes text,
  status public.report_status not null default 'draft',
  submitted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or char_length(trim(work_summary)) > 0),
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);

create unique index daily_reports_employee_date_shift_live_key
  on public.daily_reports(employee_id, report_date, shift)
  where deleted_at is null;
create index daily_reports_status_date_idx on public.daily_reports(status, report_date desc) where deleted_at is null;

create table public.maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_employee_id uuid not null references public.employees(id) on delete restrict,
  report_date date not null,
  location text not null default '',
  title text not null default '',
  description text not null default '',
  work_status public.maintenance_work_status not null default 'pending',
  technician_employee_id uuid references public.employees(id) on delete restrict,
  technician_name text,
  status public.report_status not null default 'draft',
  submitted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (technician_employee_id is not null and nullif(trim(technician_name), '') is not null)),
  check (
    status = 'draft' or (
      char_length(trim(location)) > 0 and
      char_length(trim(title)) > 0 and
      char_length(trim(description)) > 0 and
      num_nonnulls(technician_employee_id, nullif(trim(technician_name), '')) = 1
    )
  ),
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);

create index maintenance_reports_status_date_idx on public.maintenance_reports(status, report_date desc) where deleted_at is null;

create table public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid references public.daily_reports(id) on delete cascade,
  maintenance_report_id uuid references public.maintenance_reports(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  kind public.attachment_kind not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (num_nonnulls(daily_report_id, maintenance_report_id) = 1)
);

create table public.report_reviews (
  id uuid primary key default gen_random_uuid(),
  report_type public.report_type not null,
  report_id uuid not null,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  action public.review_action not null,
  comment text,
  created_at timestamptz not null default now(),
  check (action = 'approved' or nullif(trim(comment), '') is not null)
);

create index report_reviews_report_idx on public.report_reviews(report_type, report_id, created_at desc);

create table public.report_revisions (
  id uuid primary key default gen_random_uuid(),
  report_type public.report_type not null,
  report_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (report_type, report_id, revision_number)
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs(created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx on public.notifications(recipient_id, created_at desc) where read_at is null;

create table public.system_settings (
  id smallint primary key default 1 check (id = 1),
  farm_name text not null default 'مدار عملیات',
  timezone text not null default 'Asia/Tehran',
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id) values (1);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger daily_reports_set_updated_at before update on public.daily_reports for each row execute function public.set_updated_at();
create trigger maintenance_reports_set_updated_at before update on public.maintenance_reports for each row execute function public.set_updated_at();
create trigger system_settings_set_updated_at before update on public.system_settings for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, new.phone, new.id::text), '@', 1)),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true
$$;

create function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.employees e
  where e.profile_id = auth.uid() and e.status = 'active'
$$;

create function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('admin', 'manager'), false)
$$;

create function public.can_access_daily_report(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.daily_reports r
    where r.id = target_id and r.deleted_at is null
      and (public.is_manager_or_admin() or r.employee_id = public.current_employee_id())
  )
$$;

create function public.can_access_maintenance_report(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.maintenance_reports r
    where r.id = target_id and r.deleted_at is null
      and (public.is_manager_or_admin() or r.reporter_employee_id = public.current_employee_id())
  )
$$;

create function public.validate_review_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.report_type = 'daily' and not exists (select 1 from public.daily_reports where id = new.report_id and deleted_at is null) then
    raise exception 'Daily report not found';
  elsif new.report_type = 'maintenance' and not exists (select 1 from public.maintenance_reports where id = new.report_id and deleted_at is null) then
    raise exception 'Maintenance report not found';
  end if;
  return new;
end;
$$;

create trigger report_reviews_validate_target before insert or update on public.report_reviews for each row execute function public.validate_review_target();

create function public.capture_report_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type public.report_type;
  next_revision integer;
begin
  if old.status <> 'revision_requested' or auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'daily_reports' then
    target_type := 'daily';
  else
    target_type := 'maintenance';
  end if;

  select coalesce(max(revision_number), 0) + 1 into next_revision
  from public.report_revisions
  where report_type = target_type and report_id = old.id;

  insert into public.report_revisions (report_type, report_id, revision_number, snapshot, created_by)
  values (target_type, old.id, next_revision, to_jsonb(old), auth.uid());
  return new;
end;
$$;

create trigger daily_reports_capture_revision before update on public.daily_reports for each row execute function public.capture_report_revision();
create trigger maintenance_reports_capture_revision before update on public.maintenance_reports for each row execute function public.capture_report_revision();

create function public.prevent_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Report revisions are immutable';
end;
$$;

create trigger report_revisions_immutable before update or delete on public.report_revisions for each row execute function public.prevent_revision_mutation();

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.daily_reports enable row level security;
alter table public.maintenance_reports enable row level security;
alter table public.report_attachments enable row level security;
alter table public.report_reviews enable row level security;
alter table public.report_revisions enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.system_settings enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_manager_or_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated
with check (public.current_app_role() = 'admin');
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy employees_select on public.employees for select to authenticated
using (profile_id = auth.uid() or public.is_manager_or_admin());
create policy employees_admin_insert on public.employees for insert to authenticated
with check (public.current_app_role() = 'admin');
create policy employees_admin_update on public.employees for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy daily_reports_select on public.daily_reports for select to authenticated
using (deleted_at is null and (employee_id = public.current_employee_id() or public.is_manager_or_admin()));
create policy daily_reports_insert on public.daily_reports for insert to authenticated
with check (employee_id = public.current_employee_id() or public.current_app_role() = 'admin');
create policy daily_reports_employee_update on public.daily_reports for update to authenticated
using (employee_id = public.current_employee_id() and status in ('draft', 'revision_requested'))
with check (employee_id = public.current_employee_id() and status in ('draft', 'submitted'));
create policy daily_reports_admin_update on public.daily_reports for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy maintenance_reports_select on public.maintenance_reports for select to authenticated
using (deleted_at is null and (reporter_employee_id = public.current_employee_id() or public.is_manager_or_admin()));
create policy maintenance_reports_insert on public.maintenance_reports for insert to authenticated
with check (reporter_employee_id = public.current_employee_id() or public.current_app_role() = 'admin');
create policy maintenance_reports_employee_update on public.maintenance_reports for update to authenticated
using (reporter_employee_id = public.current_employee_id() and status in ('draft', 'revision_requested'))
with check (reporter_employee_id = public.current_employee_id() and status in ('draft', 'submitted'));
create policy maintenance_reports_admin_update on public.maintenance_reports for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy attachments_select on public.report_attachments for select to authenticated
using (
  (daily_report_id is not null and public.can_access_daily_report(daily_report_id)) or
  (maintenance_report_id is not null and public.can_access_maintenance_report(maintenance_report_id))
);
create policy attachments_insert on public.report_attachments for insert to authenticated
with check (
  uploaded_by = auth.uid() and (
    (daily_report_id is not null and public.can_access_daily_report(daily_report_id)) or
    (maintenance_report_id is not null and public.can_access_maintenance_report(maintenance_report_id))
  )
);
create policy attachments_delete on public.report_attachments for delete to authenticated
using (uploaded_by = auth.uid() or public.current_app_role() = 'admin');

create policy reviews_select on public.report_reviews for select to authenticated
using (
  (report_type = 'daily' and public.can_access_daily_report(report_id)) or
  (report_type = 'maintenance' and public.can_access_maintenance_report(report_id))
);
create policy reviews_insert on public.report_reviews for insert to authenticated
with check (reviewer_id = auth.uid() and public.is_manager_or_admin());

create policy revisions_select on public.report_revisions for select to authenticated
using (
  (report_type = 'daily' and public.can_access_daily_report(report_id)) or
  (report_type = 'maintenance' and public.can_access_maintenance_report(report_id))
);
create policy activity_logs_select on public.activity_logs for select to authenticated
using (public.is_manager_or_admin());

create policy notifications_select on public.notifications for select to authenticated
using (recipient_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy system_settings_select on public.system_settings for select to authenticated using (true);
create policy system_settings_admin_update on public.system_settings for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles, public.employees, public.daily_reports, public.maintenance_reports to authenticated;
grant select, insert, delete on public.report_attachments to authenticated;
grant select, insert on public.report_reviews to authenticated;
grant select on public.report_revisions to authenticated;
grant select on public.activity_logs to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, update on public.system_settings to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.is_manager_or_admin() to authenticated;
grant execute on function public.can_access_daily_report(uuid) to authenticated;
grant execute on function public.can_access_maintenance_report(uuid) to authenticated;

commit;
