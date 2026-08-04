"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  active: boolean;
};

type Slot = {
  id: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

type ManualBooking = {
  id: string;
  business_id: string;
  service_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  start_at: string;
  end_at: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;

  services: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;
};

type BusinessBlock = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type Booking = {
  id: string;
  status: string;
  cancelled_at: string | null;

  profiles: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;

  services: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;

  slots: {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
  } | null;
};

type Props =
  | {
      type: "manual";
      event: ManualBooking;
      services: Service[];
      onClose: () => void;
      onReserveManual?: never;
    }
  | {
      type: "block";
      event: BusinessBlock;
      services: Service[];
      onClose: () => void;
      onReserveManual?: never;
    }
    | {
      type: "booking";
      event: Booking;
      services: Service[];
      onClose: () => void;
  
      onRescheduleBooking?: (
        booking: Booking
      ) => void;
  
      onReserveManual?: never;
    }
  | {
      type: "slot";
      event: Slot;
      services: Service[];
      onClose: () => void;
      onReserveManual: (
        date: Date
      ) => void;
    };

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }
  ).format(
    new Date(value)
  );
}

function minutesBetween(
  start: string,
  end: string
) {
  return Math.round(
    (
      new Date(
        end
      ).getTime() -
      new Date(
        start
      ).getTime()
    ) /
      60000
  );
}

