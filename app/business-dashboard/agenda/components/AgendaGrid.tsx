"use client";

import type {
  RefObject,
} from "react";

import AgendaCell from "./AgendaCell";

import type {
  AgendaBooking,
  AgendaCellEvent,
  AgendaSlot,
  AgendaVisibleDay,
} from "../types/agenda";

type Props = {
  agendaScrollRef: RefObject<HTMLDivElement | null>;
  loadingWeek: boolean;
  isMobile: boolean;
  gridTemplateColumns: string;
  visibleDays: AgendaVisibleDay[];
  currentTime: Date;
  timeRows: number[];
  draggingEvent: AgendaCellEvent | null;
  reschedulingBooking: AgendaBooking | null;

  onChooseRescheduleTarget: (
    day: Date,
    minute: number,
    sourceSlot:
      AgendaSlot |
      null
  ) => void;

  isOpenAt: (
    dayIndex: number,
    minute: number
  ) => boolean;

  getCellData: (
    date: Date,
    minute: number
  ) => AgendaCellEvent[];

  openExistingEvent: (
    event: AgendaCellEvent
  ) => void;

  openSlotModal: (
    day: Date,
    minute: number
  ) => void;

  startDragging: (
    event: AgendaCellEvent
  ) => void;

  finishDragging: () => void;

  dropAt: (
    day: Date,
    minute: number
  ) => void;
};

const ROW_HEIGHT = 58;
const AGENDA_HEIGHT = 600;

function formatTime(
  minutes: number
) {
  const hour =
    Math.floor(
      minutes /
        60
    );

  const minute =
    minutes %
    60;

  return `${String(
    hour
  ).padStart(
    2,
    "0"
  )}:${String(
    minute
  ).padStart(
    2,
    "0"
  )}`;
}

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

function minutesFromStartOfDay(
  value: string
) {
  const date =
    new Date(
      value
    );

  return (
    date.getHours() *
      60 +
    date.getMinutes()
  );
}

export default function AgendaGrid({
  agendaScrollRef,
  loadingWeek,
  isMobile,
  gridTemplateColumns,
  visibleDays,
  currentTime,
  timeRows,
  draggingEvent,
  reschedulingBooking,
  onChooseRescheduleTarget,
  isOpenAt,
  getCellData,
  openExistingEvent,
  openSlotModal,
  startDragging,
  finishDragging,
  dropAt,
}: Props) {
  return (
    <div
      ref={
        agendaScrollRef
      }
      style={{
        height:
          AGENDA_HEIGHT,

        overflow:
          "auto",

        border:
          "1px solid var(--border)",

        borderRadius:
          16,

        position:
          "relative",

        overscrollBehavior:
          "contain",

        opacity:
          loadingWeek
            ? 0.7
            : 1,

        transition:
          "opacity 0.15s ease",
      }}
    >
      <div
        style={{
          minWidth:
            isMobile
              ? 0
              : 1050,
        }}
      >
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns,

            borderBottom:
              "1px solid var(--border)",

              position:
              "sticky",
            
            top:
              0,
            
            zIndex:
              500,
            
            background:
              "#ffffff",
            
            isolation:
              "isolate",
          }}
        >
          <div
            style={{
              padding:
                12,

              position:
                "sticky",

              left:
                0,

              zIndex:
                510,

              background:
                "#ffffff",

              borderRight:
                "1px solid var(--border)",
            }}
          />

          {visibleDays.map(
            ({
              day,
            }) => (
              <div
                key={
                  day.toISOString()
                }
                style={{
                  padding:
                    "12px 8px",

                  textAlign:
                    "center",

                  borderLeft:
                    "1px solid var(--border)",

                    position:
                    "relative",
              
                  zIndex:
                    505,

                  background:
                    sameLocalDay(
                      day,
                      currentTime
                    )
                      ? "#f8fafc"
                      : "#ffffff",
                }}
              >
                <strong
                  style={{
                    textTransform:
                      "capitalize",
                  }}
                >
                  {day.toLocaleDateString(
                    "es-ES",
                    {
                      weekday:
                        "long",
                    }
                  )}
                </strong>

                <div
                  className="muted"
                  style={{
                    marginTop:
                      3,
                  }}
                >
                  {day.toLocaleDateString(
                    "es-ES",
                    {
                      day:
                        "numeric",

                      month:
                        "short",
                    }
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {timeRows.map(
          (
            minute
          ) => (
            <div
              key={
                minute
              }
              style={{
                display:
                  "grid",

                gridTemplateColumns,

                height:
                  ROW_HEIGHT,

                minHeight:
                  ROW_HEIGHT,
              }}
            >
              <div
                style={{
                  padding:
                    "10px 8px",

                  fontSize:
                    13,

                  fontWeight:
                    700,

                  textAlign:
                    "right",

                  position:
                    "sticky",

                  left:
                    0,

                  zIndex:
                    20,

                  background:
                    "#ffffff",

                  borderRight:
                    "1px solid var(--border)",

                  borderBottom:
                    "1px solid var(--border)",
                }}
              >
                {formatTime(
                  minute
                )}
              </div>

              {visibleDays.map(
                ({
                  day,
                  dayIndex,
                }) => {
                  const cellEvents =
                    getCellData(
                      day,
                      minute
                    );

                  return (
                    <AgendaCell
                      key={`${day.toISOString()}-${minute}`}
                      day={
                        day
                      }
                      minute={
                        minute
                      }
                      open={
                        isOpenAt(
                          dayIndex,
                          minute
                        )
                      }
                      events={
                        cellEvents
                      }
                      currentTime={
                        currentTime
                      }
                      dragEnabled={
                        !isMobile &&
                        !reschedulingBooking
                      }
                      draggingEvent={
                        draggingEvent
                      }
                      onOpenEvent={(
                        event
                      ) => {
                        if (
                          reschedulingBooking
                        ) {
                          if (
                            event.type ===
                              "slot"
                          ) {
                            onChooseRescheduleTarget(
                              day,
                              minutesFromStartOfDay(
                                event.startAt
                              ),
                              event.source
                            );
                          }

                          return;
                        }

                        openExistingEvent(
                          event
                        );
                      }}
                      onOpenEmptySlot={(
                        selectedDay,
                        selectedMinute
                      ) => {
                        if (
                          reschedulingBooking
                        ) {
                          onChooseRescheduleTarget(
                            selectedDay,
                            selectedMinute,
                            null
                          );

                          return;
                        }

                        openSlotModal(
                          selectedDay,
                          selectedMinute
                        );
                      }}
                      onStartDragging={
                        startDragging
                      }
                      onFinishDragging={
                        finishDragging
                      }
                      onDropAt={
                        dropAt
                      }
                    />
                  );
                }
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}