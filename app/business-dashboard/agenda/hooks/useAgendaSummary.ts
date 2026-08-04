"use client";

import {
  useMemo,
} from "react";

import type {
  AgendaBooking,
  AgendaBusinessBlock,
  AgendaManualBooking,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  isMobile: boolean;
  selectedMobileDay: number;
  weekStart: Date;
  weekDays: Date[];
  currentTime: Date;
  bookings: AgendaBooking[];
  manualBookings: AgendaManualBooking[];
  slots: AgendaSlot[];
  blocks: AgendaBusinessBlock[];
};

function startOfDay(
  date: Date
) {
  const result =
    new Date(
      date
    );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function addDays(
  date: Date,
  days: number
) {
  const result =
    new Date(
      date
    );

  result.setDate(
    result.getDate() +
      days
  );

  return result;
}

function getMonday(
  date: Date
) {
  const result =
    startOfDay(
      date
    );

  const day =
    result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      diff
  );

  return result;
}

function getMondayDayIndex(
  date: Date
) {
  const day =
    date.getDay();

  return day === 0
    ? 6
    : day - 1;
}

export default function useAgendaSummary({
  isMobile,
  selectedMobileDay,
  weekStart,
  weekDays,
  currentTime,
  bookings,
  manualBookings,
  slots,
  blocks,
}: Props) {
  const currentWeekStart =
    getMonday(
      currentTime
    );

  const viewingCurrentWeek =
    currentWeekStart.getTime() ===
    weekStart.getTime();

  const summaryDayIndex =
    isMobile
      ? selectedMobileDay
      : viewingCurrentWeek
        ? getMondayDayIndex(
            currentTime
          )
        : 0;

  const summaryDay =
    weekDays[
      summaryDayIndex
    ];

  const dailySummary =
    useMemo(() => {
      const dayStart =
        startOfDay(
          summaryDay
        );

      const dayEnd =
        addDays(
          dayStart,
          1
        );

      function overlapsDay(
        startAt: string,
        endAt: string
      ) {
        const start =
          new Date(
            startAt
          );

        const end =
          new Date(
            endAt
          );

        return (
          start <
            dayEnd &&
          end >
            dayStart
        );
      }

      const onlineBookings =
        bookings.filter(
          (
            booking
          ) =>
            booking.status ===
              "CONFIRMED" &&
            booking.slots &&
            overlapsDay(
              booking.slots
                .start_at,
              booking.slots
                .end_at
            )
        ).length;

        const completedCount =
  bookings.filter(
    (
      booking
    ) =>
      booking.status ===
        "COMPLETED" &&
      booking.slots &&
      overlapsDay(
        booking.slots
          .start_at,
        booking.slots
          .end_at
      )
  ).length;

      const manualCount =
        manualBookings.filter(
          (
            booking
          ) =>
            overlapsDay(
              booking.start_at,
              booking.end_at
            )
        ).length;

      const availableCount =
        slots.filter(
          (
            slot
          ) =>
            slot.status ===
              "AVAILABLE" &&
            overlapsDay(
              slot.start_at,
              slot.end_at
            )
        ).length;

      const blockCount =
        blocks.filter(
          (
            block
          ) =>
            overlapsDay(
              block.start_at,
              block.end_at
            )
        ).length;

      return {
        onlineBookings,
        completedCount,
        manualCount,
        availableCount,
        blockCount,
      };
    }, [
      summaryDay,
      bookings,
      manualBookings,
      slots,
      blocks,
    ]);

  return {
    summaryDay,
    viewingCurrentWeek,
    dailySummary,
  };
}
