begin;

drop policy if exists technician_jobs_select on public.technician_jobs;
create policy technician_jobs_select
on public.technician_jobs for select to authenticated
using (
  public.is_active_profile()
  and (created_by = auth.uid() or public.current_app_role() = 'admin')
);

drop policy if exists technician_job_confirmations_select on public.technician_job_confirmations;
create policy technician_job_confirmations_select
on public.technician_job_confirmations for select to authenticated
using (
  public.is_active_profile()
  and (
    created_by = auth.uid()
    or public.current_app_role() = 'admin'
    or exists (
      select 1
      from public.technician_jobs job
      where job.id = technician_job_confirmations.job_id
        and job.created_by = auth.uid()
    )
  )
);

commit;
