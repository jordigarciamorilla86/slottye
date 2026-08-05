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

const FALLBACK_DURATION_MINUTES =
  30;

function bookingDurationMilliseconds(
  booking: AgendaBooking
) {
  if (
    !booking.slots
  ) {
    return (
      FALLBACK_DURATION_MINUTES *
      60 *
      1000
    );
  }

  const start =
    new Date(
      booking.slots.start_at
    ).getTime();

  const end =
    new Date(
      booking.slots.end_at
    ).getTime();

  const duration =
    end -
    start;

  if (
    !Number.isFinite(
      duration
    ) ||
    duration <=
      0
  ) {
    return (
      FALLBACK_DURATION_MINUTES *
      60 *
      1000
    );
  }

  return duration;
}

function createTargetStart(
  day: Date,
  minute: number
) {
  const normalizedMinute =
    Math.max(
      0,
      Math.min(
        24 * 60 -
          1,
        Math.floor(
          minute
        )
      )
    );

  const result =
    new Date(
      day
    );

  result.setHours(
    Math.floor(
      normalizedMinute /
        60
    ),
    normalizedMinute %
      60,
    0,
    0
  );

  return result;
}

function rescheduleErrorMessage(
  message: string
) {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "cuenta está bloqueada"
    ) ||
    normalized.includes(
      "cuenta esta bloqueada"
    )
  ) {
    return "Tu cuenta está bloqueada.";
  }

  if (
    normalized.includes(
      "otra reserva slottye"
    ) ||
    normalized.includes(
      "online booking"
    ) ||
    normalized.includes(
      "otra reserva"
    )
  ) {
    return "El nuevo horario coincide con otra reserva Slottye.";
  }

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
      "already a slot"
    )
  ) {
    return "El nuevo horario coincide con otra disponibilidad.";
  }

  if (
    normalized.includes(
      "ocupado"
    ) ||
    normalized.includes(
      "historial"
    ) ||
    normalized.includes(
      "unique"
    )
  ) {
    return "Ese horario ya está ocupado o contiene historial.";
  }

  if (
    normalized.includes(
      "pasada"
    ) ||
    normalized.includes(
      "past"
    )
  ) {
    return "No puedes mover la reserva a una fecha pasada.";
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
    return "No tienes permisos para reprogramar esta reserva.";
  }

  return (
    message ||
    "No se ha podido reprogramar la reserva."
  );
}

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

  /*
   * Se mantiene AgendaSlot como tipo para no modificar
   * los modales existentes.
   *
   * Cuando se elige una casilla vacía, se crea un destino
   * temporal que nunca se guarda directamente en slots.
   */
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

  /*
   * ============================================================
   * INICIAR REPROGRAMACIÓN
   * ============================================================
   */

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

  /*
   * ============================================================
   * CANCELAR REPROGRAMACIÓN
   * ============================================================
   */

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

  /*
   * ============================================================
   * ELEGIR DESTINO
   * ============================================================
   *
   * Permite escoger:
   *
   * - un minuto exacto dentro de una casilla vacía;
   * - la hora exacta de inicio de una disponibilidad existente.
   *
   * La duración final siempre conserva la duración real de la
   * reserva original.
   * ============================================================
   */

  const chooseRescheduleTarget =
    useCallback(
      (
        day: Date,
        minute: number,
        sourceSlot:
          AgendaSlot |
          null
      ) => {
        if (
          !reschedulingBooking ||
          reschedulingLoading
        ) {
          return;
        }

        if (
          sourceSlot &&
          sourceSlot.status !==
            "AVAILABLE"
        ) {
          setReschedulingError(
            "El horario seleccionado ya no está disponible."
          );

          return;
        }

        const targetStart =
          createTargetStart(
            day,
            minute
          );

        const duration =
          bookingDurationMilliseconds(
            reschedulingBooking
          );

        const targetEnd =
          new Date(
            targetStart.getTime() +
              duration
          );

        if (
          !Number.isFinite(
            targetStart.getTime()
          ) ||
          !Number.isFinite(
            targetEnd.getTime()
          ) ||
          targetEnd <=
            targetStart
        ) {
          setReschedulingError(
            "El nuevo horario no es válido."
          );

          return;
        }

        if (
          targetStart <=
          new Date()
        ) {
          setReschedulingError(
            "No puedes mover la reserva a una fecha pasada."
          );

          return;
        }

        if (
          reschedulingBooking.slots &&
          targetStart.getTime() ===
            new Date(
              reschedulingBooking.slots.start_at
            ).getTime() &&
          targetEnd.getTime() ===
            new Date(
              reschedulingBooking.slots.end_at
            ).getTime()
        ) {
          setReschedulingError(
            "Selecciona un horario diferente."
          );

          return;
        }

        setReschedulingError(
          ""
        );

        setPendingRescheduleSlot({
          id:
            sourceSlot?.id ??
            `empty-${targetStart.toISOString()}`,

          service_id:
            reschedulingBooking.service_id,

          start_at:
            targetStart.toISOString(),

          end_at:
            targetEnd.toISOString(),

          status:
            "AVAILABLE",
        });
      },
      [
        reschedulingBooking,
        reschedulingLoading,
      ]
    );

  /*
   * ============================================================
   * CERRAR CONFIRMACIÓN
   * ============================================================
   */

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

        setReschedulingError(
          ""
        );
      },
      [
        reschedulingLoading,
      ]
    );

  /*
   * ============================================================
   * CONFIRMAR REPROGRAMACIÓN
   * ============================================================
   */

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

        /*
         * La RPC:
         * - acepta una casilla vacía;
         * - acepta una disponibilidad existente;
         * - usa las horas exactas recibidas;
         * - retira completamente la disponibilidad de destino;
         * - no crea disponibilidad en el hueco anterior.
         */
        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "business_move_booking_to_time",
            {
              p_booking_id:
                reschedulingBooking.id,

              p_start_at:
                pendingRescheduleSlot.start_at,

              p_end_at:
                pendingRescheduleSlot.end_at,
            }
          );

        if (
          rpcError
        ) {
          console.error(
            "Error rescheduling booking:",
            rpcError
          );

          setReschedulingError(
            rescheduleErrorMessage(
              rpcError.message
            )
          );

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
    chooseRescheduleTarget,
    closeRescheduleConfirmation,
    confirmRescheduling,
  };
}