function dateInputValue(
  value: string
) {
  const date =
    new Date(
      value
    );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function timeInputValue(
  value: string
) {
  const date =
    new Date(
      value
    );

  return `${String(
    date.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    date.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
}

export default function AgendaEventModal(
  props: Props
) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * ============================================================
   * EDICIÓN RESERVA MANUAL
   * ============================================================
   */

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const manualEvent =
    props.type ===
    "manual"
      ? props.event
      : null;

  const [
    customerName,
    setCustomerName,
  ] =
    useState(
      manualEvent
        ?.customer_name ??
        ""
    );

  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState(
      manualEvent
        ?.customer_phone ??
        ""
    );

  const [
    customerEmail,
    setCustomerEmail,
  ] =
    useState(
      manualEvent
        ?.customer_email ??
        ""
    );

  const [
    serviceId,
    setServiceId,
  ] =
    useState(
      manualEvent
        ?.service_id ??
        ""
    );

  const [
    bookingDate,
    setBookingDate,
  ] =
    useState(() => {
      if (
        !manualEvent
      ) {
        return "";
      }

      return dateInputValue(
        manualEvent.start_at
      );
    });

  const [
    bookingTime,
    setBookingTime,
  ] =
    useState(() => {
      if (
        !manualEvent
      ) {
        return "";
      }

      return timeInputValue(
        manualEvent.start_at
      );
    });

  const [
    durationMinutes,
    setDurationMinutes,
  ] =
    useState(
      manualEvent
        ? minutesBetween(
            manualEvent.start_at,
            manualEvent.end_at
          )
        : 30
    );

  const [
    notes,
    setNotes,
  ] =
    useState(
      manualEvent
        ?.notes ??
        ""
    );

  /*
   * ============================================================
   * EDICIÓN BLOQUEO
   * ============================================================
   */

  const [
    editingBlock,
    setEditingBlock,
  ] =
    useState(false);

  const blockEvent =
    props.type ===
    "block"
      ? props.event
      : null;

  const [
    blockDate,
    setBlockDate,
  ] =
    useState(() => {
      if (
        !blockEvent
      ) {
        return "";
      }

      return dateInputValue(
        blockEvent.start_at
      );
    });

  const [
    blockTime,
    setBlockTime,
  ] =
    useState(() => {
      if (
        !blockEvent
      ) {
        return "";
      }

      return timeInputValue(
        blockEvent.start_at
      );
    });

  const [
    blockDurationMinutes,
    setBlockDurationMinutes,
  ] =
    useState(
      blockEvent
        ? minutesBetween(
            blockEvent.start_at,
            blockEvent.end_at
          )
        : 30
    );

  const [
    blockReason,
    setBlockReason,
  ] =
    useState(
      blockEvent
        ?.reason ??
        ""
    );

  /*
   * ============================================================
   * EDICIÓN DISPONIBILIDAD
   * ============================================================
   */

  const [
    editingSlot,
    setEditingSlot,
  ] =
    useState(false);

  const slotEvent =
    props.type ===
    "slot"
      ? props.event
      : null;

  const [
    slotServiceId,
    setSlotServiceId,
  ] =
    useState(
      slotEvent
        ?.service_id ??
        ""
    );

  const [
    slotDate,
    setSlotDate,
  ] =
    useState(() => {
      if (
        !slotEvent
      ) {
        return "";
      }

      return dateInputValue(
        slotEvent.start_at
      );
    });

  const [
    slotTime,
    setSlotTime,
  ] =
    useState(() => {
      if (
        !slotEvent
      ) {
        return "";
      }

      return timeInputValue(
        slotEvent.start_at
      );
    });

  const [
    slotDurationMinutes,
    setSlotDurationMinutes,
  ] =
    useState(
      slotEvent
        ? minutesBetween(
            slotEvent.start_at,
            slotEvent.end_at
          )
        : 30
    );

  /*
   * ============================================================
   * SERVICIOS ACTIVOS
   * ============================================================
   */

  const activeServices =
    props.services.filter(
      (service) =>
        service.active
    );

  /*
   * ============================================================
   * COMPROBAR SI LA RESERVA SLOTTYE YA HA EMPEZADO
   * ============================================================
   */

  const bookingHasStarted =
    props.type ===
      "booking" &&
    props.event.slots
      ? new Date(
          props.event.slots.start_at
        ) <= new Date()
      : false;

  /*
   * ============================================================
   * CAMBIAR SERVICIO RESERVA MANUAL
   * ============================================================
   */

  function changeService(
    value: string
  ) {
    setServiceId(
      value
    );

    const service =
      activeServices.find(
        (item) =>
          item.id ===
          value
      );

    if (service) {
      setDurationMinutes(
        service.duration_minutes
      );
    }
  }

  /*
   * ============================================================
   * CAMBIAR SERVICIO DISPONIBILIDAD
   * ============================================================
   */

  function changeSlotService(
    value: string
  ) {
    setSlotServiceId(
      value
    );

    const service =
      activeServices.find(
        (item) =>
          item.id ===
          value
      );

    if (service) {
      setSlotDurationMinutes(
        service.duration_minutes
      );
    }
  }

  /*
   * ============================================================
   * GUARDAR RESERVA MANUAL
   * ============================================================
   */

  async function saveManualBooking(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      props.type !==
      "manual"
    ) {
      return;
    }

    setError("");

    if (
      !customerName.trim()
    ) {
      setError(
        "Introduce el nombre del cliente."
      );

      return;
    }

    if (
      !bookingDate ||
      !bookingTime
    ) {
      setError(
        "Selecciona una fecha y una hora."
      );

      return;
    }

    const [
      year,
      month,
      day,
    ] =
      bookingDate
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      bookingTime
        .split(":")
        .map(Number);

    const startAt =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
      );

    const endAt =
      new Date(
        startAt.getTime() +
          durationMinutes *
            60000
      );

    setLoading(
      true
    );

    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "update_manual_booking",
        {
          p_booking_id:
            props.event.id,

          p_service_id:
            serviceId ||
            null,

          p_customer_name:
            customerName.trim(),

          p_customer_phone:
            customerPhone.trim(),

          p_customer_email:
            customerEmail.trim(),

          p_start_at:
            startAt.toISOString(),

          p_end_at:
            endAt.toISOString(),

          p_notes:
            notes.trim(),
        }
      );

    if (rpcError) {
      console.error(
        "Error updating manual booking:",
        rpcError
      );

      const message =
        rpcError.message
          .toLowerCase();

      if (
        message.includes(
          "online booking"
        )
      ) {
        setError(
          "Ya existe una reserva de Slottye en ese horario."
        );
      } else if (
        message.includes(
          "manual booking"
        )
      ) {
        setError(
          "Ya existe otra reserva manual en ese horario."
        );
      } else {
        setError(
          "No se ha podido modificar la reserva."
        );
      }

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    props.onClose();
  }

  /*
   * ============================================================
   * GUARDAR BLOQUEO MODIFICADO
   * ============================================================
   */

  async function saveBlock(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      props.type !==
      "block"
    ) {
      return;
    }

    setError("");

    if (
      !blockDate ||
      !blockTime
    ) {
      setError(
        "Selecciona una fecha y una hora."
      );

      return;
    }

    if (
      blockDurationMinutes <=
      0
    ) {
      setError(
        "La duración del bloqueo no es válida."
      );

      return;
    }

    const [
      year,
      month,
      day,
    ] =
      blockDate
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      blockTime
        .split(":")
        .map(Number);

    const startAt =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
      );

    const endAt =
      new Date(
        startAt.getTime() +
          blockDurationMinutes *
            60000
      );

    setLoading(
      true
    );

    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "update_agenda_block",
        {
          p_block_id:
            props.event.id,

          p_start_at:
            startAt.toISOString(),

          p_end_at:
            endAt.toISOString(),

          p_reason:
            blockReason.trim(),
        }
      );

    if (rpcError) {
      console.error(
        "Error updating agenda block:",
        rpcError
      );

      const message =
        rpcError.message
          .toLowerCase();

      if (
        message.includes(
          "not authorized"
        )
      ) {
        setError(
          "No tienes permisos para modificar este bloqueo."
        );
      } else if (
        message.includes(
          "block not found"
        )
      ) {
        setError(
          "El bloqueo ya no existe."
        );
      } else if (
        message.includes(
          "invalid block dates"
        )
      ) {
        setError(
          "La fecha o la duración del bloqueo no son válidas."
        );
      } else {
        setError(
          "No se ha podido modificar el bloqueo."
        );
      }

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    props.onClose();
  }

  /*
   * ============================================================
   * GUARDAR DISPONIBILIDAD MODIFICADA
   * ============================================================
   */

  async function saveSlot(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      props.type !==
      "slot"
    ) {
      return;
    }

    setError("");

    if (
      !slotServiceId
    ) {
      setError(
        "Selecciona un servicio."
      );

      return;
    }

    if (
      !slotDate ||
      !slotTime
    ) {
      setError(
        "Selecciona una fecha y una hora."
      );

      return;
    }

    if (
      slotDurationMinutes <=
      0
    ) {
      setError(
        "La duración no es válida."
      );

      return;
    }

    const [
      year,
      month,
      day,
    ] =
      slotDate
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      slotTime
        .split(":")
        .map(Number);

    const startAt =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
      );

    const endAt =
      new Date(
        startAt.getTime() +
          slotDurationMinutes *
            60000
      );

    setLoading(
      true
    );

    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "update_agenda_slot",
        {
          p_slot_id:
            props.event.id,

          p_service_id:
            slotServiceId,

          p_start_at:
            startAt.toISOString(),

          p_end_at:
            endAt.toISOString(),
        }
      );

    if (rpcError) {
      console.error(
        "Error updating agenda slot:",
        rpcError
      );

      const message =
        rpcError.message
          .toLowerCase();

      if (
        message.includes(
          "online booking"
        )
      ) {
        setError(
          "Ya existe una reserva de Slottye en ese horario."
        );
      } else if (
        message.includes(
          "manual booking"
        )
      ) {
        setError(
          "Ya existe una reserva manual en ese horario."
        );
      } else if (
        message.includes(
          "block"
        )
      ) {
        setError(
          "Ese horario está bloqueado."
        );
      } else if (
        message.includes(
          "available slot"
        )
      ) {
        setError(
          "Ya existe otra disponibilidad en ese horario."
        );
      } else if (
        message.includes(
          "invalid service"
        )
      ) {
        setError(
          "El servicio seleccionado no es válido."
        );
      } else if (
        message.includes(
          "only available slots"
        )
      ) {
        setError(
          "Esta disponibilidad ya no puede modificarse."
        );
      } else if (
        message.includes(
          "not authorized"
        )
      ) {
        setError(
          "No tienes permisos para modificar esta disponibilidad."
        );
      } else {
        setError(
          "No se ha podido modificar la disponibilidad."
        );
      }

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    props.onClose();
  }

  /*
   * ============================================================
   * ELIMINAR RESERVA MANUAL
   * ============================================================
   */

  async function deleteManualBooking() {
    if (
      props.type !==
      "manual"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Eliminar esta reserva manual?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(
      true
    );

    setError("");

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "manual_bookings"
        )
        .delete()
        .eq(
          "id",
          props.event.id
        );

    if (deleteError) {
      console.error(
        "Error deleting manual booking:",
        deleteError
      );

      setError(
        "No se ha podido eliminar la reserva manual."
      );

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    props.onClose();
  }

  /*
   * ============================================================
   * ELIMINAR BLOQUEO
   * ============================================================
   */

  async function deleteBlock() {
    if (
      props.type !==
      "block"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Eliminar este bloqueo?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(
      true
    );

    setError("");

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "business_blocks"
        )
        .delete()
        .eq(
          "id",
          props.event.id
        );

    if (deleteError) {
      console.error(
        "Error deleting block:",
        deleteError
      );

      setError(
        "No se ha podido eliminar el bloqueo."
      );

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    props.onClose();
  }

  /*
   * ============================================================
   * ELIMINAR DISPONIBILIDAD
   * ============================================================
   */

  async function deleteSlot() {
    if (
      props.type !==
      "slot"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Eliminar esta disponibilidad? Dejará de aparecer como reservable para los clientes."
      );

    if (!confirmed) {
      return;
    }

    setLoading(
      true
    );

    setError("");

    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "delete_agenda_slot",
        {
          p_slot_id:
            props.event.id,
        }
      );

    if (rpcError) {
      console.error(
        "Error deleting agenda slot:",
        rpcError
      );

      setError(
        "No se ha podido eliminar esta disponibilidad."
      );

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    props.onClose();
  }

  /*
   * ============================================================
   * CANCELAR RESERVA SLOTTYE
   * ============================================================
   */

  async function cancelOnlineBooking() {
    if (
      props.type !==
      "booking"
    ) {
      return;
    }

    if (
      props.event.status !==
      "CONFIRMED"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Seguro que quieres cancelar esta reserva?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    const {
      error:
        cancelError,
    } =
      await supabase.rpc(
        "cancel_booking_by_business",
        {
          p_booking_id:
            props.event.id,
        }
      );

    if (cancelError) {
      console.error(
        "Error cancelling booking:",
        cancelError
      );

      setError(
        cancelError.message ||
          "No se ha podido cancelar la reserva."
      );

      setLoading(false);

      return;
    }

    try {
      const response =
        await fetch(
          "/api/notifications/booking-cancelled",
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
                  props.event.id,
              }),
          }
        );

      if (!response.ok) {
        const result =
          await response
            .json()
            .catch(
              () => null
            );

        console.error(
          "Error enviando cancelación:",
          result
        );
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Error enviando notificación de cancelación:",
        notificationError
      );
    }

    setLoading(false);

    props.onClose();
  }

  /*
   * ============================================================
   * MARCAR RESERVA COMO COMPLETADA
   * ============================================================
   */

  async function completeOnlineBooking() {
    if (
      props.type !==
      "booking"
    ) {
      return;
    }

    if (
      props.event.status !==
      "CONFIRMED"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Marcar esta cita como completada?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    const {
      error:
        completeError,
    } =
      await supabase.rpc(
        "complete_booking",
        {
          p_booking_id:
            props.event.id,
        }
      );

    if (completeError) {
      console.error(
        "Error completing booking:",
        completeError
      );

      setError(
        completeError.message ||
          "No se ha podido marcar la reserva como completada."
      );

      setLoading(false);

      return;
    }

    setLoading(false);

    props.onClose();
  }

  /*
   * ============================================================
   * MARCAR NO PRESENTADO
   * ============================================================
   */

  async function noShowOnlineBooking() {
    if (
      props.type !==
      "booking"
    ) {
      return;
    }

    if (
      props.event.status !==
      "CONFIRMED"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Marcar que el cliente no se presentó?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    const {
      error:
        noShowError,
    } =
      await supabase.rpc(
        "no_show_booking",
        {
          p_booking_id:
            props.event.id,
        }
      );

    if (noShowError) {
      console.error(
        "Error marking booking as no-show:",
        noShowError
      );

      setError(
        noShowError.message ||
          "No se ha podido marcar la reserva como no presentada."
      );

      setLoading(false);

      return;
    }

    setLoading(false);

    props.onClose();
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div
      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          1100,

        background:
          "rgba(15, 23, 42, 0.45)",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          20,
      }}
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          props.onClose();
        }
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            560,

          maxHeight:
            "90vh",

          overflowY:
            "auto",

          background:
            "#ffffff",

          borderRadius:
            18,

          padding:
            24,

          boxShadow:
            "0 20px 60px rgba(15, 23, 42, 0.25)",
        }}
      >
        {/* CABECERA */}

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            gap:
              16,

            alignItems:
              "flex-start",
          }}
        >
          <div>
            <div className="kicker">
              Agenda
            </div>

            <h2
              style={{
                margin:
                  "10px 0 4px",
              }}
            >
              {props.type ===
              "manual"
                ? "Reserva manual"
                : props.type ===
                    "block"
                  ? "Horario bloqueado"
                  : props.type ===
                      "slot"
                    ? "Disponibilidad"
                    : "Reserva Slottye"}
            </h2>
          </div>

          <button
            type="button"
            className="btn"
            disabled={
              loading
            }
            onClick={
              props.onClose
            }
          >
            ✕
          </button>
        </div>

        {/* ==================================================
            RESERVA MANUAL
            ================================================== */}

        {props.type ===
          "manual" &&
          !editing && (
            <div
              style={{
                marginTop:
                  22,
              }}
            >
              <p>
                <strong>
                  Cliente:
                </strong>{" "}
                {
                  props.event
                    .customer_name
                }
              </p>

              {props.event
                .customer_phone && (
                <p>
                  <strong>
                    Teléfono:
                  </strong>{" "}
                  {
                    props.event
                      .customer_phone
                  }
                </p>
              )}

              {props.event
                .customer_email && (
                <p>
                  <strong>
                    Email:
                  </strong>{" "}
                  {
                    props.event
                      .customer_email
                  }
                </p>
              )}

              <p>
                <strong>
                  Servicio:
                </strong>{" "}
                {props.event
                  .services
                  ?.name ??
                  "Sin servicio"}
              </p>

              <p>
                <strong>
                  Inicio:
                </strong>{" "}
                {formatDateTime(
                  props.event
                    .start_at
                )}
              </p>

              <p>
                <strong>
                  Fin:
                </strong>{" "}
                {formatDateTime(
                  props.event
                    .end_at
                )}
              </p>

              {props.event
                .notes && (
                <div
                  style={{
                    marginTop:
                      16,

                    padding:
                      "12px 14px",

                    background:
                      "#f8fafc",

                    borderRadius:
                      12,
                  }}
                >
                  <strong>
                    Notas
                  </strong>

                  <div
                    style={{
                      marginTop:
                        5,
                    }}
                  >
                    {
                      props.event
                        .notes
                    }
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop:
                    22,

                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    setEditing(
                      true
                    )
                  }
                >
                  ✏️ Modificar
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={
                    deleteManualBooking
                  }
                  style={{
                    color:
                      "#b91c1c",

                    borderColor:
                      "#fecaca",
                  }}
                >
                  Eliminar reserva
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={
                    props.onClose
                  }
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        {/* ==================================================
            EDITAR RESERVA MANUAL
            ================================================== */}

        {props.type ===
          "manual" &&
          editing && (
            <form
              onSubmit={
                saveManualBooking
              }
              style={{
                marginTop:
                  22,
              }}
            >
              <label>
                <strong>
                  Cliente *
                </strong>

                <input
                  required
                  value={
                    customerName
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomerName(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </label>

              <label>
                <strong>
                  Teléfono
                </strong>

                <input
                  value={
                    customerPhone
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomerPhone(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </label>

              <label>
                <strong>
                  Email
                </strong>

                <input
                  type="email"
                  value={
                    customerEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomerEmail(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </label>

              <label>
                <strong>
                  Servicio
                </strong>

                <select
                  value={
                    serviceId
                  }
                  onChange={(
                    event
                  ) =>
                    changeService(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="">
                    Sin servicio
                  </option>

                  {activeServices.map(
                    (
                      service
                    ) => (
                      <option
                        key={
                          service.id
                        }
                        value={
                          service.id
                        }
                      >
                        {
                          service.name
                        }{" "}
                        ·{" "}
                        {
                          service.duration_minutes
                        }{" "}
                        min
                      </option>
                    )
                  )}
                </select>
              </label>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 1fr",

                  gap:
                    10,
                }}
              >
                <label>
                  <strong>
                    Fecha
                  </strong>

                  <input
                    type="date"
                    required
                    value={
                      bookingDate
                    }
                    onChange={(
                      event
                    ) =>
                      setBookingDate(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label>
                  <strong>
                    Hora
                  </strong>

                  <input
                    type="time"
                    required
                    step={1800}
                    value={
                      bookingTime
                    }
                    onChange={(
                      event
                    ) =>
                      setBookingTime(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </label>
              </div>

              <label>
                <strong>
                  Duración
                </strong>

                <select
                  value={
                    durationMinutes
                  }
                  onChange={(
                    event
                  ) =>
                    setDurationMinutes(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value={30}>
                    30 minutos
                  </option>

                  <option value={60}>
                    1 hora
                  </option>

                  <option value={90}>
                    1 hora 30 minutos
                  </option>

                  <option value={120}>
                    2 horas
                  </option>

                  <option value={150}>
                    2 horas 30 minutos
                  </option>

                  <option value={180}>
                    3 horas
                  </option>
                </select>
              </label>

              <label>
                <strong>
                  Notas
                </strong>

                <textarea
                  rows={3}
                  value={
                    notes
                  }
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event
                        .target
                        .value
                    )
                  }
                  style={{
                    ...inputStyle,

                    resize:
                      "vertical",
                  }}
                />
              </label>

              {error && (
                <ErrorMessage
                  message={
                    error
                  }
                />
              )}

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    setError(
                      ""
                    );

                    setEditing(
                      false
                    );
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

        {/* ==================================================
            DISPONIBILIDAD - VISTA
            ================================================== */}

        {props.type ===
          "slot" &&
          !editingSlot && (
            <div
              style={{
                marginTop:
                  22,
              }}
            >
              <p>
                <strong>
                  Servicio:
                </strong>{" "}
                {props.services.find(
                  (service) =>
                    service.id ===
                    props.event
                      .service_id
                )?.name ??
                  "Servicio"}
              </p>

              <p>
                <strong>
                  Inicio:
                </strong>{" "}
                {formatDateTime(
                  props.event
                    .start_at
                )}
              </p>

              <p>
                <strong>
                  Fin:
                </strong>{" "}
                {formatDateTime(
                  props.event
                    .end_at
                )}
              </p>

              <p>
                <strong>
                  Duración:
                </strong>{" "}
                {minutesBetween(
                  props.event
                    .start_at,
                  props.event
                    .end_at
                )}{" "}
                minutos
              </p>

              <div
                style={{
                  padding:
                    "12px 14px",

                  background:
                    "#f0fdf4",

                  border:
                    "1px solid #bbf7d0",

                  borderRadius:
                    12,

                  marginTop:
                    16,

                  fontSize:
                    13,
                }}
              >
                Este hueco está publicado y puede ser reservado por un cliente.
              </div>

              <div
                style={{
                  marginTop:
                    22,

                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    setError(
                      ""
                    );

                    setEditingSlot(
                      true
                    );
                  }}
                >
                  ✏️ Modificar
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    props.onReserveManual(
                      new Date(
                        props.event
                          .start_at
                      )
                    )
                  }
                >
                  👤 Reservar manualmente
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={
                    deleteSlot
                  }
                  style={{
                    color:
                      "#b91c1c",

                    borderColor:
                      "#fecaca",
                  }}
                >
                  {loading
                    ? "Eliminando..."
                    : "Eliminar disponibilidad"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={
                    props.onClose
                  }
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        {/* ==================================================
            DISPONIBILIDAD - EDITAR
            ================================================== */}

        {props.type ===
          "slot" &&
          editingSlot && (
            <form
              onSubmit={
                saveSlot
              }
              style={{
                marginTop:
                  22,
              }}
            >
              <p className="muted">
                Modifica el servicio y el horario de esta disponibilidad.
              </p>

              <label>
                <strong>
                  Servicio
                </strong>

                <select
                  required
                  value={
                    slotServiceId
                  }
                  onChange={(
                    event
                  ) =>
                    changeSlotService(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="">
                    Selecciona un servicio
                  </option>

                  {activeServices.map(
                    (
                      service
                    ) => (
                      <option
                        key={
                          service.id
                        }
                        value={
                          service.id
                        }
                      >
                        {
                          service.name
                        }{" "}
                        ·{" "}
                        {
                          service.duration_minutes
                        }{" "}
                        min
                      </option>
                    )
                  )}
                </select>
              </label>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 1fr",

                  gap:
                    10,
                }}
              >
                <label>
                  <strong>
                    Fecha
                  </strong>

                  <input
                    type="date"
                    required
                    value={
                      slotDate
                    }
                    onChange={(
                      event
                    ) =>
                      setSlotDate(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label>
                  <strong>
                    Hora
                  </strong>

                  <input
                    type="time"
                    required
                    step={1800}
                    value={
                      slotTime
                    }
                    onChange={(
                      event
                    ) =>
                      setSlotTime(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </label>
              </div>

              <label>
                <strong>
                  Duración
                </strong>

                <select
                  value={
                    slotDurationMinutes
                  }
                  onChange={(
                    event
                  ) =>
                    setSlotDurationMinutes(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value={30}>
                    30 minutos
                  </option>

                  <option value={60}>
                    1 hora
                  </option>

                  <option value={90}>
                    1 hora 30 minutos
                  </option>

                  <option value={120}>
                    2 horas
                  </option>

                  <option value={150}>
                    2 horas 30 minutos
                  </option>

                  <option value={180}>
                    3 horas
                  </option>

                  <option value={240}>
                    4 horas
                  </option>

                  <option value={300}>
                    5 horas
                  </option>

                  <option value={360}>
                    6 horas
                  </option>
                </select>
              </label>

              <div
                style={{
                  padding:
                    "12px 14px",

                  marginBottom:
                    16,

                  background:
                    "#f0fdf4",

                  border:
                    "1px solid #bbf7d0",

                  borderRadius:
                    12,

                  fontSize:
                    13,
                }}
              >
                No podrás guardar la disponibilidad si se solapa con una reserva, un bloqueo u otra disponibilidad.
              </div>

              {error && (
                <ErrorMessage
                  message={
                    error
                  }
                />
              )}

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    setError(
                      ""
                    );

                    setEditingSlot(
                      false
                    );
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

        {/* ==================================================
            BLOQUEO - VISTA
            ================================================== */}

        {props.type ===
          "block" &&
          !editingBlock && (
            <div
              style={{
                marginTop:
                  22,
              }}
            >
              <p>
                <strong>
                  Inicio:
                </strong>{" "}
                {formatDateTime(
                  props.event
                    .start_at
                )}
              </p>

              <p>
                <strong>
                  Fin:
                </strong>{" "}
                {formatDateTime(
                  props.event
                    .end_at
                )}
              </p>

              <p>
                <strong>
                  Duración:
                </strong>{" "}
                {minutesBetween(
                  props.event
                    .start_at,
                  props.event
                    .end_at
                )}{" "}
                minutos
              </p>

              <p>
                <strong>
                  Motivo:
                </strong>{" "}
                {props.event
                  .reason ??
                  "Sin motivo"}
              </p>

              <div
                style={{
                  marginTop:
                    22,

                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    setError(
                      ""
                    );

                    setEditingBlock(
                      true
                    );
                  }}
                >
                  ✏️ Modificar
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={
                    deleteBlock
                  }
                  style={{
                    color:
                      "#b91c1c",

                    borderColor:
                      "#fecaca",
                  }}
                >
                  {loading
                    ? "Eliminando..."
                    : "Eliminar bloqueo"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={
                    props.onClose
                  }
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        {/* ==================================================
            BLOQUEO - EDITAR
            ================================================== */}

        {props.type ===
          "block" &&
          editingBlock && (
            <form
              onSubmit={
                saveBlock
              }
              style={{
                marginTop:
                  22,
              }}
            >
              <p className="muted">
                Modifica el periodo bloqueado y su motivo.
              </p>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 1fr",

                  gap:
                    10,
                }}
              >
                <label>
                  <strong>
                    Fecha
                  </strong>

                  <input
                    type="date"
                    required
                    value={
                      blockDate
                    }
                    onChange={(
                      event
                    ) =>
                      setBlockDate(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label>
                  <strong>
                    Hora
                  </strong>

                  <input
                    type="time"
                    required
                    step={1800}
                    value={
                      blockTime
                    }
                    onChange={(
                      event
                    ) =>
                      setBlockTime(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </label>
              </div>

              <label>
                <strong>
                  Duración
                </strong>

                <select
                  value={
                    blockDurationMinutes
                  }
                  onChange={(
                    event
                  ) =>
                    setBlockDurationMinutes(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value={30}>
                    30 minutos
                  </option>

                  <option value={60}>
                    1 hora
                  </option>

                  <option value={90}>
                    1 hora 30 minutos
                  </option>

                  <option value={120}>
                    2 horas
                  </option>

                  <option value={150}>
                    2 horas 30 minutos
                  </option>

                  <option value={180}>
                    3 horas
                  </option>

                  <option value={240}>
                    4 horas
                  </option>

                  <option value={300}>
                    5 horas
                  </option>

                  <option value={360}>
                    6 horas
                  </option>
                </select>
              </label>

              <label>
                <strong>
                  Motivo
                </strong>

                <input
                  value={
                    blockReason
                  }
                  onChange={(
                    event
                  ) =>
                    setBlockReason(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Reunión, comida, cierre, cita externa..."
                  style={
                    inputStyle
                  }
                />
              </label>

              <div
                style={{
                  padding:
                    "12px 14px",

                  marginBottom:
                    16,

                  border:
                    "1px solid #fecaca",

                  borderRadius:
                    12,

                  background:
                    "#fef2f2",

                  fontSize:
                    13,
                }}
              >
                Los slots disponibles que coincidan con el nuevo periodo dejarán de estar disponibles para los clientes.
              </div>

              {error && (
                <ErrorMessage
                  message={
                    error
                  }
                />
              )}

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    setError(
                      ""
                    );

                    setEditingBlock(
                      false
                    );
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

        {/* ==================================================
            RESERVA SLOTTYE
            ================================================== */}

        {props.type ===
          "booking" && (
            <div
              style={{
                marginTop:
                  22,
              }}
            >
              <p>
                <strong>
                  Cliente:
                </strong>{" "}
                {props.event
                  .profiles
                  ?.name ??
                  "Cliente"}
              </p>

              {props.event
                .profiles
                ?.email && (
                <p>
                  <strong>
                    Email:
                  </strong>{" "}
                  {
                    props.event
                      .profiles
                      .email
                  }
                </p>
              )}

              <p>
                <strong>
                  Servicio:
                </strong>{" "}
                {props.event
                  .services
                  ?.name ??
                  "Servicio"}
              </p>

              {props.event
                .slots && (
                <>
                  <p>
                    <strong>
                      Inicio:
                    </strong>{" "}
                    {formatDateTime(
                      props.event
                        .slots
                        .start_at
                    )}
                  </p>

                  <p>
                    <strong>
                      Fin:
                    </strong>{" "}
                    {formatDateTime(
                      props.event
                        .slots
                        .end_at
                    )}
                  </p>
                </>
              )}

              <p>
                <strong>
                  Estado:
                </strong>{" "}
                {props.event
                  .status ===
                "CONFIRMED"
                  ? "Confirmada"
                  : props.event
                        .status ===
                      "CANCELLED_BY_USER"
                    ? "Cancelada por el cliente"
                    : props.event
                          .status ===
                        "CANCELLED_BY_BUSINESS"
                      ? "Cancelada por el negocio"
                      : props.event
                          .status}
              </p>

              {props.event
                .status ===
                "CONFIRMED" && (
                <div
                  style={{
                    marginTop:
                      16,

                    padding:
                      "12px 14px",

                    background:
                      "#fef2f2",

                    border:
                      "1px solid #fecaca",

                    borderRadius:
                      12,

                    fontSize:
                      13,
                  }}
                >
                  Si cancelas la reserva, el cliente recibirá el aviso de cancelación.
                </div>
              )}

              {error && (
                <ErrorMessage
                  message={
                    error
                  }
                />
              )}
              
              <div
                style={{
                  marginTop:
                    22,

                  display:
                    "flex",

                  gap:
                    10,

                  flexWrap:
                    "wrap",
                }}
              >

               {/* ================================================
    REPROGRAMAR RESERVA
    ================================================ */}

{props.event.status ===
  "CONFIRMED" &&
  props.event.slots &&
  new Date(
    props.event.slots.start_at
  ) > new Date() &&
  props.onRescheduleBooking && (
    <button
      type="button"
      className="btn primary"
      disabled={
        loading
      }
      onClick={() =>
        props.onRescheduleBooking?.(
          props.event
        )
      }
    >
      ✏️ Reprogramar
    </button>
  )}

                {props.event.status ===
                  "CONFIRMED" &&
                  bookingHasStarted && (
                    <>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={
                          loading
                        }
                        onClick={
                          completeOnlineBooking
                        }
                      >
                        {loading
                          ? "Procesando..."
                          : "Marcar completada"}
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          loading
                        }
                        onClick={
                          noShowOnlineBooking
                        }
                      >
                        {loading
                          ? "Procesando..."
                          : "No se presentó"}
                      </button>
                    </>
                  )}

                {props.event.status ===
                  "CONFIRMED" && (
                  <button
                    type="button"
                    className="btn"
                    disabled={
                      loading
                    }
                    onClick={
                      cancelOnlineBooking
                    }
                    style={{
                      color:
                        "#b91c1c",

                      borderColor:
                        "#fecaca",
                    }}
                  >
                    {loading
                      ? "Cancelando..."
                      : "Cancelar reserva"}
                  </button>
                )}

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={
                    props.onClose
                  }
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        {error &&
          !editing &&
          !editingBlock &&
          !editingSlot &&
          props.type !==
            "booking" && (
            <ErrorMessage
              message={
                error
              }
            />
          )}
      </div>
    </div>
  );
}

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="alert"
      style={{
        marginTop:
          16,

        marginBottom:
          16,

        padding:
          "12px 14px",

        borderRadius:
          12,

        background:
          "#fef2f2",

        color:
          "#b91c1c",

        border:
          "1px solid #fecaca",

        fontWeight:
          600,

        fontSize:
          14,
      }}
    >
      ⚠️ {message}
    </div>
  );
}

const inputStyle = {
  width:
    "100%",

  padding:
    13,

  border:
    "1px solid var(--border)",

  borderRadius:
    12,

  marginTop:
    8,

  marginBottom:
    14,

  background:
    "#ffffff",

  color:
    "var(--text)",

  font:
    "inherit",
};