-- The preliminary SELECT in application code is only a fast path. These
-- partial unique indexes are the real concurrency guarantee when two workers
-- try to enqueue the same notification simultaneously.

create unique index if not exists notifications_booking_reminder_unique_active
  on public.notifications (booking_id)
  where booking_id is not null
    and type = 'BOOKING_REMINDER'
    and status in ('PENDING', 'SENT');

create unique index if not exists notifications_booking_cancellation_unique_active
  on public.notifications (booking_id)
  where booking_id is not null
    and type = 'BOOKING_CANCELLATION'
    and status in ('PENDING', 'SENT');
