create extension if not exists pg_cron with schema pg_catalog;

alter table public.businesses
  add column if not exists auto_complete_bookings boolean not null default true,
  add column if not exists auto_complete_after_hours integer not null default 2;

alter table public.businesses
  drop constraint if exists businesses_auto_complete_after_hours_check;

alter table public.businesses
  add constraint businesses_auto_complete_after_hours_check
  check (auto_complete_after_hours between 0 and 168);

create or replace function public.auto_complete_due_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.bookings as booking
  set status = 'COMPLETED'::public.booking_status
  from public.slots as slot,
       public.businesses as business
  where booking.slot_id = slot.id
    and booking.business_id = business.id
    and booking.status = 'CONFIRMED'::public.booking_status
    and business.auto_complete_bookings = true
    and slot.end_at <= now() - make_interval(hours => business.auto_complete_after_hours);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.auto_complete_due_bookings() from public;
revoke all on function public.auto_complete_due_bookings() from anon;
revoke all on function public.auto_complete_due_bookings() from authenticated;
grant execute on function public.auto_complete_due_bookings() to service_role;

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
    '*/15 * * * *',
    'select public.auto_complete_due_bookings()'
  );
end;
$$;
