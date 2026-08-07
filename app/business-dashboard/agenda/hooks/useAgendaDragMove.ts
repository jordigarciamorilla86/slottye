"use client";

import {
  useCallback,
  useState,
} from "react";

import type {
  AgendaCellEvent,
  AgendaPendingMove,
} from "../types/agenda";

type Props = {
  businessId: string;
  reloadAgenda: () => Promise<void>;
};

function durationMilliseconds(
  event: AgendaCellEvent
) {
  return (
    new Date(
      event.endAt
    ).getTime() -
    new Date(
      event.startAt
    ).getTime()
  );
}

function errorMessage(
  message: string
) {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "reserva manual"
    ) ||
    normalized.includes(
      "manual booking"
    )
  ) {
    return "El nuevo horario coincide con una reserva manual.";
  }

  if (
    normalized.includes(
      "otra reserva"
    ) ||
    normalized.includes(
      "online booking"
    ) ||
    normalized.includes(
      "reserva slottye"
    )
  ) {
    return "El nuevo horario coincide con otra reserva.";
  }

  if (
    normalized.includes(
      "bloqueo"
    ) ||
    normalized.includes(
      "block"
    )
  ) {
    return "El nuevo horario coincide con un bloqueo.";
  }

  if (
    normalized.includes(
      "disponibilidad"
    ) ||
    normalized.includes(
      "available slot"
    ) ||
    normalized.includes(
      "slot in this period"
    ) ||
    normalized.includes(
      "already a slot"
    )
  ) {
    return "El nuevo horario coincide con otra disponibilidad.";
  }

  if (
    normalized.includes(
      "bookings_slot_id_fkey"
    ) ||
    normalized.includes(
      "foreign key constraint"
    )
  ) {
    return "No se ha podido liberar el horario anterior de la reserva.";
  }

  if (
    normalized.includes(
      "pasada"
    ) ||
    normalized.includes(
      "past"
    )
  ) {
    return "No puedes mover el evento a una fecha pasada.";
  }

  if (
    normalized.includes(
      "permis"
    ) ||
    normalized.includes(
      "authorized"
    ) ||
    normalized.includes(
      "not authenticated"
    )
  ) {
    return "No tienes permisos para mover este evento.";
  }

  return (
    message ||
    "No se ha podido mover el evento."
  );
}

