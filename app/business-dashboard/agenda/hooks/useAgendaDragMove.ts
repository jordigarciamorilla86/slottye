"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

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
    new Date(event.endAt).getTime() -
    new Date(event.startAt).getTime()
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
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

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

  const finishDragging =
    useCallback(
      () => {
        setDraggedEvent(
          null
        );
      },
      []
    );

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
          new Date(day);

        targetStart.setHours(
          Math.floor(
            minute / 60
          ),
          minute % 60,
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

        let rpcError:
          {
            message:
              string;
          } |
          null =
          null;

        if (
          event.type ===
          "booking"
        ) {
          const result =
            await supabase.rpc(
              "business_move_booking_to_time",
              {
                p_booking_id:
                  event.source.id,

                p_start_at:
                  targetStartAt,

                p_end_at:
                  targetEndAt,
              }
            );

          rpcError =
            result.error;
        } else if (
          event.type ===
          "manual"
        ) {
          const booking =
            event.source;

          const result =
            await supabase.rpc(
              "update_manual_booking",
              {
                p_booking_id:
                  booking.id,

                p_service_id:
                  booking.service_id,

                p_customer_name:
                  booking.customer_name,

                p_customer_phone:
                  booking.customer_phone ??
                  "",

                p_customer_email:
                  booking.customer_email ??
                  "",

                p_start_at:
                  targetStartAt,

                p_end_at:
                  targetEndAt,

                p_notes:
                  booking.notes ??
                  "",
              }
            );

          rpcError =
            result.error;
        } else if (
          event.type ===
          "block"
        ) {
          const result =
            await supabase.rpc(
              "update_agenda_block",
              {
                p_block_id:
                  event.source.id,

                p_start_at:
                  targetStartAt,

                p_end_at:
                  targetEndAt,

                p_reason:
                  event.source.reason ??
                  "",
              }
            );

          rpcError =
            result.error;
        } else {
          const result =
            await supabase.rpc(
              "update_agenda_slot",
              {
                p_slot_id:
                  event.source.id,

                p_service_id:
                  event.source.service_id,

                p_start_at:
                  targetStartAt,

                p_end_at:
                  targetEndAt,
              }
            );

          rpcError =
            result.error;
        }

        if (
          rpcError
        ) {
          console.error(
            "Error moving agenda event:",
            rpcError
          );

          setMoveError(
            errorMessage(
              rpcError.message
            )
          );

          setMoving(
            false
          );

          await reloadAgenda();

          return;
        }

        if (
          event.type ===
          "slot"
        ) {
          try {
            const response =
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
              !response.ok
            ) {
              console.error(
                "La disponibilidad se movió, pero no se pudo avisar a los suscriptores:",
                await response.text()
              );
            }else {
              const result =
                await response.json();
            
              console.log(
                "Resultado de notificación de disponibilidad movida:",
                result
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

        if (
          event.type ===
          "booking"
        ) {
          try {
            const response =
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
              !response.ok
            ) {
              console.error(
                "La reserva se movió, pero no se pudo enviar el email:",
                await response.text()
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

        setPendingMove(
          null
        );

        setMoving(
          false
        );

        await reloadAgenda();
      },
      [
        businessId,
        pendingMove,
        reloadAgenda,
        supabase,
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