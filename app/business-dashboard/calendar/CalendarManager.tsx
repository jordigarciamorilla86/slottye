"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
};

type Slot = {
  id: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

type BusinessHour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  open_time_2: string | null;
  close_time_2: string | null;
  closed: boolean;
};

type BusinessBlock = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type MessageType =
  | "success"
  | "error"
  | "warning"
  | null;

type Props = {
  businessId: string;
  services: Service[];
  initialSlots: Slot[];
  businessHours: BusinessHour[];
  initialBlocks: BusinessBlock[];
};

export default function CalendarManager({
  businessId,
  services,
  initialSlots,
  businessHours,
  initialBlocks,
}: Props) {
  const supabase =
    createClient();

  // ============================================================
  // CITA INDIVIDUAL
  // ============================================================

  const [
    slots,
    setSlots,
  ] =
    useState(
      initialSlots
    );

  const [
    serviceId,
    setServiceId,
  ] =
    useState("");

  const [
    date,
    setDate,
  ] =
    useState("");

  const [
    time,
    setTime,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  // ============================================================
  // MENSAJES
  // ============================================================

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      null
    );

  // ============================================================
  // GENERACIÓN EN BLOQUE
  // ============================================================

  const [
    bulkServiceId,
    setBulkServiceId,
  ] =
    useState("");

  const [
    bulkDate,
    setBulkDate,
  ] =
    useState("");

  const [
    bulkStartTime,
    setBulkStartTime,
  ] =
    useState("");

  const [
    bulkEndTime,
    setBulkEndTime,
  ] =
    useState("");

  const [
    bulkLoading,
    setBulkLoading,
  ] =
    useState(false);

  // ============================================================
  // GENERACIÓN SEMANAL
  // ============================================================

  const [
    weekServiceId,
    setWeekServiceId,
  ] =
    useState("");

  const [
    weekStartDate,
    setWeekStartDate,
  ] =
    useState("");

  const [
    weekLoading,
    setWeekLoading,
  ] =
    useState(false);

  // ============================================================
  // DÍAS DESPLEGADOS
  // ============================================================

  const [
    expandedDays,
    setExpandedDays,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});

  // ============================================================
  // BLOQUEOS
  // ============================================================

  const [
    blocks,
    setBlocks,
  ] =
    useState<
      BusinessBlock[]
    >(
      initialBlocks
    );

  const [
    blockDate,
    setBlockDate,
  ] =
    useState("");

  const [
    blockStartTime,
    setBlockStartTime,
  ] =
    useState("");

  const [
    blockEndTime,
    setBlockEndTime,
  ] =
    useState("");

  const [
    blockReason,
    setBlockReason,
  ] =
    useState("");

  const [
    blockAllDay,
    setBlockAllDay,
  ] =
    useState(false);

  const [
    blockLoading,
    setBlockLoading,
  ] =
    useState(false);

  /*
   * ============================================================
   * CIERRE AUTOMÁTICO DEL TOAST
   * ============================================================
   */

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setMessage("");
          setMessageType(
            null
          );
        },
        4000
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [message]);

  /*
   * ============================================================
   * MENSAJES
   * ============================================================
   */

  function clearMessage() {
    setMessage("");
    setMessageType(
      null
    );
  }

  function showSuccess(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "success"
    );
  }

  function showError(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "error"
    );
  }

  function showWarning(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "warning"
    );
  }

  /*
   * ============================================================
   * BLOQUEOS
   * ============================================================
   */

  function overlapsBlock(
    start: Date,
    end: Date
  ) {
    return blocks.some(
      (block) => {
        const blockStart =
          new Date(
            block.start_at
          );

        const blockEnd =
          new Date(
            block.end_at
          );

        return (
          start <
            blockEnd &&
          end >
            blockStart
        );
      }
    );
  }

  /*
   * ============================================================
   * CREAR CITA INDIVIDUAL
   * ============================================================
   */

  async function createSlot(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessage();

    const service =
      services.find(
        (item) =>
          item.id ===
          serviceId
      );

    if (!service) {
      showError(
        "Selecciona un servicio."
      );

      return;
    }

    if (
      !date ||
      !time
    ) {
      showError(
        "Selecciona fecha y hora."
      );

      return;
    }

    const start =
      new Date(
        `${date}T${time}`
      );

    if (
      start <=
      new Date()
    ) {
      showError(
        "La cita debe ser posterior a la fecha actual."
      );

      return;
    }

    const end =
      new Date(
        start.getTime() +
          service.duration_minutes *
            60 *
            1000
      );

    if (
      overlapsBlock(
        start,
        end
      )
    ) {
      showError(
        "No puedes crear esta cita porque coincide con un horario bloqueado."
      );

      return;
    }

    setLoading(
      true
    );

    const {
      data,
      error,
    } =
      await supabase
        .from("slots")
        .insert({
          business_id:
            businessId,

          service_id:
            service.id,

          start_at:
            start.toISOString(),

          end_at:
            end.toISOString(),

          status:
            "AVAILABLE",
        })
        .select(`
          id,
          service_id,
          start_at,
          end_at,
          status
        `)
        .single();

    if (error) {
      showError(
        error.message
      );

      setLoading(
        false
      );

      return;
    }

    fetch(
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
              data.id,
            ],
          }),
      }
    ).catch(
      (error) => {
        console.error(
          "Error notificando nuevas citas:",
          error
        );
      }
    );

    setSlots(
      (current) =>
        [
          ...current,
          data,
        ].sort(
          (a, b) =>
            new Date(
              a.start_at
            ).getTime() -
            new Date(
              b.start_at
            ).getTime()
        )
    );

    setDate("");
    setTime("");

    showSuccess(
      "Cita disponible creada correctamente."
    );

    setLoading(
      false
    );
  }

  /*
   * ============================================================
   * ELIMINAR UNA CITA
   * ============================================================
   */

  async function deleteSlot(
    slot: Slot
  ) {
    if (
      slot.status !==
      "AVAILABLE"
    ) {
      showError(
        "Solo se pueden eliminar huecos disponibles."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "¿Eliminar definitivamente este hueco?"
      );

    if (!confirmed) {
      return;
    }

    clearMessage();

    /*
     * Comprobamos si alguna reserva histórica
     * referencia este slot.
     */

    const {
      data:
        bookingHistory,
      error:
        historyError,
    } =
      await supabase
        .from(
          "bookings"
        )
        .select("id")
        .eq(
          "slot_id",
          slot.id
        )
        .limit(1);

    if (
      historyError
    ) {
      showError(
        historyError.message
      );

      return;
    }

    /*
     * Si existe historial,
     * no podemos eliminarlo.
     */

    if (
      bookingHistory &&
      bookingHistory.length >
        0
    ) {
      const {
        error:
          blockError,
      } =
        await supabase
          .from("slots")
          .update({
            status:
              "BLOCKED",
          })
          .eq(
            "id",
            slot.id
          );

      if (
        blockError
      ) {
        showError(
          blockError.message
        );

        return;
      }

      setSlots(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              slot.id
                ? {
                    ...item,
                    status:
                      "BLOCKED",
                  }
                : item
          )
      );

      showWarning(
        "Este hueco tenía historial de reservas. Se ha bloqueado en lugar de eliminarse."
      );

      return;
    }

    /*
     * Sin historial:
     * DELETE real.
     */

    const {
      error,
    } =
      await supabase
        .from("slots")
        .delete()
        .eq(
          "id",
          slot.id
        );

    if (error) {
      showError(
        error.message
      );

      return;
    }

    setSlots(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            slot.id
        )
    );

    showSuccess(
      "Hueco eliminado definitivamente."
    );
  }

  /*
   * ============================================================
   * ELIMINAR DISPONIBLES DEL DÍA
   * ============================================================
   */

  async function deleteAvailableSlotsForDay(
    daySlots:
      Slot[]
  ) {
    const availableSlots =
      daySlots.filter(
        (slot) =>
          slot.status ===
          "AVAILABLE"
      );

    if (
      availableSlots.length ===
      0
    ) {
      showError(
        "No hay huecos disponibles que eliminar en este día."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `¿Eliminar los ${availableSlots.length} huecos disponibles de este día?`
      );

    if (!confirmed) {
      return;
    }

    clearMessage();

    const ids =
      availableSlots.map(
        (slot) =>
          slot.id
      );

    const {
      data:
        bookingsHistory,
      error:
        historyError,
    } =
      await supabase
        .from(
          "bookings"
        )
        .select(
          "slot_id"
        )
        .in(
          "slot_id",
          ids
        );

    if (
      historyError
    ) {
      showError(
        historyError.message
      );

      return;
    }

    const slotsWithHistory =
      new Set(
        (
          bookingsHistory ??
          []
        ).map(
          (booking) =>
            booking.slot_id
        )
      );

    const idsToDelete =
      ids.filter(
        (id) =>
          !slotsWithHistory.has(
            id
          )
      );

    const idsToBlock =
      ids.filter(
        (id) =>
          slotsWithHistory.has(
            id
          )
      );

    /*
     * DELETE real para
     * slots sin historial.
     */

    if (
      idsToDelete.length >
      0
    ) {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from("slots")
          .delete()
          .in(
            "id",
            idsToDelete
          );

      if (
        deleteError
      ) {
        showError(
          deleteError.message
        );

        return;
      }
    }

    /*
     * Historial:
     * se conservan como BLOCKED.
     */

    if (
      idsToBlock.length >
      0
    ) {
      const {
        error:
          blockError,
      } =
        await supabase
          .from("slots")
          .update({
            status:
              "BLOCKED",
          })
          .in(
            "id",
            idsToBlock
          );

      if (
        blockError
      ) {
        showError(
          blockError.message
        );

        return;
      }
    }

    const deletedIds =
      new Set(
        idsToDelete
      );

    const blockedIds =
      new Set(
        idsToBlock
      );

    setSlots(
      (current) =>
        current
          .filter(
            (slot) =>
              !deletedIds.has(
                slot.id
              )
          )
          .map(
            (slot) =>
              blockedIds.has(
                slot.id
              )
                ? {
                    ...slot,
                    status:
                      "BLOCKED",
                  }
                : slot
          )
    );

    if (
      idsToDelete.length >
        0 &&
      idsToBlock.length >
        0
    ) {
      showWarning(
        `${idsToDelete.length} huecos eliminados · ${idsToBlock.length} bloqueados porque tenían historial de reservas.`
      );
    } else if (
      idsToDelete.length >
      0
    ) {
      showSuccess(
        `${idsToDelete.length} huecos eliminados correctamente.`
      );
    } else {
      showWarning(
        `${idsToBlock.length} huecos tenían historial de reservas y se han bloqueado.`
      );
    }
  }

  /*
   * ============================================================
   * GENERAR CITAS EN BLOQUE
   * ============================================================
   */

  async function createBulkSlots(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessage();

    const service =
      services.find(
        (item) =>
          item.id ===
          bulkServiceId
      );

    if (!service) {
      showError(
        "Selecciona un servicio."
      );

      return;
    }

    if (
      !bulkDate ||
      !bulkStartTime ||
      !bulkEndTime
    ) {
      showError(
        "Selecciona fecha, hora inicial y hora final."
      );

      return;
    }

    const start =
      new Date(
        `${bulkDate}T${bulkStartTime}`
      );

    const limit =
      new Date(
        `${bulkDate}T${bulkEndTime}`
      );

    if (
      start <=
      new Date()
    ) {
      showError(
        "Las citas deben ser posteriores a la fecha actual."
      );

      return;
    }

    if (
      limit <=
      start
    ) {
      showError(
        "La hora final debe ser posterior a la inicial."
      );

      return;
    }

    const rows: {
      business_id:
        string;
      service_id:
        string;
      start_at:
        string;
      end_at:
        string;
      status:
        string;
    }[] = [];

    let current =
      new Date(
        start
      );

    let blockedCount =
      0;

    while (true) {
      const end =
        new Date(
          current.getTime() +
            service.duration_minutes *
              60 *
              1000
        );

      if (
        end >
        limit
      ) {
        break;
      }

      if (
        overlapsBlock(
          current,
          end
        )
      ) {
        blockedCount++;
      } else {
        rows.push({
          business_id:
            businessId,

          service_id:
            service.id,

          start_at:
            current.toISOString(),

          end_at:
            end.toISOString(),

          status:
            "AVAILABLE",
        });
      }

      current =
        end;
    }

    if (
      rows.length ===
      0
    ) {
      showError(
        blockedCount >
          0
          ? "Todos los huecos coinciden con horarios bloqueados."
          : "No cabe ninguna cita dentro de ese intervalo."
      );

      return;
    }

    /*
     * Evitamos horas ya existentes.
     */

    const {
      data:
        existingSlots,
      error:
        existingError,
    } =
      await supabase
        .from("slots")
        .select(
          "start_at"
        )
        .eq(
          "business_id",
          businessId
        )
        .gte(
          "start_at",
          start.toISOString()
        )
        .lt(
          "start_at",
          limit.toISOString()
        );

    if (
      existingError
    ) {
      showError(
        existingError.message
      );

      return;
    }

    const existingTimes =
      new Set(
        (
          existingSlots ??
          []
        ).map(
          (slot) =>
            new Date(
              slot.start_at
            ).getTime()
        )
      );

    const rowsToInsert =
      rows.filter(
        (row) =>
          !existingTimes.has(
            new Date(
              row.start_at
            ).getTime()
          )
      );

    if (
      rowsToInsert.length ===
      0
    ) {
      showWarning(
        "No se ha creado ninguna cita: todos los huecos ya existen o están bloqueados."
      );

      return;
    }

    setBulkLoading(
      true
    );

    const {
      data,
      error,
    } =
      await supabase
        .from("slots")
        .insert(
          rowsToInsert
        )
        .select(`
          id,
          service_id,
          start_at,
          end_at,
          status
        `);

    if (error) {
      showError(
        error.message
      );

      setBulkLoading(
        false
      );

      return;
    }

    const newSlots =
      data ??
      [];

    setSlots(
      (
        currentSlots
      ) =>
        [
          ...currentSlots,
          ...newSlots,
        ].sort(
          (a, b) =>
            new Date(
              a.start_at
            ).getTime() -
            new Date(
              b.start_at
            ).getTime()
        )
    );

    if (
      newSlots.length >
      0
    ) {
      fetch(
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

              slotIds:
                newSlots.map(
                  (slot) =>
                    slot.id
                ),
            }),
        }
      ).catch(
        (error) => {
          console.error(
            "Error notificando nuevas citas:",
            error
          );
        }
      );
    }

    setBulkDate("");
    setBulkStartTime("");
    setBulkEndTime("");

    const existingCount =
      rows.length -
      rowsToInsert.length;

    const details:
      string[] = [];

    if (
      blockedCount >
      0
    ) {
      details.push(
        `${blockedCount} omitidas por bloqueos`
      );
    }

    if (
      existingCount >
      0
    ) {
      details.push(
        `${existingCount} ya existentes`
      );
    }

    if (
      details.length >
      0
    ) {
      showWarning(
        `Se han creado ${newSlots.length} citas correctamente · ${details.join(
          " · "
        )}.`
      );
    } else {
      showSuccess(
        `Se han creado ${newSlots.length} citas correctamente.`
      );
    }

    setBulkLoading(
      false
    );
  }

  /*
   * ============================================================
   * GENERAR SEMANA COMPLETA
   * ============================================================
   */

  async function createWeekSlots(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessage();

    const service =
      services.find(
        (item) =>
          item.id ===
          weekServiceId
      );

    if (!service) {
      showError(
        "Selecciona un servicio."
      );

      return;
    }

    const selectedServiceId =
      service.id;

    const selectedServiceDuration =
      service.duration_minutes;

    if (
      !weekStartDate
    ) {
      showError(
        "Selecciona el inicio de la semana."
      );

      return;
    }

    if (
      businessHours.length ===
      0
    ) {
      showError(
        "Primero configura el horario del negocio."
      );

      return;
    }

    const startDate =
      new Date(
        `${weekStartDate}T00:00:00`
      );

    const rows: {
      business_id:
        string;
      service_id:
        string;
      start_at:
        string;
      end_at:
        string;
      status:
        string;
    }[] = [];

    let weeklyBlockedCount =
      0;

    function createRange(
      date:
        Date,

      openTime:
        | string
        | null,

      closeTime:
        | string
        | null
    ) {
      if (
        !openTime ||
        !closeTime
      ) {
        return;
      }

      const [
        openHour,
        openMinute,
      ] =
        openTime
          .slice(
            0,
            5
          )
          .split(":")
          .map(
            Number
          );

      const [
        closeHour,
        closeMinute,
      ] =
        closeTime
          .slice(
            0,
            5
          )
          .split(":")
          .map(
            Number
          );

      let current =
        new Date(
          date
        );

      current.setHours(
        openHour,
        openMinute,
        0,
        0
      );

      const limit =
        new Date(
          date
        );

      limit.setHours(
        closeHour,
        closeMinute,
        0,
        0
      );

      while (true) {
        const end =
          new Date(
            current.getTime() +
              selectedServiceDuration *
                60 *
                1000
          );

        if (
          end >
          limit
        ) {
          break;
        }

        if (
          current >
          new Date()
        ) {
          if (
            overlapsBlock(
              current,
              end
            )
          ) {
            weeklyBlockedCount++;
          } else {
            rows.push({
              business_id:
                businessId,

              service_id:
                selectedServiceId,

              start_at:
                current.toISOString(),

              end_at:
                end.toISOString(),

              status:
                "AVAILABLE",
            });
          }
        }

        current =
          end;
      }
    }

    for (
      let offset = 0;
      offset < 7;
      offset++
    ) {
      const date =
        new Date(
          startDate
        );

      date.setDate(
        startDate.getDate() +
          offset
      );

      const slottyeDay =
        (
          date.getDay() +
          6
        ) %
        7;

      const schedule =
        businessHours.find(
          (hour) =>
            hour.day_of_week ===
            slottyeDay
        );

      if (
        !schedule ||
        schedule.closed
      ) {
        continue;
      }

      createRange(
        date,
        schedule.open_time,
        schedule.close_time
      );

      createRange(
        date,
        schedule.open_time_2,
        schedule.close_time_2
      );
    }

    if (
      rows.length ===
      0
    ) {
      showError(
        weeklyBlockedCount >
          0
          ? "No se pueden generar citas: todos los huecos disponibles coinciden con bloqueos."
          : "No se pueden generar citas para esa semana."
      );

      return;
    }

    setWeekLoading(
      true
    );

    const firstStart =
      rows[0]
        .start_at;

    const lastStart =
      rows[
        rows.length -
        1
      ].start_at;

    const {
      data:
        existingSlots,
      error:
        existingError,
    } =
      await supabase
        .from("slots")
        .select(
          "start_at"
        )
        .eq(
          "business_id",
          businessId
        )
        .gte(
          "start_at",
          firstStart
        )
        .lte(
          "start_at",
          lastStart
        );

    if (
      existingError
    ) {
      showError(
        existingError.message
      );

      setWeekLoading(
        false
      );

      return;
    }

    const existingTimes =
      new Set(
        (
          existingSlots ??
          []
        ).map(
          (slot) =>
            new Date(
              slot.start_at
            ).getTime()
        )
      );

    const rowsToInsert =
      rows.filter(
        (row) =>
          !existingTimes.has(
            new Date(
              row.start_at
            ).getTime()
          )
      );

    if (
      rowsToInsert.length ===
      0
    ) {
      showWarning(
        "No se ha creado ninguna cita: todos los huecos de esa semana ya existen."
      );

      setWeekLoading(
        false
      );

      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("slots")
        .insert(
          rowsToInsert
        )
        .select(`
          id,
          service_id,
          start_at,
          end_at,
          status
        `);

    if (error) {
      showError(
        error.message
      );

      setWeekLoading(
        false
      );

      return;
    }

    const newSlots =
      data ??
      [];

    setSlots(
      (current) =>
        [
          ...current,
          ...newSlots,
        ].sort(
          (a, b) =>
            new Date(
              a.start_at
            ).getTime() -
            new Date(
              b.start_at
            ).getTime()
        )
    );

    if (
      newSlots.length >
      0
    ) {
      fetch(
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

              slotIds:
                newSlots.map(
                  (slot) =>
                    slot.id
                ),
            }),
        }
      ).catch(
        (error) => {
          console.error(
            "Error notificando nuevas citas:",
            error
          );
        }
      );
    }

    const existingCount =
      rows.length -
      rowsToInsert.length;

    const details:
      string[] = [];

    if (
      weeklyBlockedCount >
      0
    ) {
      details.push(
        `${weeklyBlockedCount} omitidas por bloqueos`
      );
    }

    if (
      existingCount >
      0
    ) {
      details.push(
        `${existingCount} ya existentes`
      );
    }

    if (
      details.length >
      0
    ) {
      showWarning(
        `Semana generada. Se han creado ${newSlots.length} citas correctamente · ${details.join(
          " · "
        )}.`
      );
    } else {
      showSuccess(
        `Semana generada correctamente. Se han creado ${newSlots.length} citas disponibles.`
      );
    }

    setWeekLoading(
      false
    );
  }

  /*
   * ============================================================
   * CREAR BLOQUEO
   * ============================================================
   */

  async function createBlock(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessage();

    if (
      !blockDate
    ) {
      showError(
        "Selecciona una fecha."
      );

      return;
    }

    let start:
      Date;

    let end:
      Date;

    if (
      blockAllDay
    ) {
      start =
        new Date(
          `${blockDate}T00:00:00`
        );

      end =
        new Date(
          `${blockDate}T00:00:00`
        );

      end.setDate(
        end.getDate() +
          1
      );
    } else {
      if (
        !blockStartTime ||
        !blockEndTime
      ) {
        showError(
          "Selecciona hora inicial y final."
        );

        return;
      }

      start =
        new Date(
          `${blockDate}T${blockStartTime}`
        );

      end =
        new Date(
          `${blockDate}T${blockEndTime}`
        );

      if (
        end <=
        start
      ) {
        showError(
          "La hora final debe ser posterior a la inicial."
        );

        return;
      }
    }

    if (
      end <=
      new Date()
    ) {
      showError(
        "No puedes bloquear un periodo que ya ha pasado."
      );

      return;
    }

    const duplicateBlock =
      blocks.some(
        (block) =>
          new Date(
            block.start_at
          ).getTime() ===
            start.getTime() &&
          new Date(
            block.end_at
          ).getTime() ===
            end.getTime()
      );

    if (
      duplicateBlock
    ) {
      showWarning(
        "Ese periodo ya está bloqueado."
      );

      return;
    }

    setBlockLoading(
      true
    );

    const affectedBookedSlots =
      slots.filter(
        (slot) =>
          slot.status ===
            "BOOKED" &&
          new Date(
            slot.start_at
          ) <
            end &&
          new Date(
            slot.end_at
          ) >
            start
      );

    if (
      affectedBookedSlots.length >
      0
    ) {
      const confirmed =
        window.confirm(
          `Hay ${affectedBookedSlots.length} reserva(s) dentro de este periodo. No se cancelarán. ¿Quieres bloquear igualmente el resto del horario?`
        );

      if (
        !confirmed
      ) {
        setBlockLoading(
          false
        );

        return;
      }
    }

    const {
      data:
        block,
      error:
        blockError,
    } =
      await supabase
        .from(
          "business_blocks"
        )
        .insert({
          business_id:
            businessId,

          start_at:
            start.toISOString(),

          end_at:
            end.toISOString(),

          reason:
            blockReason.trim() ||
            null,
        })
        .select(`
          id,
          start_at,
          end_at,
          reason
        `)
        .single();

    if (
      blockError ||
      !block
    ) {
      showError(
        blockError
          ?.message ??
          "No se pudo crear el bloqueo."
      );

      setBlockLoading(
        false
      );

      return;
    }

    const availableAffected =
      slots.filter(
        (slot) =>
          slot.status ===
            "AVAILABLE" &&
          new Date(
            slot.start_at
          ) <
            end &&
          new Date(
            slot.end_at
          ) >
            start
      );

    let updateWarning:
      | string
      | null =
      null;

    if (
      availableAffected.length >
      0
    ) {
      const ids =
        availableAffected.map(
          (slot) =>
            slot.id
        );

      const {
        error:
          updateError,
      } =
        await supabase
          .from("slots")
          .update({
            status:
              "BLOCKED",
          })
          .in(
            "id",
            ids
          );

      if (
        updateError
      ) {
        updateWarning =
          `Bloqueo creado, pero no se pudieron bloquear algunos huecos: ${updateError.message}`;
      } else {
        const blockedIds =
          new Set(
            ids
          );

        setSlots(
          (current) =>
            current.map(
              (slot) =>
                blockedIds.has(
                  slot.id
                )
                  ? {
                      ...slot,

                      status:
                        "BLOCKED",
                    }
                  : slot
            )
        );
      }
    }

    setBlocks(
      (current) =>
        [
          ...current,
          block,
        ].sort(
          (a, b) =>
            new Date(
              a.start_at
            ).getTime() -
            new Date(
              b.start_at
            ).getTime()
        )
    );

    setBlockDate("");
    setBlockStartTime("");
    setBlockEndTime("");
    setBlockReason("");
    setBlockAllDay(
      false
    );

    if (
      updateWarning
    ) {
      showWarning(
        updateWarning
      );
    } else if (
      availableAffected.length >
      0
    ) {
      showSuccess(
        `Horario bloqueado correctamente. ${availableAffected.length} huecos retirados de la disponibilidad.`
      );
    } else {
      showSuccess(
        "Horario bloqueado correctamente."
      );
    }

    setBlockLoading(
      false
    );
  }

  /*
   * ============================================================
   * ELIMINAR BLOQUEO
   * ============================================================
   */

  async function deleteBlock(
    block:
      BusinessBlock
  ) {
    const confirmed =
      window.confirm(
        "¿Eliminar este bloqueo?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    clearMessage();

    const {
      error,
    } =
      await supabase
        .from(
          "business_blocks"
        )
        .delete()
        .eq(
          "id",
          block.id
        );

    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }

    setBlocks(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            block.id
        )
    );

    showWarning(
      "Bloqueo eliminado. Los huecos bloqueados no se reactivan automáticamente."
    );
  }

  /*
   * ============================================================
   * FUNCIONES DE PRESENTACIÓN
   * ============================================================
   */

  function getServiceName(
    id:
      string |
      null
  ) {
    return (
      services.find(
        (service) =>
          service.id ===
          id
      )?.name ??
      "Servicio"
    );
  }

  function getDayKey(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function formatDayTitle(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function formatSlotTime(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function formatBlockDate(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function formatBlockTime(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  /*
   * ============================================================
   * AGRUPAR SLOTS POR DÍA
   * ============================================================
   */

  const groupedSlots =
    slots.reduce(
      (
        acc,
        slot
      ) => {
        const key =
          getDayKey(
            slot.start_at
          );

        if (
          !acc[key]
        ) {
          acc[key] =
            [];
        }

        acc[
          key
        ].push(
          slot
        );

        return acc;
      },
      {} as Record<
        string,
        Slot[]
      >
    );

  const groupedDays =
    Object.entries(
      groupedSlots
    ).sort(
      (
        [a],
        [b]
      ) =>
        a.localeCompare(
          b
        )
    );

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div
      style={{
        marginTop:
          28,
      }}
    >
      {/* ======================================================
          TOAST / NOTIFICACIÓN
          ====================================================== */}

      {message && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position:
              "fixed",

            top:
              24,

            right:
              24,

            zIndex:
              9999,

            width:
              "min(420px, calc(100vw - 32px))",

            padding:
              "16px 18px",

            borderRadius:
              16,

            border:
              messageType ===
              "error"
                ? "1px solid #ef4444"
                : messageType ===
                    "warning"
                  ? "1px solid #f59e0b"
                  : "1px solid #22c55e",

            background:
              messageType ===
              "error"
                ? "#fef2f2"
                : messageType ===
                    "warning"
                  ? "#fffbeb"
                  : "#f0fdf4",

            color:
              messageType ===
              "error"
                ? "#b91c1c"
                : messageType ===
                    "warning"
                  ? "#92400e"
                  : "#166534",

            fontWeight:
              600,

            lineHeight:
              1.5,

            boxShadow:
              "0 12px 40px rgba(0, 0, 0, 0.15)",

            display:
              "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            gap:
              14,
          }}
        >
          <div
            style={{
              display:
                "flex",

              gap:
                10,

              alignItems:
                "flex-start",
            }}
          >
            <span
              aria-hidden="true"
            >
              {messageType ===
              "error"
                ? "⚠️"
                : messageType ===
                    "warning"
                  ? "ℹ️"
                  : "✓"}
            </span>

            <span>
              {message}
            </span>
          </div>

          <button
            type="button"
            onClick={
              clearMessage
            }
            aria-label="Cerrar notificación"
            style={{
              border:
                0,

              background:
                "transparent",

              color:
                "inherit",

              cursor:
                "pointer",

              fontSize:
                20,

              lineHeight:
                1,

              padding:
                0,

              opacity:
                0.7,

              flexShrink:
                0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          CITA INDIVIDUAL
          ====================================================== */}

      <form
        onSubmit={
          createSlot
        }
        style={{
          display:
            "grid",

          gap:
            12,
        }}
      >
        <h2>
          Nueva cita disponible
        </h2>

        {services.length ===
        0 ? (
          <div className="panel">
            <strong>
              Primero necesitas crear un servicio.
            </strong>

            <p className="muted">
              Las citas se vinculan a uno de los servicios del negocio.
            </p>
          </div>
        ) : (
          <>
            <label>
              <strong>
                Servicio
              </strong>

              <select
                required
                value={
                  serviceId
                }
                onChange={(
                  e
                ) =>
                  setServiceId(
                    e.target
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

                {services.map(
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
                      }
                      {" · "}
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
                  12,
              }}
            >
              <label>
                <strong>
                  Fecha
                </strong>

                <input
                  required
                  type="date"
                  value={
                    date
                  }
                  onChange={(
                    e
                  ) =>
                    setDate(
                      e.target
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
                  required
                  type="time"
                  value={
                    time
                  }
                  onChange={(
                    e
                  ) =>
                    setTime(
                      e.target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </label>
            </div>

            <button
              className="btn primary"
              disabled={
                loading
              }
            >
              {loading
                ? "Creando..."
                : "Añadir cita disponible"}
            </button>
          </>
        )}
      </form>

      {/* ======================================================
          GENERACIÓN EN BLOQUE
          ====================================================== */}

      <div
        style={{
          marginTop:
            42,

          paddingTop:
            30,

          borderTop:
            "1px solid var(--border)",
        }}
      >
        <form
          onSubmit={
            createBulkSlots
          }
          style={{
            display:
              "grid",

            gap:
              12,
          }}
        >
          <div>
            <h2>
              Generar citas en bloque
            </h2>

            <p className="muted">
              Slottye creará automáticamente todos los huecos según la duración del servicio.
            </p>
          </div>

          <label>
            <strong>
              Servicio
            </strong>

            <select
              required
              value={
                bulkServiceId
              }
              onChange={(
                e
              ) =>
                setBulkServiceId(
                  e.target
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

              {services.map(
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
                    }
                    {" · "}
                    {
                      service.duration_minutes
                    }{" "}
                    min
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <strong>
              Fecha
            </strong>

            <input
              required
              type="date"
              value={
                bulkDate
              }
              onChange={(
                e
              ) =>
                setBulkDate(
                  e.target
                    .value
                )
              }
              style={
                inputStyle
              }
            />
          </label>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 1fr",

              gap:
                12,
            }}
          >
            <label>
              <strong>
                Desde
              </strong>

              <input
                required
                type="time"
                value={
                  bulkStartTime
                }
                onChange={(
                  e
                ) =>
                  setBulkStartTime(
                    e.target
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
                Hasta
              </strong>

              <input
                required
                type="time"
                value={
                  bulkEndTime
                }
                onChange={(
                  e
                ) =>
                  setBulkEndTime(
                    e.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn primary"
            disabled={
              bulkLoading
            }
          >
            {bulkLoading
              ? "Generando..."
              : "Generar citas"}
          </button>
        </form>
      </div>

      {/* ======================================================
          GENERACIÓN SEMANAL
          ====================================================== */}

      <div
        style={{
          marginTop:
            42,

          paddingTop:
            30,

          borderTop:
            "1px solid var(--border)",
        }}
      >
        <form
          onSubmit={
            createWeekSlots
          }
          style={{
            display:
              "grid",

            gap:
              12,
          }}
        >
          <div>
            <h2>
              Generar semana completa
            </h2>

            <p className="muted">
              Slottye utilizará automáticamente el horario configurado del negocio, incluidos los turnos de mañana y tarde.
            </p>
          </div>

          <label>
            <strong>
              Servicio
            </strong>

            <select
              required
              value={
                weekServiceId
              }
              onChange={(
                e
              ) =>
                setWeekServiceId(
                  e.target
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

              {services.map(
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
                    }
                    {" · "}
                    {
                      service.duration_minutes
                    }{" "}
                    min
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <strong>
              Primer día de la semana
            </strong>

            <input
              type="date"
              required
              value={
                weekStartDate
              }
              onChange={(
                e
              ) =>
                setWeekStartDate(
                  e.target
                    .value
                )
              }
              style={
                inputStyle
              }
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={
              weekLoading
            }
          >
            {weekLoading
              ? "Generando semana..."
              : "Generar semana"}
          </button>
        </form>
      </div>

      {/* ======================================================
          BLOQUEAR DISPONIBILIDAD
          ====================================================== */}

      <div
        style={{
          marginTop:
            42,

          paddingTop:
            30,

          borderTop:
            "1px solid var(--border)",
        }}
      >
        <form
          onSubmit={
            createBlock
          }
          style={{
            display:
              "grid",

            gap:
              12,
          }}
        >
          <div>
            <h2>
              Bloquear disponibilidad
            </h2>

            <p className="muted">
              Bloquea vacaciones, reuniones, cierres o cualquier periodo en el que no quieras aceptar nuevas reservas.
            </p>
          </div>

          <label>
            <strong>
              Fecha
            </strong>

            <input
              required
              type="date"
              value={
                blockDate
              }
              onChange={(
                e
              ) =>
                setBlockDate(
                  e.target
                    .value
                )
              }
              style={
                inputStyle
              }
            />
          </label>

          <label
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                8,
            }}
          >
            <input
              type="checkbox"
              checked={
                blockAllDay
              }
              onChange={(
                e
              ) =>
                setBlockAllDay(
                  e.target
                    .checked
                )
              }
            />

            Bloquear todo el día
          </label>

          {!blockAllDay && (
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "1fr 1fr",

                gap:
                  12,
              }}
            >
              <label>
                <strong>
                  Desde
                </strong>

                <input
                  type="time"
                  value={
                    blockStartTime
                  }
                  onChange={(
                    e
                  ) =>
                    setBlockStartTime(
                      e.target
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
                  Hasta
                </strong>

                <input
                  type="time"
                  value={
                    blockEndTime
                  }
                  onChange={(
                    e
                  ) =>
                    setBlockEndTime(
                      e.target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </label>
            </div>
          )}

          <label>
            <strong>
              Motivo (opcional)
            </strong>

            <input
              value={
                blockReason
              }
              onChange={(
                e
              ) =>
                setBlockReason(
                  e.target
                    .value
                )
              }
              placeholder="Vacaciones, reunión, cerrado..."
              style={
                inputStyle
              }
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={
              blockLoading
            }
          >
            {blockLoading
              ? "Bloqueando..."
              : "Bloquear horario"}
          </button>
        </form>

        {blocks.length >
          0 && (
          <div
            style={{
              marginTop:
                28,
            }}
          >
            <h3>
              Próximos bloqueos
            </h3>

            <div
              style={{
                display:
                  "grid",

                gap:
                  10,

                marginTop:
                  12,
              }}
            >
              {blocks.map(
                (
                  block
                ) => (
                  <div
                    className="card"
                    key={
                      block.id
                    }
                  >
                    <div className="card-body">
                      <strong
                        style={{
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {formatBlockDate(
                          block.start_at
                        )}
                      </strong>

                      <div
                        className="muted"
                        style={{
                          marginTop:
                            6,
                        }}
                      >
                        Hasta{" "}
                        {formatBlockTime(
                          block.end_at
                        )}
                      </div>

                      {block.reason && (
                        <div
                          className="meta"
                          style={{
                            marginTop:
                              8,
                          }}
                        >
                          {
                            block.reason
                          }
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn"
                        style={{
                          marginTop:
                            12,
                        }}
                        onClick={() =>
                          deleteBlock(
                            block
                          )
                        }
                      >
                        Eliminar bloqueo
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          PRÓXIMAS CITAS
          ====================================================== */}

      <div
        style={{
          marginTop:
            40,
        }}
      >
        <h2>
          Próximas citas
        </h2>

        {slots.length ===
        0 ? (
          <p className="muted">
            No tienes citas creadas.
          </p>
        ) : (
          <div
            style={{
              display:
                "grid",

              gap:
                14,

              marginTop:
                16,
            }}
          >
            {groupedDays.map(
              ([
                dayKey,
                daySlots,
              ]) => {
                const expanded =
                  expandedDays[
                    dayKey
                  ] ??
                  false;

                const availableCount =
                  daySlots.filter(
                    (slot) =>
                      slot.status ===
                      "AVAILABLE"
                  ).length;

                const bookedCount =
                  daySlots.filter(
                    (slot) =>
                      slot.status ===
                      "BOOKED"
                  ).length;

                const blockedCount =
                  daySlots.filter(
                    (slot) =>
                      slot.status ===
                      "BLOCKED"
                  ).length;

                return (
                  <div
                    className="card"
                    key={
                      dayKey
                    }
                  >
                    <div className="card-body">
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "center",

                          gap:
                            16,

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDays(
                              (
                                current
                              ) => ({
                                ...current,

                                [dayKey]:
                                  !expanded,
                              })
                            )
                          }
                          style={{
                            flex:
                              1,

                            border:
                              0,

                            background:
                              "transparent",

                            padding:
                              0,

                            color:
                              "inherit",

                            cursor:
                              "pointer",

                            textAlign:
                              "left",
                          }}
                        >
                          <h3
                            style={{
                              margin:
                                0,

                              textTransform:
                                "capitalize",
                            }}
                          >
                            {formatDayTitle(
                              daySlots[
                                0
                              ].start_at
                            )}
                          </h3>

                          <div
                            className="meta"
                            style={{
                              marginTop:
                                6,
                            }}
                          >
                            {
                              daySlots.length
                            }{" "}
                            huecos
                            {" · "}
                            {
                              availableCount
                            }{" "}
                            disponibles
                            {" · "}
                            {
                              bookedCount
                            }{" "}
                            reservados
                            {" · "}
                            {
                              blockedCount
                            }{" "}
                            bloqueados
                          </div>
                        </button>

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              10,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          {availableCount >
                            0 && (
                            <button
                              type="button"
                              className="btn"
                              onClick={() =>
                                deleteAvailableSlotsForDay(
                                  daySlots
                                )
                              }
                            >
                              Eliminar disponibles del día
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn"
                            onClick={() =>
                              setExpandedDays(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [dayKey]:
                                    !expanded,
                                })
                              )
                            }
                          >
                            {expanded
                              ? "−"
                              : "+"}
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div
                          style={{
                            display:
                              "grid",

                            gap:
                              10,

                            marginTop:
                              18,

                            paddingTop:
                              18,

                            borderTop:
                              "1px solid var(--border)",
                          }}
                        >
                          {daySlots.map(
                            (
                              slot
                            ) => (
                              <div
                                key={
                                  slot.id
                                }
                                style={{
                                  display:
                                    "flex",

                                  justifyContent:
                                    "space-between",

                                  alignItems:
                                    "center",

                                  gap:
                                    16,

                                  flexWrap:
                                    "wrap",

                                  padding:
                                    "10px 0",
                                }}
                              >
                                <div>
                                  <strong>
                                    {formatSlotTime(
                                      slot.start_at
                                    )}
                                  </strong>

                                  <span
                                    style={{
                                      marginLeft:
                                        10,
                                    }}
                                  >
                                    {getServiceName(
                                      slot.service_id
                                    )}
                                  </span>

                                  <div
                                    className="muted"
                                    style={{
                                      marginTop:
                                        4,

                                      fontSize:
                                        13,
                                    }}
                                  >
                                    {slot.status ===
                                    "AVAILABLE"
                                      ? "Disponible"
                                      : slot.status ===
                                          "BOOKED"
                                        ? "Reservado"
                                        : slot.status ===
                                            "BLOCKED"
                                          ? "Bloqueado"
                                          : slot.status}
                                  </div>
                                </div>

                                {slot.status ===
                                  "AVAILABLE" && (
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      deleteSlot(
                                        slot
                                      )
                                    }
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * ESTILO INPUT
 * ============================================================
 */

const inputStyle = {
  width:
    "100%",

  padding:
    14,

  border:
    "1px solid var(--border)",

  borderRadius:
    14,

  marginTop:
    8,

  background:
    "var(--card)",

  color:
    "var(--text)",
};