export default function useAgendaDragMove({
  businessId,
  reloadAgenda,
}: Props) {
  const [
    draggedEvent,
    setDraggedEvent,
  ] =
    useState<
      AgendaCellEvent |
      null
    >(
      null
    );

  const [
    pendingMove,
    setPendingMove,
  ] =
    useState<
      AgendaPendingMove |
      null
    >(
      null
    );

  const [
    moving,
    setMoving,
  ] =
    useState(false);

  const [
    moveError,
    setMoveError,
  ] =
    useState("");

  /*
   * ============================================================
   * INICIAR ARRASTRE
   * ============================================================
   */

  const startDragging =
    useCallback(
      (
        event:
          AgendaCellEvent
      ) => {
        setMoveError(
          ""
        );

        setDraggedEvent(
          event
        );
      },
      []
    );

  /*
   * ============================================================
   * FINALIZAR ARRASTRE
   * ============================================================
   */

  const finishDragging =
    useCallback(
      () => {
        setDraggedEvent(
          null
        );
      },
      []
    );

  /*
   * ============================================================
   * SOLTAR EVENTO
   * ============================================================
   */

  const dropAt =
    useCallback(
      (
        day:
          Date,
        minute:
          number
      ) => {
        if (
          !draggedEvent
        ) {
          return;
        }

        const targetStart =
          new Date(
            day
          );

        targetStart.setHours(
          Math.floor(
            minute /
              60
          ),
          minute %
            60,
          0,
          0
        );

        const targetEnd =
          new Date(
            targetStart.getTime() +
              durationMilliseconds(
                draggedEvent
              )
          );

        if (
          targetStart.getTime() ===
          new Date(
            draggedEvent.startAt
          ).getTime()
        ) {
          setDraggedEvent(
            null
          );

          return;
        }

        if (
          targetEnd <=
          new Date()
        ) {
          setMoveError(
            "No puedes mover el evento completamente al pasado."
          );

          setDraggedEvent(
            null
          );

          return;
        }

        setPendingMove({
          event:
            draggedEvent,

          targetStartAt:
            targetStart.toISOString(),

          targetEndAt:
            targetEnd.toISOString(),
        });

        setDraggedEvent(
          null
        );
      },
      [
        draggedEvent,
      ]
    );

  /*
   * ============================================================
   * CANCELAR MOVIMIENTO
   * ============================================================
   */

  const cancelPendingMove =
    useCallback(
      () => {
        if (
          moving
        ) {
          return;
        }

        setPendingMove(
          null
        );

        setMoveError(
          ""
        );
      },
      [
        moving,
      ]
    );

  /*
   * ============================================================
   * CONFIRMAR MOVIMIENTO
   * ============================================================
   */

  const confirmMove =
    useCallback(
      async () => {
        if (
          !pendingMove
        ) {
          return;
        }

        setMoving(
          true
        );

        setMoveError(
          ""
        );

        const {
          event,
          targetStartAt,
          targetEndAt,
        } =
          pendingMove;

        try {
          /*
           * ======================================================
           * MOVER MEDIANTE API SEGURA
           * ======================================================
           */

          const response =
            await fetch(
              "/api/agenda/move",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    type:
                      event.type,

                    eventId:
                      event.source.id,

                    startAt:
                      targetStartAt,

                    endAt:
                      targetEndAt,
                  }),
              }
            );

          const result =
            await response.json();

          if (
            !response.ok
          ) {
            console.error(
              "Error moving agenda event:",
              result
            );

            setMoveError(
              errorMessage(
                result.error ??
                  "No se ha podido mover el evento."
              )
            );

            await reloadAgenda();

            return;
          }

          /*
           * ======================================================
           * DISPONIBILIDAD MOVIDA
           * ======================================================
           *
           * Si movemos un slot, avisamos a los suscriptores.
           */

          if (
            event.type ===
            "slot"
          ) {
            try {
              const notificationResponse =
                await fetch(
                  "/api/notifications/new-slots",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify({
                        businessId,

                        slotIds: [
                          event.source.id,
                        ],
                      }),
                  }
                );

              if (
                !notificationResponse.ok
              ) {
                console.error(
                  "La disponibilidad se movió, pero no se pudo avisar a los suscriptores:",
                  await notificationResponse.text()
                );
              } else {
                const notificationResult =
                  await notificationResponse.json();

                console.log(
                  "Resultado de notificación de disponibilidad movida:",
                  notificationResult
                );
              }
            } catch (
              notificationError
            ) {
              console.error(
                "Error avisando de la disponibilidad movida:",
                notificationError
              );
            }
          }

          /*
           * ======================================================
           * RESERVA ONLINE MOVIDA
           * ======================================================
           *
           * La modificación ya se ha realizado mediante
           * /api/agenda/move.
           *
           * Esta llamada únicamente gestiona la notificación
           * de reprogramación al cliente.
           */

          if (
            event.type ===
            "booking"
          ) {
            try {
              const notificationResponse =
                await fetch(
                  "/api/business/bookings/rescheduled",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify({
                        bookingId:
                          event.source.id,

                        previousStartAt:
                          event.startAt,

                        previousEndAt:
                          event.endAt,

                        newStartAt:
                          targetStartAt,

                        newEndAt:
                          targetEndAt,
                      }),
                  }
                );

              if (
                !notificationResponse.ok
              ) {
                console.error(
                  "La reserva se movió, pero no se pudo enviar el email:",
                  await notificationResponse.text()
                );
              }
            } catch (
              emailError
            ) {
              console.error(
                "Error enviando el email de reprogramación:",
                emailError
              );
            }
          }

          /*
           * ======================================================
           * FINALIZAR
           * ======================================================
           */

          setPendingMove(
            null
          );

          await reloadAgenda();
        } catch (
          error
        ) {
          console.error(
            "Unexpected agenda move error:",
            error
          );

          setMoveError(
            "No se ha podido mover el evento."
          );

          await reloadAgenda();
        } finally {
          setMoving(
            false
          );
        }
      },
      [
        businessId,
        pendingMove,
        reloadAgenda,
      ]
    );

  return {
    draggedEvent,
    pendingMove,
    moving,
    moveError,
    startDragging,
    finishDragging,
    dropAt,
    cancelPendingMove,
    confirmMove,
  };
}