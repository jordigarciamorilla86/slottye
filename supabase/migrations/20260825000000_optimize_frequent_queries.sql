-- Indexes for the filters and sort orders used by the main customer,
-- business and administration screens. `if not exists` keeps this migration
-- safe to re-run in local/staging environments.

create index if not exists bookings_user_status_created_idx
  on public.bookings (user_id, status, created_at desc);

create index if not exists bookings_business_status_created_idx
  on public.bookings (business_id, status, created_at desc);

-- Supports slot RLS checks for customers, including cancelled/completed
-- bookings that are not covered by bookings_one_confirmed_per_slot.
create index if not exists bookings_slot_user_idx
  on public.bookings (slot_id, user_id);

create index if not exists notifications_status_type_created_idx
  on public.notifications (status, type, created_at desc);

-- Notification routes check whether a notification already exists for a
-- booking/type/status before inserting or sending it.
create index if not exists notifications_booking_type_status_idx
  on public.notifications (booking_id, type, status)
  where booking_id is not null;

create index if not exists business_images_business_position_idx
  on public.business_images (business_id, position, created_at);

create index if not exists reviews_visible_business_created_idx
  on public.reviews (business_id, created_at desc)
  where visible = true;

create index if not exists business_subscriptions_business_created_idx
  on public.business_subscriptions (business_id, created_at desc);
