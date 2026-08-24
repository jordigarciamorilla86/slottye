do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'slottye-auto-complete-bookings';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'slottye-auto-complete-bookings',
    '0 3 * * *',
    'select public.auto_complete_due_bookings()'
  );
end;
$$;
