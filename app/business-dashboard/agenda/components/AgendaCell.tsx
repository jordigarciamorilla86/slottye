"use client";

import {
  type DragEvent,
  type MouseEvent,
  useMemo,
  useState,
} from "react";

import type {
  AgendaCellEvent,
} from "../types/agenda";

type Props = {
  day: Date;
  minute: number;
  open: boolean;
  events: AgendaCellEvent[];
  currentTime: Date;
  compactMobileWeek: boolean;
  dragEnabled: boolean;
  draggingEvent: AgendaCellEvent | null;

  onOpenEvent: (
    event: AgendaCellEvent
  ) => void;

  onOpenEmptySlot: (
    day: Date,
    minute: number
  ) => void;

  onStartDragging: (
    event: AgendaCellEvent
  ) => void;

  onFinishDragging: () => void;

  onDropAt: (
    day: Date,
    minute: number
  ) => void;
};

type PositionedEvent = {
  event: AgendaCellEvent;
  lane: number;
  laneCount: number;
};

const SLOT_MINUTES = 30;
const SNAP_MINUTES = 15;
const ROW_HEIGHT = 58;
const EVENT_HORIZONTAL_INSET = 6;
const EVENT_HORIZONTAL_GAP = 4;
const EVENT_VERTICAL_INSET = 1;
const MIN_EVENT_HEIGHT = 14;

