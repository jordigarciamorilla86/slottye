-- Keep the booking history ordering deterministic and ensure the column used
-- by the business/admin screens is represented in version control.

alter table public.bookings
  add column if not exists status_updated_at timestamptz;

update public.bookings
set status_updated_at = created_at
where status_updated_at is null;

alter table public.bookings
  alter column status_updated_at set default now(),
  alter column status_updated_at set not null;

create or replace function public.set_booking_status_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_set_status_updated_at on public.bookings;

create trigger bookings_set_status_updated_at
before update of status on public.bookings
for each row
execute function public.set_booking_status_updated_at();
