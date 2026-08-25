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
  compactMobileWeek: boolean;
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
  const normalizedMinutes =
    Math.max(
      0,
      Math.floor(
        minutes
      )
    );

  const hour =
    Math.floor(
      normalizedMinutes /
        60
    );

  const minute =
    normalizedMinutes %
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

function getMobileWeekdayLabel(
  date: Date
) {
  const labels = [
    "D",
    "L",
    "M",
    "X",
    "J",
    "V",
    "S",
  ];

  return labels[
    date.getDay()
  ];
}

function formatMonthName(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month:
        "long",
    }
  )
    .format(
      date
    )
    .toUpperCase();
}

function getMobileMonthTitle(
  days: AgendaVisibleDay[]
) {
  if (
    days.length ===
    0
  ) {
    return "";
  }

  const first =
    days[0].day;

  const last =
    days[
      days.length - 1
    ].day;

  const firstMonth =
    first.getMonth();

  const lastMonth =
    last.getMonth();

  const firstYear =
    first.getFullYear();

  const lastYear =
    last.getFullYear();

  if (
    firstMonth ===
      lastMonth &&
    firstYear ===
      lastYear
  ) {
    return `${formatMonthName(
      first
    )} ${firstYear}`;
  }

  if (
    firstYear ===
    lastYear
  ) {
    return `${formatMonthName(
      first
    )} · ${formatMonthName(
      last
    )} ${firstYear}`;
  }

  return `${formatMonthName(
    first
  )} ${firstYear} · ${formatMonthName(
    last
  )} ${lastYear}`;
}

export default function AgendaGrid({
  agendaScrollRef,
  loadingWeek,
  isMobile,
  compactMobileWeek,
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
  const mobileMonthTitle =
    isMobile &&
    compactMobileWeek
      ? getMobileMonthTitle(
          visibleDays
        )
      : "";

  return (
    <div
      className="agendagrid11"
      style={{
        marginLeft:
          isMobile
            ? 0
            : 0,

        marginRight:
          isMobile
            ? 0
            : 0,

        width:
          isMobile
            ? "100%"
            : "100%",
      }}
    >
      {isMobile &&
        compactMobileWeek && (
        <div
          className="agendagrid11-month"
          style={{
            padding:
              "2px 16px 10px",

            textAlign:
              "center",

            fontSize:
              11,

            fontWeight:
              800,

            letterSpacing:
              "0.08em",

            color:
              "var(--muted)",
          }}
        >
          {mobileMonthTitle}
        </div>
      )}

      <div
        className="agendagrid11-scroll"
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
            isMobile
              ? 0
              : 16,

          position:
            "relative",

          overscrollBehaviorX:
            "contain",

          overscrollBehaviorY:
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
            className="agendagrid11-head"
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
            }}
          >
            <div
              className="agendagrid11-corner"
              style={{
                padding:
                  isMobile
                    ? 6
                    : 12,

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
                  className={
                    sameLocalDay(day, currentTime)
                      ? "agendagrid11-day is-today"
                      : "agendagrid11-day"
                  }
                  key={
                    day.toISOString()
                  }
                  style={{
                    padding:
                      isMobile
                        ? "9px 1px"
                        : "12px 8px",

                    textAlign:
                      "center",

                    borderLeft:
                      "1px solid var(--border)",

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
                      display:
                        "block",

                      fontSize:
                        isMobile
                          ? 11
                          : 14,

                      lineHeight:
                        1,

                      textTransform:
                        "capitalize",
                    }}
                  >
                    {isMobile
                      ? compactMobileWeek
                        ? getMobileWeekdayLabel(
                            day
                          )
                        : day.toLocaleDateString(
                            "es-ES",
                            {
                              weekday:
                                "long",
                            }
                          )
                      : day.toLocaleDateString(
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
                        4,

                      fontSize:
                        isMobile
                          ? 11
                          : 13,

                      lineHeight:
                        1,
                    }}
                  >
                    {isMobile
                      ? compactMobileWeek
                        ? day.getDate()
                        : day.toLocaleDateString(
                            "es-ES",
                            {
                              day:
                                "numeric",

                              month:
                                "short",
                            }
                          )
                      : day.toLocaleDateString(
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
                className="agendagrid11-row"
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
                  className="agendagrid11-time"
                  style={{
                    padding:
                      isMobile
                        ? "10px 3px"
                        : "10px 8px",

                    fontSize:
                      isMobile
                        ? 10
                        : 13,

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
                        compactMobileWeek={
                          compactMobileWeek
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
                        onDropAt={(
                          selectedDay,
                          selectedMinute
                        ) => {
                          dropAt(
                            selectedDay,
                            selectedMinute
                          );
                        }}
                      />
                    );
                  }
                )}
              </div>
            )
          )}
        </div>
      </div>

      <style jsx>{`
        .agendagrid11-scroll {
          border-color: #e5e1e9 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
          scrollbar-color: #c9c2d5 #f5f3f7;
          scrollbar-width: thin;
        }
        .agendagrid11-head {
          border-bottom-color: #ded9e5 !important;
          background: #fbfafc !important;
          box-shadow: 0 3px 12px rgba(31,27,48,.035);
        }
        .agendagrid11-corner {
          background: #fbfafc !important;
          border-right-color: #e2dee7 !important;
        }
        .agendagrid11-day {
          background: #fbfafc !important;
          border-left-color: #e8e5eb !important;
        }
        .agendagrid11-day.is-today {
          position: relative;
          background: #f1edff !important;
          color: var(--accent-dark);
        }
        .agendagrid11-day.is-today::after {
          content: "Hoy";
          display: block;
          width: fit-content;
          margin: 5px auto 0;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--accent);
          color: #fff;
          font-size: 10px;
          font-weight: 850;
          line-height: 1.15;
        }
        .agendagrid11-day strong { font-weight: 850 !important; }
        .agendagrid11-row:nth-child(even) { background: rgba(248,247,250,.45); }
        .agendagrid11-time {
          background: #fbfafc !important;
          border-right-color: #e2dee7 !important;
          border-bottom-color: #ebe8ee !important;
          color: #696473;
          font-variant-numeric: tabular-nums;
        }
        @media (max-width: 768px) {
          .agendagrid11-month { color: var(--accent-dark) !important; font-size: 10px !important; }
          .agendagrid11-day.is-today::after { display: none; }
          .agendagrid11-scroll { border-right: 0 !important; border-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