function sameLocalDay(
  a: Date,
  b: Date
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function formatTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function snapToQuarterHour(
  minute: number
) {
  return (
    Math.round(
      minute /
        SNAP_MINUTES
    ) *
    SNAP_MINUTES
  );
}

function minuteFromPointerPosition(
  clientY: number,
  element: HTMLElement,
  rowStartMinute: number
) {
  const rect =
    element.getBoundingClientRect();

  if (
    rect.height <=
    0
  ) {
    return rowStartMinute;
  }

  const relativeY =
    clamp(
      clientY -
        rect.top,
      0,
      rect.height
    );

  const rawMinute =
    rowStartMinute +
    (
      relativeY /
      rect.height
    ) *
      SLOT_MINUTES;

  return clamp(
    snapToQuarterHour(
      rawMinute
    ),
    0,
    24 * 60 -
      SNAP_MINUTES
  );
}

function eventStartsInCell(
  event: AgendaCellEvent,
  cellStart: Date,
  cellEnd: Date
) {
  const start =
    new Date(
      event.startAt
    ).getTime();

  return (
    start >=
      cellStart.getTime() &&
    start <
      cellEnd.getTime()
  );
}


function eventOverlapsRange(
  event: AgendaCellEvent,
  rangeStart: Date,
  rangeEnd: Date
) {
  const eventStart =
    new Date(
      event.startAt
    ).getTime();

  const eventEnd =
    new Date(
      event.endAt
    ).getTime();

  return (
    Number.isFinite(
      eventStart
    ) &&
    Number.isFinite(
      eventEnd
    ) &&
    eventStart <
      rangeEnd.getTime() &&
    eventEnd >
      rangeStart.getTime()
  );
}

/*
 * Solo asigna columnas a eventos que empiezan en esta fila
 * y que se solapan realmente entre sí.
 */
function positionStartingEvents(
  events: AgendaCellEvent[]
): PositionedEvent[] {
  const sorted =
    [...events].sort(
      (
        first,
        second
      ) =>
        new Date(
          first.startAt
        ).getTime() -
          new Date(
            second.startAt
          ).getTime() ||
        new Date(
          first.endAt
        ).getTime() -
          new Date(
            second.endAt
          ).getTime()
    );

  const result:
    PositionedEvent[] =
    [];

  let groupStart =
    0;

  while (
    groupStart <
    sorted.length
  ) {
    let groupEnd =
      groupStart +
      1;

    let furthestEnd =
      new Date(
        sorted[
          groupStart
        ].endAt
      ).getTime();

    while (
      groupEnd <
        sorted.length &&
      new Date(
        sorted[
          groupEnd
        ].startAt
      ).getTime() <
        furthestEnd
    ) {
      furthestEnd =
        Math.max(
          furthestEnd,
          new Date(
            sorted[
              groupEnd
            ].endAt
          ).getTime()
        );

      groupEnd +=
        1;
    }

    const group =
      sorted.slice(
        groupStart,
        groupEnd
      );

    const laneEnds:
      number[] =
      [];

    const assigned =
      group.map(
        (
          event
        ) => {
          const start =
            new Date(
              event.startAt
            ).getTime();

          const end =
            new Date(
              event.endAt
            ).getTime();

          let lane =
            laneEnds.findIndex(
              (
                laneEnd
              ) =>
                laneEnd <=
                start
            );

          if (
            lane ===
            -1
          ) {
            lane =
              laneEnds.length;

            laneEnds.push(
              end
            );
          } else {
            laneEnds[
              lane
            ] =
              end;
          }

          return {
            event,
            lane,
          };
        }
      );

    const laneCount =
      Math.max(
        1,
        laneEnds.length
      );

    for (
      const item of
        assigned
    ) {
      result.push({
        ...item,
        laneCount,
      });
    }

    groupStart =
      groupEnd;
  }

  return result;
}

export default function AgendaCell({
  day,
  minute,
  open,
  events,
  currentTime,
  compactMobileWeek,
  dragEnabled,
  draggingEvent,
  onOpenEvent,
  onOpenEmptySlot,
  onStartDragging,
  onFinishDragging,
  onDropAt,
}: Props) {
  const [
    dragOverMinute,
    setDragOverMinute,
  ] =
    useState<
      number | null
    >(
      null
    );

  const cellStart =
    new Date(
      day
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

  /*
   * Importante: getCellData devuelve todos los eventos que
   * atraviesan esta fila. Aquí dibujamos solamente los que
   * EMPIEZAN en ella, para no duplicar eventos largos.
   */
  const startingEvents =
    useMemo(
      () =>
        events.filter(
          (
            event
          ) =>
            eventStartsInCell(
              event,
              cellStart,
              cellEnd
            )
        ),
      [
        events,
        cellStart.getTime(),
        cellEnd.getTime(),
      ]
    );

  const positionedEvents =
    useMemo(
      () =>
        positionStartingEvents(
          startingEvents
        ),
      [
        startingEvents,
      ]
    );

    


  const freeQuarterStarts =
    useMemo(
      () => {
        const quarters =
          [
            minute,
            minute +
              SNAP_MINUTES,
          ];

        return quarters.filter(
          (
            quarterStartMinute
          ) => {
            const rangeStart =
              new Date(
                day
              );

            rangeStart.setHours(
              Math.floor(
                quarterStartMinute /
                  60
              ),
              quarterStartMinute %
                60,
              0,
              0
            );

            const rangeEnd =
              new Date(
                rangeStart.getTime() +
                  SNAP_MINUTES *
                    60 *
                    1000
              );

            return !events.some(
              (
                event
              ) =>
                eventOverlapsRange(
                  event,
                  rangeStart,
                  rangeEnd
                )
            );
          }
        );
      },
      [
        day,
        minute,
        events,
      ]
    );

  const currentMinutes =
    currentTime.getHours() *
      60 +
    currentTime.getMinutes() +
    currentTime.getSeconds() /
      60;

  const isCurrentTimeCell =
    sameLocalDay(
      day,
      currentTime
    ) &&
    currentMinutes >=
      minute &&
    currentMinutes <
      minute +
        SLOT_MINUTES;

  const currentTimePosition =
    isCurrentTimeCell
      ? (
          (
            currentMinutes -
            minute
          ) /
          SLOT_MINUTES
        ) *
        100
      : 0;

  const dropTargetActive =
    Boolean(
      draggingEvent
    );

  const draggingDurationMinutes =
    draggingEvent
      ? Math.max(
          1,
          (
            new Date(
              draggingEvent.endAt
            ).getTime() -
            new Date(
              draggingEvent.startAt
            ).getTime()
          ) /
            60000
        )
      : 0;
  
  const dragIndicatorPosition =
    dragOverMinute ===
    null
      ? null
      : (
          (
            dragOverMinute -
            minute
          ) /
          SLOT_MINUTES
        ) *
        100;
  
  const dragEndIndicatorPosition =
    dragOverMinute ===
      null ||
    !draggingEvent
      ? null
      : (
          (
            dragOverMinute +
            draggingDurationMinutes -
            minute
          ) /
          SLOT_MINUTES
        ) *
        100;

  function handleDragOver(
    dragEvent:
      DragEvent<HTMLDivElement>
  ) {
    if (
      !dropTargetActive
    ) {
      return;
    }

    dragEvent.preventDefault();

    dragEvent.dataTransfer.dropEffect =
      "move";

    setDragOverMinute(
      minuteFromPointerPosition(
        dragEvent.clientY,
        dragEvent.currentTarget,
        minute
      )
    );
  }

  function handleDragLeave(
    dragEvent:
      DragEvent<HTMLDivElement>
  ) {
    const nextTarget =
      dragEvent.relatedTarget;

    if (
      nextTarget instanceof
        Node &&
      dragEvent.currentTarget.contains(
        nextTarget
      )
    ) {
      return;
    }

    setDragOverMinute(
      null
    );
  }

  function handleDrop(
    dragEvent:
      DragEvent<HTMLDivElement>
  ) {
    if (
      !dropTargetActive
    ) {
      return;
    }

    dragEvent.preventDefault();

    const exactMinute =
      minuteFromPointerPosition(
        dragEvent.clientY,
        dragEvent.currentTarget,
        minute
      );

    setDragOverMinute(
      null
    );

    onDropAt(
      day,
      exactMinute
    );
  }


  function handleCellClick(
    mouseEvent:
      MouseEvent<HTMLDivElement>
  ) {
    /*
     * Solo actuamos cuando se pulsa directamente
     * sobre el fondo libre de la celda.
     */
    if (
      mouseEvent.target !==
      mouseEvent.currentTarget
    ) {
      return;
    }

    /*
     * En una celda parcialmente ocupada,
     * usamos la posición vertical para escoger
     * el cuarto de hora libre.
     */
    const selectedMinute =
      minuteFromPointerPosition(
        mouseEvent.clientY,
        mouseEvent.currentTarget,
        minute
      );

    onOpenEmptySlot(
      day,
      selectedMinute
    );
  }


  return (
    <div
      onClick={
        handleCellClick
      }
      onDragOver={
        handleDragOver
      }
      onDragEnter={
        handleDragOver
      }
      onDragLeave={
        handleDragLeave
      }
      onDrop={
        handleDrop
      }
      style={{
        height:
          ROW_HEIGHT,

        minHeight:
          ROW_HEIGHT,

        position:
          "relative",

        padding:
          0,

        borderLeft:
          "1px solid var(--border)",

        borderBottom:
          "1px solid var(--border)",

          background:
          dragOverMinute !== null
            ? "transparent"
            : open
              ? "#ffffff"
              : "#f8fafc",

              zIndex:
  dragOverMinute !==
  null
    ? 200
    : positionedEvents.length >
        0
      ? 100 -
        Math.floor(
          minute /
            SLOT_MINUTES
        )
      : 1,

        overflow:
          "visible",

        transition:
          "background 0.12s ease, box-shadow 0.12s ease",
      }}
    >

{freeQuarterStarts.length >
        0 && (
        <>
          {freeQuarterStarts.length ===
          2 ? (
            <button
              type="button"
              onClick={(
                mouseEvent
              ) => {
                mouseEvent.stopPropagation();

                onOpenEmptySlot(
                  day,
                  minute
                );
              }}
              style={{
                position:
                  "absolute",

                inset:
                  0,

                zIndex:
                  12,

                border:
                  "1px dashed var(--border)",

                borderRadius:
                  compactMobileWeek
                    ? 4
                    : 10,

                background:
                  "transparent",

                color:
                  "var(--muted)",

                cursor:
                  "pointer",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  0,

                font:
                  "inherit",
              }}
              title={
                open
                  ? "Crear a esta hora"
                  : "Crear una excepción fuera del horario habitual"
              }
            >
              <span
  style={{
    fontSize:
      compactMobileWeek
        ? 9
        : 14,

    fontWeight:
      700,

    lineHeight:
      1,

    color:
      "var(--muted)",
  }}
>
  +
</span>
            </button>
          ) : (
            freeQuarterStarts.map(
              (
                quarterStartMinute
              ) => {
                const quarterIndex =
                  quarterStartMinute ===
                  minute
                    ? 0
                    : 1;

                return (
                  <button
                    key={
                      quarterStartMinute
                    }
                    type="button"
                    onClick={(
                      mouseEvent
                    ) => {
                      mouseEvent.stopPropagation();

                      onOpenEmptySlot(
                        day,
                        quarterStartMinute
                      );
                    }}
                    style={{
                      position:
                        "absolute",

                      top:
                        quarterIndex ===
                        0
                          ? 0
                          : "50%",

                      left:
                        0,

                      right:
                        0,

                      height:
                        "50%",

                      zIndex:
                        12,

                      border:
                        "none",

                      background:
                        "transparent",

                      color:
                        "var(--muted)",

                      cursor:
                        "pointer",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      padding:
                        0,

                      font:
                        "inherit",
                    }}
                    title={`Crear a las ${String(
                      Math.floor(
                        quarterStartMinute /
                          60
                      )
                    ).padStart(
                      2,
                      "0"
                    )}:${String(
                      quarterStartMinute %
                        60
                    ).padStart(
                      2,
                      "0"
                    )}`}
                  >
                    <span
  style={{
    fontSize:
      compactMobileWeek
        ? 9
        : 14,

    fontWeight:
      700,

    lineHeight:
      1,

    color:
      "var(--muted)",
  }}
>
  +
</span>
                  </button>
                );
              }
            )
          )}
        </>
      )}




      {positionedEvents.map(
        ({
          event,
          lane,
          laneCount,
        }) => {
          const eventStart =
            new Date(
              event.startAt
            );

          const eventEnd =
            new Date(
              event.endAt
            );

          const eventDurationMinutes =
            Math.max(
              1,
              (
                eventEnd.getTime() -
                eventStart.getTime()
              ) /
                60000
            );

          const eventStartMinutes =
            eventStart.getHours() *
              60 +
            eventStart.getMinutes() +
            eventStart.getSeconds() /
              60;

          const eventOffsetMinutes =
            clamp(
              eventStartMinutes -
                minute,
              0,
              SLOT_MINUTES
            );

          const eventTop =
            (
              eventOffsetMinutes /
              SLOT_MINUTES
            ) *
              ROW_HEIGHT +
            EVENT_VERTICAL_INSET;

          const exactEventHeight =
            (
              eventDurationMinutes /
              SLOT_MINUTES
            ) *
            ROW_HEIGHT;

          const eventHeight =
            Math.max(
              MIN_EVENT_HEIGHT,
              exactEventHeight -
                EVENT_VERTICAL_INSET *
                  2
            );

          const compactEvent =
            eventHeight <
            42;

          const completedBooking =
            Boolean(
              event.type ===
                "booking" &&
              event.source.status ===
                "COMPLETED"
            );

          const draggableEvent =
            Boolean(
              dragEnabled &&
              !completedBooking
            );

          let eventBackground =
            "#ffffff";

          let eventBorderColor =
            "var(--border)";

          if (
            event.type ===
            "booking"
          ) {
            eventBackground =
              completedBooking
                ? "#f3f4f6"
                : "#f3e8ff";

            eventBorderColor =
              completedBooking
                ? "#9ca3af"
                : "#e9d5ff";
          } else if (
            event.type ===
            "manual"
          ) {
            eventBackground =
              "#eff6ff";

            eventBorderColor =
              "#bfdbfe";
          } else if (
            event.type ===
            "block"
          ) {
            eventBackground =
              "#fef2f2";

            eventBorderColor =
              "#fecaca";
          } else {
            eventBackground =
              "#f0fdf4";

            eventBorderColor =
              "#bbf7d0";
          }

          const widthPercent =
            100 /
            laneCount;

          const leftPercent =
            lane *
            widthPercent;

          const horizontalInset =
            compactMobileWeek
              ? 2
              : EVENT_HORIZONTAL_INSET;

          const horizontalGap =
            compactMobileWeek
              ? 1
              : EVENT_HORIZONTAL_GAP;

          function handleDragStart(
            dragEvent:
              DragEvent<HTMLButtonElement>
          ) {
            if (
              !draggableEvent
            ) {
              dragEvent.preventDefault();

              return;
            }

            dragEvent.dataTransfer.effectAllowed =
              "move";

            dragEvent.dataTransfer.setData(
              "application/x-slottye-agenda-event",
              `${event.type}:${event.id}`
            );

            dragEvent.dataTransfer.setData(
              "text/plain",
              `${event.type}:${event.id}`
            );

            onStartDragging(
              event
            );
          }

          return (
            <button
              key={`${event.type}:${event.id}`}
              type="button"
              title={`${formatTime(
                event.startAt
              )}–${formatTime(
                event.endAt
              )}`}
              draggable={
                draggableEvent
              }
              onDragStart={
                handleDragStart
              }
              onDragEnd={() => {
                setDragOverMinute(
                  null
                );

                onFinishDragging();
              }}
              onClick={(
                mouseEvent
              ) => {
                mouseEvent.stopPropagation();

                onOpenEvent(
                  event
                );
              }}
              style={{
                position:
                  "absolute",

                top:
                  eventTop,

                left:
                  `calc(${leftPercent}% + ${
                    horizontalInset +
                    lane *
                      horizontalGap
                  }px)`,

                width:
                  `calc(${widthPercent}% - ${
                    horizontalInset *
                      2 +
                    horizontalGap
                  }px)`,

                height:
                  eventHeight,

                minHeight:
                  MIN_EVENT_HEIGHT,

                zIndex:
                  15 +
                  lane,

                border:
                  `1px solid ${eventBorderColor}`,

                borderRadius:
                  10,

                background:
                  eventBackground,

                cursor:
                  completedBooking
                    ? "default"
                    : draggableEvent
                      ? "grab"
                      : "pointer",

                opacity:
                  draggingEvent &&
                  draggingEvent.id ===
                    event.id &&
                  draggingEvent.type ===
                    event.type
                    ? 0.45
                    : 1,

                boxShadow:
                  draggableEvent
                    ? "0 2px 8px rgba(15, 23, 42, 0.14)"
                    : "none",

                transition:
                  "box-shadow 0.12s ease, opacity 0.12s ease",

                textAlign:
                  "left",

                padding:
                  compactMobileWeek
                    ? 0
                    : compactEvent
                      ? "3px 7px"
                      : "6px 8px",

                color:
                  "inherit",

                font:
                  "inherit",

                overflow:
                  "hidden",
              }}
            >
              {!compactMobileWeek && (
                <>
                  <strong
                    style={{
                      display:
                        "block",

                      fontSize:
                        compactEvent
                          ? 11
                          : 12,

                      lineHeight:
                        compactEvent
                          ? 1.1
                          : 1.2,

                      overflow:
                        "hidden",

                      textOverflow:
                        "ellipsis",

                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {event.title}
                  </strong>

                  {event.subtitle &&
                    !compactEvent && (
                      <div
                        className="muted"
                        style={{
                          marginTop:
                            3,

                          fontSize:
                            11,

                          lineHeight:
                            1.15,

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {event.subtitle}
                      </div>
                    )}
                </>
              )}
            </button>
          );
        }
      )}

      {dragIndicatorPosition !==
        null && (
        <div
          style={{
            position:
              "absolute",

            left:
              0,

            right:
              0,

            top:
              `${dragIndicatorPosition}%`,

            height:
              2,

            background:
              "#16a34a",

            zIndex:
              30,

            pointerEvents:
              "none",
          }}
        />
      )}
      {dragEndIndicatorPosition !==
  null && (
  <div
    style={{
      position:
        "absolute",

      left:
        0,

      right:
        0,

      top:
        `${dragEndIndicatorPosition}%`,

      height:
        2,

      background:
        "#dc2626",

      boxShadow:
        "0 0 0 1px rgba(220, 38, 38, 0.18)",

      zIndex:
        31,

      pointerEvents:
        "none",
    }}
  >
    <div
      style={{
        position:
          "absolute",

        right:
          4,

        top:
          -18,

        padding:
          "1px 5px",

        borderRadius:
          5,

        background:
          "#dc2626",

        color:
          "#ffffff",

        fontSize:
          9,

        fontWeight:
          700,

        lineHeight:
          1.4,

        whiteSpace:
          "nowrap",
      }}
    >
      Fin
    </div>
  </div>
)}

      {isCurrentTimeCell && (
        <div
          style={{
            position:
              "absolute",

            left:
              0,

            right:
              0,

            top:
              `${currentTimePosition}%`,

            height:
              2,

            background:
              "#ef4444",

            zIndex:
              25,

            pointerEvents:
              "none",
          }}
        />
      )}
    </div>
  );
}