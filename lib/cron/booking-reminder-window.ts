const HOUR_IN_MS = 60 * 60 * 1000;

export const BOOKING_REMINDER_WINDOW = {
  fromHours: 23,
  toHours: 49,
} as const;

export type BookingReminderWindow = {
  from: Date;
  to: Date;
};

/**
 * Returns the half-open interval [from, to) queried by the daily reminder cron.
 *
 * Vercel Hobby cron jobs can run once per day and their start within the
 * scheduled hour is not exact. A 23–49 hour interval covers that variation and
 * overlaps the interval produced by the following daily execution. The unique
 * active reminder constraint in the database makes that overlap safe.
 */
export function getBookingReminderWindow(
  referenceTime: Date
): BookingReminderWindow {
  const referenceTimestamp = referenceTime.getTime();

  if (!Number.isFinite(referenceTimestamp)) {
    throw new RangeError("referenceTime must be a valid Date");
  }

  return {
    from: new Date(
      referenceTimestamp +
        BOOKING_REMINDER_WINDOW.fromHours * HOUR_IN_MS
    ),
    to: new Date(
      referenceTimestamp +
        BOOKING_REMINDER_WINDOW.toHours * HOUR_IN_MS
    ),
  };
}
