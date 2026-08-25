"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";

import { ConfirmDialog, type ConfirmDialogVariant } from "@/components/ui";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";
import { X } from "lucide-react";
import styles from "./AgendaModal.module.css";



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

function formatDuration(
  minutes: number
) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0 min";
  }

  const wholeMinutes =
    Math.round(minutes);

  const hours =
    Math.floor(
      wholeMinutes / 60
    );

  const remainingMinutes =
    wholeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return hours === 1
      ? "1 h"
      : `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const onDialogKeyDown = useAccessibleDialog({
    open: true,
    onClose: props.onClose,
    dialogRef,
  });

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

  type ConfirmationAction =
    | "delete-manual"
    | "delete-block"
    | "delete-slot"
    | "cancel-booking"
    | "complete-booking"
    | "no-show";
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction | null>(null);

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
  
    if (
      !Number.isInteger(
        durationMinutes
      ) ||
      durationMinutes <=
        0 ||
      durationMinutes >
        1440
    ) {
      setError(
        "Introduce una duración válida entre 1 y 1440 minutos."
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
  
    try {
      const response =
        await fetch(
          "/api/agenda/event",
          {
            method:
              "PATCH",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                type:
                  "manual",
  
                eventId:
                  props.event.id,
  
                serviceId:
                  serviceId ||
                  null,
  
                customerName:
                  customerName.trim(),
  
                customerPhone:
                  customerPhone.trim(),
  
                customerEmail:
                  customerEmail.trim(),
  
                startAt:
                  startAt.toISOString(),
  
                endAt:
                  endAt.toISOString(),
  
                notes:
                  notes.trim(),
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        const message =
          String(
            result.error ??
              ""
          ).toLowerCase();
  
        if (
          message.includes(
            "online booking"
          ) ||
          message.includes(
            "reserva slottye"
          )
        ) {
          setError(
            "Ya existe una reserva de Slottye en ese horario."
          );
        } else if (
          message.includes(
            "manual booking"
          ) ||
          message.includes(
            "reserva manual"
          )
        ) {
          setError(
            "Ya existe otra reserva manual en ese horario."
          );
        } else if (
          message.includes(
            "bloqueada"
          )
        ) {
          setError(
            "Tu cuenta está bloqueada."
          );
        } else {
          setError(
            result.error ??
              "No se ha podido modificar la reserva."
          );
        }
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error updating manual booking:",
        error
      );
  
      setError(
        "No se ha podido modificar la reserva."
      );
    } finally {
      setLoading(
        false
      );
    }
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
      !Number.isInteger(
        blockDurationMinutes
      ) ||
      blockDurationMinutes <=
        0 ||
      blockDurationMinutes >
        1440
    ) {
      setError(
        "Introduce una duración válida entre 1 y 1440 minutos."
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
  
    try {
      const response =
        await fetch(
          "/api/agenda/event",
          {
            method:
              "PATCH",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                type:
                  "block",
  
                eventId:
                  props.event.id,
  
                startAt:
                  startAt.toISOString(),
  
                endAt:
                  endAt.toISOString(),
  
                reason:
                  blockReason.trim(),
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        const message =
          String(
            result.error ??
              ""
          ).toLowerCase();
  
        if (
          message.includes(
            "no autorizado"
          ) ||
          message.includes(
            "permis"
          )
        ) {
          setError(
            "No tienes permisos para modificar este bloqueo."
          );
        } else if (
          message.includes(
            "no existe"
          ) ||
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
          ) ||
          message.includes(
            "horario seleccionado"
          )
        ) {
          setError(
            "La fecha o la duración del bloqueo no son válidas."
          );
        } else if (
          message.includes(
            "bloqueada"
          )
        ) {
          setError(
            "Tu cuenta está bloqueada."
          );
        } else {
          setError(
            result.error ??
              "No se ha podido modificar el bloqueo."
          );
        }
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error updating agenda block:",
        error
      );
  
      setError(
        "No se ha podido modificar el bloqueo."
      );
    } finally {
      setLoading(
        false
      );
    }
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
      !Number.isInteger(
        slotDurationMinutes
      ) ||
      slotDurationMinutes <=
        0 ||
      slotDurationMinutes >
        1440
    ) {
      setError(
        "Introduce una duración válida entre 1 y 1440 minutos."
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
  
    try {
      const response =
        await fetch(
          "/api/agenda/event",
          {
            method:
              "PATCH",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                type:
                  "slot",
  
                eventId:
                  props.event.id,
  
                serviceId:
                  slotServiceId,
  
                startAt:
                  startAt.toISOString(),
  
                endAt:
                  endAt.toISOString(),
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        const message =
          String(
            result.error ??
              ""
          ).toLowerCase();
  
        if (
          message.includes(
            "online booking"
          ) ||
          message.includes(
            "reserva slottye"
          )
        ) {
          setError(
            "Ya existe una reserva de Slottye en ese horario."
          );
        } else if (
          message.includes(
            "manual booking"
          ) ||
          message.includes(
            "reserva manual"
          )
        ) {
          setError(
            "Ya existe una reserva manual en ese horario."
          );
        } else if (
          message.includes(
            "block"
          ) ||
          message.includes(
            "bloqueo"
          )
        ) {
          setError(
            "Ese horario está bloqueado."
          );
        } else if (
          message.includes(
            "available slot"
          ) ||
          message.includes(
            "disponibilidad"
          )
        ) {
          setError(
            "Ya existe otra disponibilidad en ese horario."
          );
        } else if (
          message.includes(
            "invalid service"
          ) ||
          message.includes(
            "servicio"
          )
        ) {
          setError(
            "El servicio seleccionado no es válido."
          );
        } else if (
          message.includes(
            "only available slots"
          ) ||
          message.includes(
            "disponibilidades libres"
          )
        ) {
          setError(
            "Esta disponibilidad ya no puede modificarse."
          );
        } else if (
          message.includes(
            "not authorized"
          ) ||
          message.includes(
            "permis"
          )
        ) {
          setError(
            "No tienes permisos para modificar esta disponibilidad."
          );
        } else {
          setError(
            result.error ??
              "No se ha podido modificar la disponibilidad."
          );
        }
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error updating agenda slot:",
        error
      );
  
      setError(
        "No se ha podido modificar la disponibilidad."
      );
    } finally {
      setLoading(
        false
      );
    }
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
  
    setLoading(
      true
    );
  
    setError("");
  
    try {
      const response =
        await fetch(
          "/api/agenda/event",
          {
            method:
              "DELETE",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                type:
                  "manual",
  
                eventId:
                  props.event.id,
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        const message =
          String(
            result.error ??
              ""
          ).toLowerCase();
  
        if (
          message.includes(
            "bloqueada"
          )
        ) {
          setError(
            "Tu cuenta está bloqueada."
          );
        } else if (
          message.includes(
            "no existe"
          )
        ) {
          setError(
            "La reserva manual ya no existe."
          );
        } else if (
          message.includes(
            "permis"
          )
        ) {
          setError(
            "No tienes permisos para eliminar esta reserva manual."
          );
        } else {
          setError(
            result.error ??
              "No se ha podido eliminar la reserva manual."
          );
        }
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error deleting manual booking:",
        error
      );
  
      setError(
        "No se ha podido eliminar la reserva manual."
      );
    } finally {
      setLoading(
        false
      );
    }
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
  
    setLoading(
      true
    );
  
    setError("");
  
    try {
      const response =
        await fetch(
          "/api/agenda/event",
          {
            method:
              "DELETE",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                type:
                  "block",
  
                eventId:
                  props.event.id,
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        const message =
          String(
            result.error ??
              ""
          ).toLowerCase();
  
        if (
          message.includes(
            "bloqueada"
          )
        ) {
          setError(
            "Tu cuenta está bloqueada."
          );
        } else if (
          message.includes(
            "no existe"
          )
        ) {
          setError(
            "El bloqueo ya no existe."
          );
        } else if (
          message.includes(
            "permis"
          )
        ) {
          setError(
            "No tienes permisos para eliminar este bloqueo."
          );
        } else {
          setError(
            result.error ??
              "No se ha podido eliminar el bloqueo."
          );
        }
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error deleting block:",
        error
      );
  
      setError(
        "No se ha podido eliminar el bloqueo."
      );
    } finally {
      setLoading(
        false
      );
    }
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
  
    setLoading(
      true
    );
  
    setError("");
  
    try {
      const response =
        await fetch(
          "/api/agenda/event",
          {
            method:
              "DELETE",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                type:
                  "slot",
  
                eventId:
                  props.event.id,
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        const message =
          String(
            result.error ??
              ""
          ).toLowerCase();
  
        if (
          message.includes(
            "bloqueada"
          )
        ) {
          setError(
            "Tu cuenta está bloqueada."
          );
        } else if (
          message.includes(
            "only available slots"
          ) ||
          message.includes(
            "disponibilidades que estén libres"
          )
        ) {
          setError(
            "Solo puedes eliminar disponibilidades que estén libres."
          );
        } else if (
          message.includes(
            "not authorized"
          ) ||
          message.includes(
            "permis"
          )
        ) {
          setError(
            "No tienes permisos para eliminar esta disponibilidad."
          );
        } else if (
          message.includes(
            "slot not found"
          ) ||
          message.includes(
            "no existe"
          )
        ) {
          setError(
            "La disponibilidad ya no existe."
          );
        } else {
          setError(
            result.error ??
              "No se ha podido eliminar esta disponibilidad."
          );
        }
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error deleting agenda slot:",
        error
      );
  
      setError(
        "No se ha podido eliminar esta disponibilidad."
      );
    } finally {
      setLoading(
        false
      );
    }
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
  
    setLoading(
      true
    );
  
    setError("");
  
    try {
      const response =
        await fetch(
          "/api/agenda/booking-status",
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
  
                action:
                  "cancel",
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        setError(
          result.error ??
            "No se ha podido cancelar la reserva."
        );
  
        return;
      }
  
      /*
       * La reserva ya está cancelada.
       * Ahora enviamos el aviso al cliente.
       */
  
      try {
        const notificationResponse =
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
  
        if (
          !notificationResponse.ok
        ) {
          const notificationResult =
            await notificationResponse
              .json()
              .catch(
                () =>
                  null
              );
  
          console.error(
            "Error enviando cancelación:",
            notificationResult
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
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error cancelling booking:",
        error
      );
  
      setError(
        "No se ha podido cancelar la reserva."
      );
    } finally {
      setLoading(
        false
      );
    }
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
  
    setLoading(
      true
    );
  
    setError("");
  
    try {
      const response =
        await fetch(
          "/api/agenda/booking-status",
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
  
                action:
                  "complete",
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        setError(
          result.error ??
            "No se ha podido marcar la reserva como completada."
        );
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error completing booking:",
        error
      );
  
      setError(
        "No se ha podido marcar la reserva como completada."
      );
    } finally {
      setLoading(
        false
      );
    }
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
  
    setLoading(
      true
    );
  
    setError("");
  
    try {
      const response =
        await fetch(
          "/api/agenda/booking-status",
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
  
                action:
                  "no_show",
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        setError(
          result.error ??
            "No se ha podido marcar la reserva como no presentada."
        );
  
        return;
      }
  
      props.onClose();
    } catch (
      error
    ) {
      console.error(
        "Error marking booking as no-show:",
        error
      );
  
      setError(
        "No se ha podido marcar la reserva como no presentada."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  const confirmationDetails: Record<
    ConfirmationAction,
    { title: string; description: string; confirmLabel: string; variant: ConfirmDialogVariant }
  > = {
    "delete-manual": { title: "Eliminar reserva manual", description: "¿Eliminar esta reserva manual? Esta acción no se puede deshacer.", confirmLabel: "Eliminar reserva", variant: "danger" },
    "delete-block": { title: "Eliminar bloqueo", description: "¿Eliminar este bloqueo? El horario volverá a quedar disponible.", confirmLabel: "Eliminar bloqueo", variant: "danger" },
    "delete-slot": { title: "Eliminar disponibilidad", description: "Dejará de aparecer como reservable para los clientes.", confirmLabel: "Eliminar disponibilidad", variant: "danger" },
    "cancel-booking": { title: "Cancelar reserva", description: "¿Seguro que quieres cancelar esta reserva? Se avisará al cliente.", confirmLabel: "Cancelar reserva", variant: "danger" },
    "complete-booking": { title: "Completar cita", description: "¿Marcar esta cita como completada?", confirmLabel: "Marcar completada", variant: "neutral" },
    "no-show": { title: "Cliente no presentado", description: "¿Marcar que el cliente no se presentó?", confirmLabel: "Marcar no presentado", variant: "warning" },
  };

  const activeConfirmation = confirmationAction
    ? confirmationDetails[confirmationAction]
    : null;

  return (
    <div className={styles.backdrop}
      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          10000,

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
      <ConfirmDialog
        open={activeConfirmation !== null}
        onOpenChange={(open) => { if (!open) setConfirmationAction(null); }}
        title={activeConfirmation?.title ?? "Confirmar acción"}
        description={activeConfirmation?.description ?? ""}
        confirmLabel={activeConfirmation?.confirmLabel}
        variant={activeConfirmation?.variant}
        pending={loading}
        onConfirm={async () => {
          const action = confirmationAction;
          if (!action) return;
          if (action === "delete-manual") await deleteManualBooking();
          if (action === "delete-block") await deleteBlock();
          if (action === "delete-slot") await deleteSlot();
          if (action === "cancel-booking") await cancelOnlineBooking();
          if (action === "complete-booking") await completeOnlineBooking();
          if (action === "no-show") await noShowOnlineBooking();
          setConfirmationAction(null);
        }}
      />
      <div ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-label="Detalle de agenda"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
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

        <div className={styles.header}
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
            className={`btn ${styles.close}`}
            aria-label="Cerrar"
            disabled={
              loading
            }
            onClick={
              props.onClose
            }
          >
            <X aria-hidden="true" size={20} />
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
                  Modificar
                </button>

                <button
                  type="button"
                  className={`btn ${styles.dangerAction}`}
                  disabled={
                    loading
                  }
                  onClick={() => setConfirmationAction("delete-manual")}
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
                    step={60}
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

                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  required
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
                />

                <div
                  className="muted"
                  style={{
                    marginTop:
                      -8,

                    marginBottom:
                      14,

                    fontSize:
                      12,
                  }}
                >
                  Duración actual: {formatDuration(
                    durationMinutes
                  )}
                </div>
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
                {formatDuration(
                  minutesBetween(
                    props.event
                      .start_at,
                    props.event
                      .end_at
                  )
                )}
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
                className={styles.slotActions}
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
                  className={`btn ${styles.secondaryAction}`}
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
                  Modificar
                </button>

                <button
                  type="button"
                  className={`btn ${styles.manualChoice}`}
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
                  Reservar manualmente
                </button>

                <button
                  type="button"
                  className={`btn ${styles.dangerAction}`}
                  disabled={
                    loading
                  }
                  onClick={() => setConfirmationAction("delete-slot")}
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
                    step={60}
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

                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  required
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
                />

                <div
                  className="muted"
                  style={{
                    marginTop:
                      -8,

                    marginBottom:
                      14,

                    fontSize:
                      12,
                  }}
                >
                  Duración actual: {formatDuration(
                    slotDurationMinutes
                  )}
                </div>
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
                {formatDuration(
                  minutesBetween(
                    props.event
                      .start_at,
                    props.event
                      .end_at
                  )
                )}
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
                  Modificar
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={
                    loading
                  }
                  onClick={() => setConfirmationAction("delete-block")}
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
                    step={60}
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

                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  required
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
                />

                <div
                  className="muted"
                  style={{
                    marginTop:
                      -8,

                    marginBottom:
                      14,

                    fontSize:
                      12,
                  }}
                >
                  Duración actual: {formatDuration(
                    blockDurationMinutes
                  )}
                </div>
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
      Reprogramar
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
                        onClick={() => setConfirmationAction("complete-booking")}
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
                        onClick={() => setConfirmationAction("no-show")}
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
                    onClick={() => setConfirmationAction("cancel-booking")}
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
      {message}
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
