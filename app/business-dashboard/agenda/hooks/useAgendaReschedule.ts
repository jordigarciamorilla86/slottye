"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import type {
  AgendaBooking,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  reloadAgenda: () => Promise<void>;
  prepareInterface: () => void;
};

export default function useAgendaReschedule({
  reloadAgenda,
  prepareInterface,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    reschedulingBooking,
    setReschedulingBooking,
  ] =
    useState<
      AgendaBooking |
      null
    >(
      null
    );

  const [
    pendingRescheduleSlot,
    setPendingRescheduleSlot,
  ] =
    useState<
      AgendaSlot |
      null
    >(
      null
    );

  const [
    reschedulingLoading,
    setReschedulingLoading,
  ] =
    useState(false);

  const [
    reschedulingError,
    setReschedulingError,
  ] =
    useState("");

  const startRescheduling =
    useCallback(
      (
        booking:
          AgendaBooking
      ) => {
        if (
          booking.status !==
            "CONFIRMED" ||
          !booking.slots
        ) {
          return;
        }

        prepareInterface();

        setPendingRescheduleSlot(
          null
        );

        setReschedulingError(
          ""
        );

        setReschedulingBooking(
          booking
        );
      },
      [
        prepareInterface,
      ]
    );

  const cancelRescheduling =
    useCallback(
      () => {
        if (
          reschedulingLoading
        ) {
          return;
        }

        setReschedulingBooking(
          null
        );

        setPendingRescheduleSlot(
          null
        );

        setReschedulingError(
          ""
        );
      },
      [
        reschedulingLoading,
      ]
    );

  const chooseRescheduleSlot =
    useCallback(
      (
        slot:
          AgendaSlot
      ) => {
        if (
          !reschedulingBooking ||
          reschedulingLoading
        ) {
          return;
        }

        if (
          slot.status !==
          "AVAILABLE"
        ) {
          setReschedulingError(
            "El horario seleccionado ya no está disponible."
          );

          return;
        }

        if (
          slot.service_id !==
          reschedulingBooking.service_id
        ) {
          setReschedulingError(
            "Selecciona una disponibilidad del mismo servicio que la reserva."
          );

          return;
        }

        if (
          new Date(
            slot.start_at
          ) <= new Date()
        ) {
          setReschedulingError(
            "No puedes mover la reserva a una fecha pasada."
          );

          return;
        }

        if (
          slot.id ===
          reschedulingBooking.slot_id
        ) {
          setReschedulingError(
            "Selecciona un horario diferente."
          );

          return;
        }

        setReschedulingError(
          ""
        );

        setPendingRescheduleSlot(
          slot
        );
      },
      [
        reschedulingBooking,
        reschedulingLoading,
      ]
    );

  const closeRescheduleConfirmation =
    useCallback(
      () => {
        if (
          reschedulingLoading
        ) {
          return;
        }

        setPendingRescheduleSlot(
          null
        );
      },
      [
        reschedulingLoading,
      ]
    );

  const confirmRescheduling =
    useCallback(
      async () => {
        if (
          !reschedulingBooking ||
          !pendingRescheduleSlot
        ) {
          return;
        }

        setReschedulingLoading(
          true
        );

        setReschedulingError(
          ""
        );

        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "business_reschedule_booking",
            {
              p_booking_id:
                reschedulingBooking.id,

              p_new_slot_id:
                pendingRescheduleSlot.id,
            }
          );

        if (
          rpcError
        ) {
          console.error(
            "Error rescheduling booking:",
            rpcError
          );

          const message =
            rpcError.message
              .toLowerCase();

          if (
            message.includes(
              "ya no está disponible"
            ) ||
            message.includes(
              "slot unavailable"
            )
          ) {
            setReschedulingError(
              "Ese horario ya no está disponible. Selecciona otro."
            );
          } else if (
            message.includes(
              "otro servicio"
            )
          ) {
            setReschedulingError(
              "La nueva disponibilidad debe pertenecer al mismo servicio."
            );
          } else if (
            message.includes(
              "horario bloqueado"
            )
          ) {
            setReschedulingError(
              "El nuevo horario coincide con un bloqueo."
            );
          } else if (
            message.includes(
              "reserva manual"
            )
          ) {
            setReschedulingError(
              "El nuevo horario coincide con una reserva manual."
            );
          } else if (
            message.includes(
              "pasada"
            )
          ) {
            setReschedulingError(
              "No puedes mover la reserva a una fecha pasada."
            );
          } else {
            setReschedulingError(
              rpcError.message ||
                "No se ha podido reprogramar la reserva."
            );
          }

          setPendingRescheduleSlot(
            null
          );

          setReschedulingLoading(
            false
          );

          await reloadAgenda();

          return;
        }

        setPendingRescheduleSlot(
          null
        );

        setReschedulingBooking(
          null
        );

        setReschedulingLoading(
          false
        );

        await reloadAgenda();
      },
      [
        pendingRescheduleSlot,
        reloadAgenda,
        reschedulingBooking,
        supabase,
      ]
    );

  return {
    reschedulingBooking,
    pendingRescheduleSlot,
    reschedulingLoading,
    reschedulingError,
    startRescheduling,
    cancelRescheduling,
    chooseRescheduleSlot,
    closeRescheduleConfirmation,
    confirmRescheduling,
  };
}
