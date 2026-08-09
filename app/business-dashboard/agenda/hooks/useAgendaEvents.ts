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

const GRID_ROW_MINUTES =
  30;

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

  if (
    !Number.isInteger(
      hour
    ) ||
    !Number.isInteger(
      minute
    )
  ) {
    return null;
  }

  return (
    hour *
      60 +
    minute
  );
}

function intervalsOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  return (
    firstStart <
      secondEnd &&
    firstEnd >
      secondStart
  );
}

function dateIntervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) {
  return (
    firstStart.getTime() <
      secondEnd.getTime() &&
    firstEnd.getTime() >
      secondStart.getTime()
  );
}

function validDateInterval(
  start: Date,
  end: Date
) {
  return (
    Number.isFinite(
      start.getTime()
    ) &&
    Number.isFinite(
      end.getTime()
    ) &&
    end.getTime() >
      start.getTime()
  );
}

function eventPriority(
  event: AgendaCellEvent
) {
  if (
    event.type ===
    "manual"
  ) {
    return 1;
  }

  if (
    event.type ===
    "booking"
  ) {
    return 2;
  }

  if (
    event.type ===
    "block"
  ) {
    return 3;
  }

  return 4;
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

        const rowStart =
          minute;

        const rowEnd =
          minute +
          GRID_ROW_MINUTES;

        function overlapsSchedule(
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

          if (
            startMinute ===
              null ||
            endMinute ===
              null ||
            endMinute <=
              startMinute
          ) {
            return false;
          }

          return intervalsOverlap(
            rowStart,
            rowEnd,
            startMinute,
            endMinute
          );
        }

        return (
          overlapsSchedule(
            schedule.open_time,
            schedule.close_time
          ) ||
          overlapsSchedule(
            schedule.open_time_2,
            schedule.close_time_2
          )
        );
      },
      [
        businessHours,
      ]
    );

  /*
   * Devuelve TODOS los eventos que atraviesan esta fila.
   * AgendaCell decidirá cuáles empiezan realmente dentro de ella.
   */
  const getCellData =
    useCallback(
      (
        date:
          Date,
        minute:
          number
      ):
        AgendaCellEvent[] => {
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
              GRID_ROW_MINUTES *
                60 *
                1000
          );

        const result:
          AgendaCellEvent[] =
          [];

        for (
          const booking of
            manualBookings
        ) {
          const start =
            new Date(
              booking.start_at
            );

          const end =
            new Date(
              booking.end_at
            );

          if (
            validDateInterval(
              start,
              end
            ) &&
            dateIntervalsOverlap(
              start,
              end,
              cellStart,
              cellEnd
            )
          ) {
            result.push({
              type:
                "manual",

              id:
                booking.id,

              title:
                booking.customer_name,

              subtitle:
                booking.services
                  ?.name ??
                "Reserva manual",

              source:
                booking,

              startAt:
                booking.start_at,

              endAt:
                booking.end_at,
            });
          }
        }

        for (
          const booking of
            bookings
        ) {
          if (
            ![
              "CONFIRMED",
              "COMPLETED",
            ].includes(
              booking.status
            ) ||
            !booking.slots
          ) {
            continue;
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

          if (
            validDateInterval(
              start,
              end
            ) &&
            dateIntervalsOverlap(
              start,
              end,
              cellStart,
              cellEnd
            )
          ) {
            result.push({
              type:
                "booking",

              id:
                booking.id,

              title:
                booking.profiles
                  ?.name ??
                "Cliente",

              subtitle:
                booking.status ===
                "COMPLETED"
                  ? `✓ Completada · ${
                      booking.services
                        ?.name ??
                      "Reserva Slottye"
                    }`
                  : booking.services
                      ?.name ??
                    "Reserva Slottye",

              source:
                booking,

              startAt:
                booking.slots
                  .start_at,

              endAt:
                booking.slots
                  .end_at,
            });
          }
        }

        for (
          const block of
            blocks
        ) {
          const start =
            new Date(
              block.start_at
            );

          const end =
            new Date(
              block.end_at
            );

          if (
            validDateInterval(
              start,
              end
            ) &&
            dateIntervalsOverlap(
              start,
              end,
              cellStart,
              cellEnd
            )
          ) {
            result.push({
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
            });
          }
        }

        for (
          const slot of
            slots
        ) {
          if (
            slot.status !==
              "AVAILABLE"
          ) {
            continue;
          }

          const start =
            new Date(
              slot.start_at
            );

          const end =
            new Date(
              slot.end_at
            );

            if (
              validDateInterval(
                start,
                end
              ) &&
              dateIntervalsOverlap(
                start,
                end,
                cellStart,
                cellEnd
              )
            ) {
            
              // Si existe un bloqueo que ocupa este slot,
              // no mostramos la disponibilidad.
              const coveredByBlock =
                blocks.some(
                  (
                    block
                  ) => {
                    const blockStart =
                      new Date(
                        block.start_at
                      );
            
                    const blockEnd =
                      new Date(
                        block.end_at
                      );
            
                    return dateIntervalsOverlap(
                      start,
                      end,
                      blockStart,
                      blockEnd
                    );
                  }
                );
            
              if (
                coveredByBlock
              ) {
                continue;
              }
            result.push({
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
            });
          }
        }

/*
 * DEBUG TEMPORAL MÓVIL
 */
if (
  date.getFullYear() === 2026 &&
  date.getMonth() === 7 &&
  date.getDate() === 9 &&
  (
    minute === 8 * 60 + 30 ||
    minute === 10 * 60 + 30
  )
) {
  console.log(
    "[AGENDA DEBUG]",
    {
      date:
        date.toString(),

      minute,

      cellStart:
        cellStart.toString(),

      cellEnd:
        cellEnd.toString(),

      counts: {
        slots:
          slots.length,

        bookings:
          bookings.length,

        blocks:
          blocks.length,

        manualBookings:
          manualBookings.length,
      },

      events:
        result.map(
          (event) => ({
            type:
              event.type,

            title:
              event.title,

            startAt:
              event.startAt,

            endAt:
              event.endAt,
          })
        ),
    }
  );
}


        return result.sort(
          (
            first,
            second
          ) => {
            const startDifference =
              new Date(
                first.startAt
              ).getTime() -
              new Date(
                second.startAt
              ).getTime();

            if (
              startDifference !==
              0
            ) {
              return startDifference;
            }

            return (
              eventPriority(
                first
              ) -
              eventPriority(
                second
              )
            );
          }
        );
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