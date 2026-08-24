/*
 * Permite valorar exclusivamente una reserva completada por el propio usuario.
 * La aplicación ya enviaba el INSERT, pero la base remota no concedía INSERT
 * ni tenía una policy para esta operación, por lo que RLS lo rechazaba.
 */

grant insert on table public.reviews to authenticated;

drop policy if exists "reviews_user_insert_eligible" on public.reviews;

create policy "reviews_user_insert_eligible"
on public.reviews
as permissive
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bookings booking
    where booking.id = reviews.booking_id
      and booking.user_id = auth.uid()
      and booking.business_id = reviews.business_id
      and booking.status = 'COMPLETED'::public.booking_status
  )
);
