import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getBookingReminderWindow,
} from "../../lib/cron/booking-reminder-window";

describe("getBookingReminderWindow", () => {
  it("returns the exact half-open 23–49 hour interval", () => {
    const reference = new Date("2026-08-24T09:00:00.000Z");

    const window = getBookingReminderWindow(reference);

    expect(window.from.toISOString()).toBe(
      "2026-08-25T08:00:00.000Z"
    );
    expect(window.to.toISOString()).toBe(
      "2026-08-26T10:00:00.000Z"
    );
  });

  it("does not mutate the reference date", () => {
    const reference = new Date("2026-08-24T09:00:00.000Z");
    const originalTimestamp = reference.getTime();

    getBookingReminderWindow(reference);

    expect(reference.getTime()).toBe(originalTimestamp);
  });

  it("has no gap when consecutive daily executions differ by 24 h 59 min", () => {
    const firstRun = new Date("2026-08-24T09:00:00.000Z");
    const secondRun = new Date("2026-08-25T09:59:00.000Z");

    const firstWindow = getBookingReminderWindow(firstRun);
    const secondWindow = getBookingReminderWindow(secondRun);

    // The next inclusive lower bound begins before the previous exclusive
    // upper bound, leaving a 61-minute overlap instead of a coverage gap.
    expect(secondWindow.from.getTime()).toBeLessThan(
      firstWindow.to.getTime()
    );
    expect(firstWindow.to.getTime() - secondWindow.from.getTime()).toBe(
      61 * 60 * 1000
    );
  });

  it("keeps adjacent windows touching even with a 26-hour run interval", () => {
    const firstRun = new Date("2026-08-24T09:00:00.000Z");
    const secondRun = new Date("2026-08-25T11:00:00.000Z");

    const firstWindow = getBookingReminderWindow(firstRun);
    const secondWindow = getBookingReminderWindow(secondRun);

    expect(secondWindow.from.getTime()).toBe(firstWindow.to.getTime());
  });

  it("rejects an invalid reference date", () => {
    expect(() => getBookingReminderWindow(new Date("invalid"))).toThrow(
      RangeError
    );
  });
});
