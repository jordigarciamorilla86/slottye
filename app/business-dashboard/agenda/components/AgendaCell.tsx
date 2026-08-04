"use client";

import {
  type DragEvent,
  useState,
} from "react";

import type {
  AgendaCellEvent,
} from "../types/agenda";

type Props = {
  day: Date;
  minute: number;
  open: boolean;
  event: AgendaCellEvent | null;
  currentTime: Date;
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

const SLOT_MINUTES = 30;
const ROW_HEIGHT = 58;

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

export default function AgendaCell({
  day,
  minute,
  open,
  event,
  currentTime,
  dragEnabled,
  draggingEvent,
  onOpenEvent,
  onOpenEmptySlot,
  onStartDragging,
  onFinishDragging,
  onDropAt,
}: Props) {
  const [
    dragOver,
    setDragOver,
  ] =
    useState(false);

  const currentMinutes =
    currentTime.getHours() *
      60 +
    currentTime.getMinutes();

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

  const cellStart =
    new Date(day);

  cellStart.setHours(
    Math.floor(
      minute / 60
    ),
    minute % 60,
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

  const isEventStart =
    event
      ? new Date(
          event.startAt
        ).getTime() >=
          cellStart.getTime() &&
        new Date(
          event.startAt
        ).getTime() <
          cellEnd.getTime()
      : false;

  const isEventEnd =
    event
      ? new Date(
          event.endAt
        ).getTime() >
          cellStart.getTime() &&
        new Date(
          event.endAt
        ).getTime() <=
          cellEnd.getTime()
      : false;

  const eventDurationMinutes =
    event
      ? (
          new Date(
            event.endAt
          ).getTime() -
          new Date(
            event.startAt
          ).getTime()
        ) /
        60000
      : 0;

  const compactEvent =
    eventDurationMinutes <=
    30;

  const completedBooking =
    Boolean(
      event?.type ===
        "booking" &&
      event.source.status ===
        "COMPLETED"
    );

  const draggableEvent =
    Boolean(
      dragEnabled &&
      isEventStart &&
      event &&
      !completedBooking
    );

  const dropTargetActive =
    Boolean(
      draggingEvent
    );

  let background:
    string;

  if (
    event?.type ===
    "booking"
  ) {
    background =
      completedBooking
        ? "#f3f4f6"
        : "#f3e8ff";
  } else if (
    event?.type ===
    "manual"
  ) {
    background =
      "#eff6ff";
  } else if (
    event?.type ===
    "block"
  ) {
    background =
      "#fef2f2";
  } else if (
    event?.type ===
    "slot"
  ) {
    background =
      "#f0fdf4";
  } else if (
    !open
  ) {
    background =
      "#f8fafc";
  } else {
    background =
      "#ffffff";
  }

  let eventBorderColor =
    "transparent";

  if (
    event?.type ===
    "slot"
  ) {
    eventBorderColor =
      "#bbf7d0";
  } else if (
    event?.type ===
    "booking"
  ) {
    eventBorderColor =
      completedBooking
        ? "#9ca3af"
        : "#e9d5ff";
  } else if (
    event?.type ===
    "manual"
  ) {
    eventBorderColor =
      "#bfdbfe";
  } else if (
    event?.type ===
    "block"
  ) {
    eventBorderColor =
      "#fecaca";
  }

  function handleDragStart(
    dragEvent:
      DragEvent<HTMLButtonElement>
  ) {
    if (
      !draggableEvent ||
      !event
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

  function handleDragOver(
    dragEvent:
      DragEvent<HTMLElement>
  ) {
    if (
      !dropTargetActive
    ) {
      return;
    }

    dragEvent.preventDefault();

    dragEvent.dataTransfer.dropEffect =
      "move";

    setDragOver(
      true
    );
  }

  function handleDragLeave(
    dragEvent:
      DragEvent<HTMLElement>
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

    setDragOver(
      false
    );
  }

  function handleDrop(
    dragEvent:
      DragEvent<HTMLElement>
  ) {
    if (
      !dropTargetActive
    ) {
      return;
    }

    dragEvent.preventDefault();

    setDragOver(
      false
    );

    onDropAt(
      day,
      minute
    );
  }

  return (
    <div
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

        paddingTop:
          event &&
          !isEventStart
            ? 0
            : 6,

        paddingBottom:
          event &&
          !isEventEnd
            ? 0
            : 6,

        paddingLeft:
          6,

        paddingRight:
          6,

        borderLeft:
          "1px solid var(--border)",

        borderBottom:
          event &&
          !isEventEnd
            ? "none"
            : "1px solid var(--border)",

        background:
          dragOver
            ? "#dcfce7"
            : background,

        boxShadow:
          dragOver
            ? "inset 0 0 0 3px #16a34a"
            : "none",

        transition:
          "background 0.12s ease, box-shadow 0.12s ease",
      }}
    >
      {event ? (
        <button
          type="button"
          title={
            completedBooking
              ? "Reserva completada"
              : draggableEvent
                ? "Arrastrar para mover"
                : event.type ===
                    "slot"
                  ? "Pulsar para gestionar"
                  : "Pulsar para ver"
          }
          draggable={
            draggableEvent
          }
          onDragStart={
            handleDragStart
          }
          onDragEnd={() => {
            setDragOver(
              false
            );

            onFinishDragging();
          }}
          onClick={() => {
            onOpenEvent(
              event
            );
          }}
          style={{
            width:
              "100%",

            height:
              event
                ? `calc(100% + ${
                    !isEventStart
                      ? 1
                      : 0
                  }px + ${
                    !isEventEnd
                      ? 1
                      : 0
                  }px)`
                : "100%",

            marginTop:
              event &&
              !isEventStart
                ? -1
                : 0,

            marginBottom:
              event &&
              !isEventEnd
                ? -1
                : 0,

            position:
              "relative",

            zIndex:
              2,

            borderLeft:
              `1px solid ${eventBorderColor}`,

            borderRight:
              `1px solid ${eventBorderColor}`,

            borderTop:
              isEventStart
                ? `1px solid ${eventBorderColor}`
                : "none",

            borderBottom:
              isEventEnd
                ? `1px solid ${eventBorderColor}`
                : "none",

            borderTopLeftRadius:
              isEventStart
                ? 10
                : 0,

            borderTopRightRadius:
              isEventStart
                ? 10
                : 0,

            borderBottomLeftRadius:
              isEventEnd
                ? 10
                : 0,

            borderBottomRightRadius:
              isEventEnd
                ? 10
                : 0,

            background,

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

            transform:
              "none",

            transition:
              "box-shadow 0.12s ease, transform 0.12s ease, opacity 0.12s ease",

            textAlign:
              "left",

            padding:
              compactEvent
                ? "5px 8px"
                : isEventStart
                  ? "6px 8px"
                  : "2px 8px",

            color:
              "inherit",

            font:
              "inherit",

            overflow:
              "hidden",
          }}
        >
          {isEventStart && (
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

              {completedBooking &&
                !compactEvent && (
                <div
                  style={{
                    marginTop:
                      3,

                    fontSize:
                      10,

                    fontWeight:
                      800,

                    color:
                      "#4b5563",
                  }}
                >
                  ✓ COMPLETADA
                </div>
              )}

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
      ) : (
        <button
          type="button"
          onClick={() => {
            onOpenEmptySlot(
              day,
              minute
            );
          }}
          style={{
            width:
              "100%",

            height:
              "100%",

            minHeight:
              44,

            border:
              "1px dashed var(--border)",

            borderRadius:
              10,

            background:
              "transparent",

            cursor:
              "pointer",

            color:
              "var(--muted)",

            opacity:
              open
                ? 1
                : 0.65,

            fontSize:
              open
                ? 18
                : 10,

            padding:
              "2px 4px",
          }}
          title={
            open
              ? "Crear disponibilidad, reserva manual o bloqueo"
              : "Crear una excepción fuera del horario habitual"
          }
        >
          {open ? (
            "+"
          ) : (
            <>
              <span
                style={{
                  fontSize:
                    16,

                  marginRight:
                    4,
                }}
              >
                +
              </span>

              Fuera de horario
            </>
          )}
        </button>
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
        >
          <div
            style={{
              position:
                "absolute",

              left:
                -4,

              top:
                -3,

              width:
                8,

              height:
                8,

              borderRadius:
                "50%",

              background:
                "#ef4444",
            }}
          />
        </div>
      )}
    </div>
  );
}