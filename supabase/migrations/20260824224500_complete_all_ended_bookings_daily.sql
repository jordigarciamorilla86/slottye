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
    and slot.end_at <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.auto_complete_due_bookings() from public;
revoke all on function public.auto_complete_due_bookings() from anon;
revoke all on function public.auto_complete_due_bookings() from authenticated;
grant execute on function public.auto_complete_due_bookings() to service_role;
