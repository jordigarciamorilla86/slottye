"use client";

import {
  useCallback,
} from "react";

import type {
  AgendaBooking,
  AgendaBusinessBlock,
  AgendaBusinessHour,
  AgendaCellEvent,
  AgendaManualBooking,
  AgendaSelectedEvent,
  AgendaService,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  services: AgendaService[];
  businessHours: AgendaBusinessHour[];
  slots: AgendaSlot[];
  bookings: AgendaBooking[];
  blocks: AgendaBusinessBlock[];
  manualBookings: AgendaManualBooking[];
  onSelectEvent: (
    event: AgendaSelectedEvent
  ) => void;
};

const SLOT_MINUTES = 30;

function minutesFromTime(
  value: string
) {
  const [
    hour,
    minute,
  ] =
    value
      .slice(
        0,
        5
      )
      .split(
        ":"
      )
      .map(
        Number
      );

  return (
    hour *
      60 +
    minute
  );
}

export default function useAgendaEvents({
  services,
  businessHours,
  slots,
  bookings,
  blocks,
  manualBookings,
  onSelectEvent,
}: Props) {
  const isOpenAt =
    useCallback(
      (
        dayIndex:
          number,
        minute:
          number
      ) => {
        const schedule =
          businessHours.find(
            (
              hour
            ) =>
              hour.day_of_week ===
              dayIndex
          );

        if (
          !schedule ||
          schedule.closed
        ) {
          return false;
        }

        function inRange(
          start:
            string |
            null,
          end:
            string |
            null
        ) {
          if (
            !start ||
            !end
          ) {
            return false;
          }

          const startMinute =
            minutesFromTime(
              start
            );

          const endMinute =
            minutesFromTime(
              end
            );

          return (
            minute >=
              startMinute &&
            minute <
              endMinute
          );
        }

        return (
          inRange(
            schedule.open_time,
            schedule.close_time
          ) ||
          inRange(
            schedule.open_time_2,
            schedule.close_time_2
          )
        );
      },
      [
        businessHours,
      ]
    );

  const getCellData =
    useCallback(
      (
        date:
          Date,
        minute:
          number
      ):
        AgendaCellEvent |
        null => {
        const cellStart =
          new Date(
            date
          );

        cellStart.setHours(
          Math.floor(
            minute /
              60
          ),
          minute %
            60,
          0,
          0
        );

        const cellEnd =
          new Date(
            cellStart.getTime() +
              SLOT_MINUTES *
                60 *
                1000
          );

        const manualBooking =
          manualBookings.find(
            (
              booking
            ) => {
              const start =
                new Date(
                  booking.start_at
                );

              const end =
                new Date(
                  booking.end_at
                );

              return (
                start <
                  cellEnd &&
                end >
                  cellStart
              );
            }
          );

        if (
          manualBooking
        ) {
          return {
            type:
              "manual",

            id:
              manualBooking.id,

            title:
              manualBooking.customer_name,

            subtitle:
              manualBooking.services
                ?.name ??
              "Reserva manual",

            source:
              manualBooking,

            startAt:
              manualBooking.start_at,

            endAt:
              manualBooking.end_at,
          };
        }

        const onlineBooking =
          bookings.find(
            (
              booking
            ) => {
              if (
                ![
                  "CONFIRMED",
                  "COMPLETED",
                ].includes(
                  booking.status
                ) ||
                !booking.slots
              ) {
                return false;
              }

              const start =
                new Date(
                  booking.slots
                    .start_at
                );

              const end =
                new Date(
                  booking.slots
                    .end_at
                );

              return (
                start <
                  cellEnd &&
                end >
                  cellStart
              );
            }
          );

        if (
          onlineBooking &&
          onlineBooking.slots
        ) {
          return {
            type:
              "booking",

            id:
              onlineBooking.id,

            title:
              onlineBooking.profiles
                ?.name ??
              "Cliente",

            subtitle:
              onlineBooking.status ===
              "COMPLETED"
                ? `✓ Completada · ${
                    onlineBooking.services
                      ?.name ??
                    "Reserva Slottye"
                  }`
                : onlineBooking.services
                    ?.name ??
                  "Reserva Slottye",

            source:
              onlineBooking,

            startAt:
              onlineBooking.slots
                .start_at,

            endAt:
              onlineBooking.slots
                .end_at,
          };
        }

        const block =
          blocks.find(
            (
              item
            ) => {
              const start =
                new Date(
                  item.start_at
                );

              const end =
                new Date(
                  item.end_at
                );

              return (
                start <
                  cellEnd &&
                end >
                  cellStart
              );
            }
          );

        if (
          block
        ) {
          return {
            type:
              "block",

            id:
              block.id,

            title:
              "Bloqueado",

            subtitle:
              block.reason ??
              "",

            source:
              block,

            startAt:
              block.start_at,

            endAt:
              block.end_at,
          };
        }

        const slot =
          slots.find(
            (
              item
            ) => {
              if (
                item.status !==
                  "AVAILABLE"
              ) {
                return false;
              }

              const start =
                new Date(
                  item.start_at
                );

              const end =
                new Date(
                  item.end_at
                );

              return (
                start <
                  cellEnd &&
                end >
                  cellStart
              );
            }
          );

        if (
          slot
        ) {
          return {
            type:
              "slot",

            id:
              slot.id,

            title:
              "Disponible",

            subtitle:
              services.find(
                (
                  service
                ) =>
                  service.id ===
                  slot.service_id
              )?.name ??
              "",

            source:
              slot,

            startAt:
              slot.start_at,

            endAt:
              slot.end_at,
          };
        }

        return null;
      },
      [
        manualBookings,
        bookings,
        blocks,
        slots,
        services,
      ]
    );

  const openExistingEvent =
    useCallback(
      (
        event:
          AgendaCellEvent
      ) => {
        if (
          event.type ===
          "manual"
        ) {
          onSelectEvent({
            type:
              "manual",

            event:
              event.source,
          });

          return;
        }

        if (
          event.type ===
          "booking"
        ) {
          onSelectEvent({
            type:
              "booking",

            event:
              event.source,
          });

          return;
        }

        if (
          event.type ===
          "block"
        ) {
          onSelectEvent({
            type:
              "block",

            event:
              event.source,
          });

          return;
        }

        onSelectEvent({
          type:
            "slot",

          event:
            event.source,
        });
      },
      [
        onSelectEvent,
      ]
    );

  return {
    isOpenAt,
    getCellData,
    openExistingEvent,
  };
}