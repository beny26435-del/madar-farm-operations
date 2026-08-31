alter type public.technician_job_status add value if not exists 'awaiting_rework';
alter type public.technician_confirmation_type add value if not exists 'rework';
