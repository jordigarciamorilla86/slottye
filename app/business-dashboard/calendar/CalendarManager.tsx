"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";


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
      slotDurationMinutes,
      setSlotDurationMinutes,
    ] =
      useState(30);

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
      bulkDurationMinutes,
      setBulkDurationMinutes,
    ] =
      useState(30);

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
      weekDurationMinutes,
      setWeekDurationMinutes,
    ] =
      useState(30);

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
   * TRADUCCIÓN DE ERRORES DE SUPABASE
   * ============================================================
   */

  function getFriendlyError(
    error:
      | {
          message?:
            string;
        }
      | null
      | undefined,

    fallback:
      string
  ) {
    const rawMessage =
      error?.message
        ?.trim() ??
      "";

    const normalizedMessage =
      rawMessage
        .toLowerCase();

    if (
      normalizedMessage.includes(
        "row-level security"
      ) ||
      normalizedMessage.includes(
        "violates row-level security policy"
      )
    ) {
      return "Tu cuenta está bloqueada.";
    }

    if (
      normalizedMessage.includes(
        "duplicate key"
      ) ||
      normalizedMessage.includes(
        "unique constraint"
      )
    ) {
      return "Ya existe un elemento en ese horario.";
    }

    if (
      normalizedMessage.includes(
        "cuenta está bloqueada"
      ) ||
      normalizedMessage.includes(
        "cuenta esta bloqueada"
      )
    ) {
      return "Tu cuenta está bloqueada.";
    }

    return (
      rawMessage ||
      fallback
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
  function handleServiceChange(
    value: string
  ) {
    setServiceId(
      value
    );
  
    const service =
      services.find(
        (item) =>
          item.id ===
          value
      );
  
    if (service) {
      setSlotDurationMinutes(
        service.duration_minutes
      );
    }
  
    clearMessage();
  }
  function handleBulkServiceChange(
    value: string
  ) {
    setBulkServiceId(
      value
    );
  
    const service =
      services.find(
        (item) =>
          item.id ===
          value
      );
  
    if (service) {
      setBulkDurationMinutes(
        service.duration_minutes
      );
    }
  
    clearMessage();
  }

  function handleWeekServiceChange(
    value: string
  ) {
    setWeekServiceId(
      value
    );
  
    const service =
      services.find(
        (item) =>
          item.id ===
          value
      );
  
    if (service) {
      setWeekDurationMinutes(
        service.duration_minutes
      );
    }
  
    clearMessage();
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
  
    try {
      const response =
        await fetch(
          "/api/agenda/create",
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
                  "slot",
  
                businessId,
  
                serviceId:
                  service.id,
  
                startAt:
                  start.toISOString(),
  
                endAt:
                  end.toISOString(),
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          getFriendlyError(
            result,
            result.error ??
              "No se ha podido crear la disponibilidad."
          )
        );
  
        return;
      }
  
      /*
       * La API devuelve el slot creado.
       */
  
      const rawSlot =
        Array.isArray(
          result.data
        )
          ? result.data[0]
          : result.data;
  
      const createdSlot =
        rawSlot &&
        typeof rawSlot ===
          "object"
          ? {
              id:
                rawSlot.id ??
                result.slotId,
  
              service_id:
                rawSlot.service_id ??
                service.id,
  
              start_at:
                rawSlot.start_at ??
                start.toISOString(),
  
              end_at:
                rawSlot.end_at ??
                end.toISOString(),
  
              status:
                rawSlot.status ??
                "AVAILABLE",
            }
          : {
              id:
                result.slotId,
  
              service_id:
                service.id,
  
              start_at:
                start.toISOString(),
  
              end_at:
                end.toISOString(),
  
              status:
                "AVAILABLE",
            };
  
      if (
        !createdSlot.id
      ) {
        /*
         * La creación se ha realizado, pero no tenemos
         * UUID suficiente para actualizar el estado local.
         * Evitamos inventarlo.
         */
  
        showWarning(
          "La disponibilidad se ha creado. Recarga la página para verla."
        );
  
        setDate("");
        setTime("");
  
        return;
      }
  
      /*
       * Avisar a suscriptores.
       */
  
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
                createdSlot.id,
              ],
            }),
        }
      ).catch(
        (
          error
        ) => {
          console.error(
            "Error notificando nuevas citas:",
            error
          );
        }
      );
  
      setSlots(
        (
          current
        ) =>
          [
            ...current,
            createdSlot,
          ].sort(
            (
              a,
              b
            ) =>
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
    } catch (
      error
    ) {
      console.error(
        "Error creating calendar slot:",
        error
      );
  
      showError(
        "No se ha podido crear la disponibilidad."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * ELIMINAR UNA CITA
   * ============================================================
   */

  async function deleteSlot(
    slot:
      Slot
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
  
    if (
      !confirmed
    ) {
      return;
    }
  
    clearMessage();
  
    try {
      const response =
        await fetch(
          "/api/business/calendar/slots",
          {
            method:
              "DELETE",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                slotIds: [
                  slot.id,
                ],
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido eliminar el hueco."
        );
  
        return;
      }
  
      const deletedIds =
        new Set<string>(
          Array.isArray(
            result.deletedIds
          )
            ? result.deletedIds
            : []
        );
  
      const blockedIds =
        new Set<string>(
          Array.isArray(
            result.blockedIds
          )
            ? result.blockedIds
            : []
        );
  
      /*
       * ==========================================================
       * ACTUALIZAR ESTADO LOCAL
       * ==========================================================
       */
  
      setSlots(
        (
          current
        ) =>
          current
            .filter(
              (
                item
              ) =>
                !deletedIds.has(
                  item.id
                )
            )
            .map(
              (
                item
              ) =>
                blockedIds.has(
                  item.id
                )
                  ? {
                      ...item,
  
                      status:
                        "BLOCKED",
                    }
                  : item
            )
      );
  
      /*
       * ==========================================================
       * MENSAJE
       * ==========================================================
       */
  
      if (
        blockedIds.has(
          slot.id
        )
      ) {
        showWarning(
          "Este hueco tenía historial de reservas. Se ha bloqueado en lugar de eliminarse."
        );
  
        return;
      }
  
      if (
        deletedIds.has(
          slot.id
        )
      ) {
        showSuccess(
          "Hueco eliminado definitivamente."
        );
  
        return;
      }
  
      /*
       * No debería ocurrir, pero evitamos mostrar
       * un éxito falso si la API no devuelve acción.
       */
  
      showWarning(
        "La operación se ha realizado, pero no se ha podido determinar el estado final del hueco."
      );
    } catch (
      error
    ) {
      console.error(
        "Error deleting calendar slot:",
        error
      );
  
      showError(
        "No se ha podido eliminar el hueco."
      );
    }
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
        (
          slot
        ) =>
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
  
    if (
      !confirmed
    ) {
      return;
    }
  
    clearMessage();
  
    const ids =
      availableSlots.map(
        (
          slot
        ) =>
          slot.id
      );
  
    try {
      const response =
        await fetch(
          "/api/business/calendar/slots",
          {
            method:
              "DELETE",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                slotIds:
                  ids,
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se han podido eliminar los huecos."
        );
  
        return;
      }
  
      const deletedIds =
        new Set<string>(
          Array.isArray(
            result.deletedIds
          )
            ? result.deletedIds
            : []
        );
  
      const blockedIds =
        new Set<string>(
          Array.isArray(
            result.blockedIds
          )
            ? result.blockedIds
            : []
        );
  
      /*
       * ==========================================================
       * ACTUALIZAR ESTADO LOCAL
       * ==========================================================
       */
  
      setSlots(
        (
          current
        ) =>
          current
            .filter(
              (
                slot
              ) =>
                !deletedIds.has(
                  slot.id
                )
            )
            .map(
              (
                slot
              ) =>
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
  
      /*
       * ==========================================================
       * RESULTADO
       * ==========================================================
       */
  
      const deletedCount =
        deletedIds.size;
  
      const blockedCount =
        blockedIds.size;
  
      if (
        deletedCount >
          0 &&
        blockedCount >
          0
      ) {
        showWarning(
          `${deletedCount} huecos eliminados · ${blockedCount} bloqueados porque tenían historial de reservas.`
        );
  
        return;
      }
  
      if (
        deletedCount >
        0
      ) {
        showSuccess(
          `${deletedCount} huecos eliminados correctamente.`
        );
  
        return;
      }
  
      if (
        blockedCount >
        0
      ) {
        showWarning(
          `${blockedCount} huecos tenían historial de reservas y se han bloqueado.`
        );
  
        return;
      }
  
      showWarning(
        "No se ha modificado ningún hueco."
      );
    } catch (
      error
    ) {
      console.error(
        "Error deleting calendar day slots:",
        error
      );
  
      showError(
        "No se han podido eliminar los huecos."
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
  
    /*
     * ============================================================
     * GENERAR HUECOS
     * ============================================================
     *
     * Seguimos filtrando aquí los bloqueos que ya conocemos
     * para dar una respuesta inmediata al usuario.
     *
     * La API / RPC volverá a comprobarlos en servidor,
     * por lo que esta comprobación NO es nuestra frontera
     * de seguridad.
     */
  
    const rows: {
      start_at: string;
      end_at: string;
    }[] = [];
  
    let current =
      new Date(
        start
      );
  
    let locallyBlockedCount =
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
        locallyBlockedCount++;
      } else {
        rows.push({
          start_at:
            current.toISOString(),
  
          end_at:
            end.toISOString(),
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
        locallyBlockedCount >
          0
          ? "Todos los huecos coinciden con horarios bloqueados."
          : "No cabe ninguna cita dentro de ese intervalo."
      );
  
      return;
    }
  
    /*
     * ============================================================
     * CREAR MEDIANTE API SEGURA
     * ============================================================
     */
  
    setBulkLoading(
      true
    );
  
    try {
      const response =
        await fetch(
          "/api/business/calendar/slots/bulk",
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
  
                serviceId:
                  service.id,
  
                slots:
                  rows,
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido crear la disponibilidad."
        );
  
        return;
      }
  
      /*
       * ============================================================
       * NORMALIZAR HUECOS DEVUELTOS
       * ============================================================
       */
  
      const newSlots:
        Slot[] =
        Array.isArray(
          result.slots
        )
          ? result.slots
              .filter(
                (
                  slot:
                    unknown
                ) =>
                  typeof slot ===
                    "object" &&
                  slot !==
                    null
              )
              .map(
                (
                  slot:
                    {
                      id?: unknown;
                      service_id?: unknown;
                      start_at?: unknown;
                      end_at?: unknown;
                      status?: unknown;
                    }
                ) => ({
                  id:
                    String(
                      slot.id ??
                        ""
                    ),
  
                  service_id:
                    typeof slot.service_id ===
                      "string"
                      ? slot.service_id
                      : service.id,
  
                  start_at:
                    String(
                      slot.start_at ??
                        ""
                    ),
  
                  end_at:
                    String(
                      slot.end_at ??
                        ""
                    ),
  
                  status:
                    typeof slot.status ===
                      "string"
                      ? slot.status
                      : "AVAILABLE",
                })
              )
              .filter(
                (
                  slot: Slot
                ) =>
                  !!slot.id &&
                  !!slot.start_at &&
                  !!slot.end_at
              )
          : [];
  
      /*
       * ============================================================
       * ACTUALIZAR ESTADO LOCAL
       * ============================================================
       */
  
      if (
        newSlots.length >
        0
      ) {
        setSlots(
          (
            currentSlots
          ) =>
            [
              ...currentSlots,
              ...newSlots,
            ].sort(
              (
                a,
                b
              ) =>
                new Date(
                  a.start_at
                ).getTime() -
                new Date(
                  b.start_at
                ).getTime()
            )
        );
  
        /*
         * ==========================================================
         * NOTIFICAR A SUSCRIPTORES
         * ==========================================================
         */
  
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
                    (
                      slot
                    ) =>
                      slot.id
                  ),
              }),
          }
        ).catch(
          (
            error
          ) => {
            console.error(
              "Error notificando nuevas citas:",
              error
            );
          }
        );
      }
  
      /*
       * ============================================================
       * LIMPIAR FORMULARIO
       * ============================================================
       */
  
      setBulkDate("");
      setBulkStartTime("");
      setBulkEndTime("");
  
      /*
       * ============================================================
       * CONTADORES
       * ============================================================
       *
       * locallyBlockedCount:
       * bloqueos que ya conocía el navegador.
       *
       * serverBlockedCount:
       * bloqueos detectados nuevamente por servidor
       * entre la preparación y la escritura.
       */
  
      const serverBlockedCount =
        typeof result.blockedCount ===
          "number"
          ? result.blockedCount
          : 0;
  
      const existingCount =
        typeof result.existingCount ===
          "number"
          ? result.existingCount
          : 0;
  
      const invalidCount =
        typeof result.invalidCount ===
          "number"
          ? result.invalidCount
          : 0;
  
      const blockedCount =
        locallyBlockedCount +
        serverBlockedCount;
  
      const createdCount =
        typeof result.createdCount ===
          "number"
          ? result.createdCount
          : newSlots.length;
  
      /*
       * ============================================================
       * MENSAJE
       * ============================================================
       */
  
      const details:
        string[] =
        [];
  
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
        invalidCount >
        0
      ) {
        details.push(
          `${invalidCount} no válidas`
        );
      }
  
      if (
        createdCount ===
          0 &&
        details.length >
          0
      ) {
        showWarning(
          `No se ha creado ninguna cita · ${details.join(
            " · "
          )}.`
        );
  
        return;
      }
  
      if (
        createdCount ===
        0
      ) {
        showWarning(
          "No se ha creado ninguna cita."
        );
  
        return;
      }
  
      if (
        details.length >
        0
      ) {
        showWarning(
          `Se han creado ${createdCount} citas correctamente · ${details.join(
            " · "
          )}.`
        );
      } else {
        showSuccess(
          `Se han creado ${createdCount} citas correctamente.`
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Error creating bulk calendar slots:",
        error
      );
  
      showError(
        "No se han podido crear las disponibilidades."
      );
    } finally {
      setBulkLoading(
        false
      );
    }
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
  
    /*
     * ============================================================
     * GENERAR HUECOS DE LA SEMANA
     * ============================================================
     */
  
    const rows: {
      start_at:
        string;
  
      end_at:
        string;
    }[] = [];
  
    let locallyBlockedCount =
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
  
        /*
         * No generamos huecos pasados.
         */
  
        if (
          current >
          new Date()
        ) {
          /*
           * Esta comprobación local sirve para UX.
           * El servidor volverá a comprobar bloqueos.
           */
  
          if (
            overlapsBlock(
              current,
              end
            )
          ) {
            locallyBlockedCount++;
          } else {
            rows.push({
              start_at:
                current.toISOString(),
  
              end_at:
                end.toISOString(),
            });
          }
        }
  
        current =
          end;
      }
    }
  
    /*
     * ============================================================
     * RECORRER LOS 7 DÍAS
     * ============================================================
     */
  
    for (
      let offset =
        0;
      offset <
        7;
      offset++
    ) {
      const currentDate =
        new Date(
          startDate
        );
  
      currentDate.setDate(
        startDate.getDate() +
          offset
      );
  
      /*
       * JS:
       * domingo = 0
       *
       * Slottye:
       * lunes = 0
       */
  
      const slottyeDay =
        (
          currentDate.getDay() +
          6
        ) %
        7;
  
      const schedule =
        businessHours.find(
          (
            hour
          ) =>
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
        currentDate,
        schedule.open_time,
        schedule.close_time
      );
  
      createRange(
        currentDate,
        schedule.open_time_2,
        schedule.close_time_2
      );
    }
  
    /*
     * ============================================================
     * SIN HUECOS
     * ============================================================
     */
  
    if (
      rows.length ===
      0
    ) {
      showError(
        locallyBlockedCount >
          0
          ? "No se pueden generar citas: todos los huecos disponibles coinciden con bloqueos."
          : "No se pueden generar citas para esa semana."
      );
  
      return;
    }
  
    /*
     * ============================================================
     * CREAR MEDIANTE API
     * ============================================================
     */
  
    setWeekLoading(
      true
    );
  
    try {
      const response =
        await fetch(
          "/api/business/calendar/slots/bulk",
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
  
                serviceId:
                  selectedServiceId,
  
                slots:
                  rows,
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido crear la disponibilidad."
        );
  
        return;
      }
  
      /*
       * ============================================================
       * NORMALIZAR HUECOS CREADOS
       * ============================================================
       */
  
      const newSlots:
        Slot[] =
        Array.isArray(
          result.slots
        )
          ? result.slots
              .filter(
                (
                  slot:
                    unknown
                ) =>
                  typeof slot ===
                    "object" &&
                  slot !==
                    null
              )
              .map(
                (
                  slot:
                    {
                      id?: unknown;
                      service_id?: unknown;
                      start_at?: unknown;
                      end_at?: unknown;
                      status?: unknown;
                    }
                ) => ({
                  id:
                    String(
                      slot.id ??
                        ""
                    ),
  
                  service_id:
                    typeof slot.service_id ===
                      "string"
                      ? slot.service_id
                      : selectedServiceId,
  
                  start_at:
                    String(
                      slot.start_at ??
                        ""
                    ),
  
                  end_at:
                    String(
                      slot.end_at ??
                        ""
                    ),
  
                  status:
                    typeof slot.status ===
                      "string"
                      ? slot.status
                      : "AVAILABLE",
                })
              )
              .filter(
                (
                  slot: Slot
                ) =>
                  !!slot.id &&
                  !!slot.start_at &&
                  !!slot.end_at
              )
          : [];
  
      /*
       * ============================================================
       * ACTUALIZAR CALENDARIO LOCAL
       * ============================================================
       */
  
      if (
        newSlots.length >
        0
      ) {
        setSlots(
          (
            current
          ) =>
            [
              ...current,
              ...newSlots,
            ].sort(
              (
                a,
                b
              ) =>
                new Date(
                  a.start_at
                ).getTime() -
                new Date(
                  b.start_at
                ).getTime()
            )
        );
  
        /*
         * ==========================================================
         * AVISAR A SUSCRIPTORES
         * ==========================================================
         */
  
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
                    (
                      slot
                    ) =>
                      slot.id
                  ),
              }),
          }
        ).catch(
          (
            error
          ) => {
            console.error(
              "Error notificando nuevas citas:",
              error
            );
          }
        );
      }
  
      /*
       * ============================================================
       * CONTADORES
       * ============================================================
       */
  
      const serverBlockedCount =
        typeof result.blockedCount ===
          "number"
          ? result.blockedCount
          : 0;
  
      const existingCount =
        typeof result.existingCount ===
          "number"
          ? result.existingCount
          : 0;
  
      const invalidCount =
        typeof result.invalidCount ===
          "number"
          ? result.invalidCount
          : 0;
  
      const createdCount =
        typeof result.createdCount ===
          "number"
          ? result.createdCount
          : newSlots.length;
  
      const blockedCount =
        locallyBlockedCount +
        serverBlockedCount;
  
      const details:
        string[] =
        [];
  
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
        invalidCount >
        0
      ) {
        details.push(
          `${invalidCount} no válidas`
        );
      }
  
      /*
       * ============================================================
       * MENSAJE FINAL
       * ============================================================
       */
  
      if (
        createdCount ===
          0 &&
        details.length >
          0
      ) {
        showWarning(
          `No se ha creado ninguna cita esta semana · ${details.join(
            " · "
          )}.`
        );
  
        return;
      }
  
      if (
        createdCount ===
        0
      ) {
        showWarning(
          "No se ha creado ninguna cita esta semana."
        );
  
        return;
      }
  
      if (
        details.length >
        0
      ) {
        showWarning(
          `Semana generada. Se han creado ${createdCount} citas correctamente · ${details.join(
            " · "
          )}.`
        );
      } else {
        showSuccess(
          `Semana generada correctamente. Se han creado ${createdCount} citas disponibles.`
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Error creating weekly calendar slots:",
        error
      );
  
      showError(
        "No se han podido crear las disponibilidades de la semana."
      );
    } finally {
      setWeekLoading(
        false
      );
    }
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
  
    /*
     * ============================================================
     * COMPROBACIÓN LOCAL DE DUPLICADO
     * ============================================================
     *
     * Solo sirve para UX.
     * El servidor vuelve a comprobarlo.
     */
  
    const duplicateBlock =
      blocks.some(
        (
          block
        ) =>
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
  
    /*
     * ============================================================
     * COMPROBAR RESERVAS EXISTENTES
     * ============================================================
     *
     * No se cancelarán.
     * Conservamos el aviso que ya tenía CalendarManager.
     */
  
    const affectedBookedSlots =
      slots.filter(
        (
          slot
        ) =>
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
        return;
      }
    }
  
    setBlockLoading(
      true
    );
  
    try {
      /*
       * ==========================================================
       * CREAR MEDIANTE API TRANSACCIONAL
       * ==========================================================
       */
  
      const response =
        await fetch(
          "/api/business/calendar/blocks",
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
  
                startAt:
                  start.toISOString(),
  
                endAt:
                  end.toISOString(),
  
                reason:
                  blockReason.trim(),
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido crear el bloqueo."
        );
  
        return;
      }
  
      /*
       * ==========================================================
       * BLOQUE DEVUELTO
       * ==========================================================
       */
  
      const block =
        result.block;
  
      if (
        !block ||
        typeof block.id !==
          "string"
      ) {
        showWarning(
          "El bloqueo se ha creado, pero no se ha podido actualizar la pantalla automáticamente."
        );
  
        return;
      }
  
      /*
       * ==========================================================
       * ACTUALIZAR SLOTS AFECTADOS
       * ==========================================================
       */
  
      const blockedSlotIds =
        new Set<string>(
          Array.isArray(
            result.blockedSlotIds
          )
            ? result.blockedSlotIds.filter(
                (
                  id:
                    unknown
                ):
                  id is string =>
                  typeof id ===
                  "string"
              )
            : []
        );
  
      if (
        blockedSlotIds.size >
        0
      ) {
        setSlots(
          (
            current
          ) =>
            current.map(
              (
                slot
              ) =>
                blockedSlotIds.has(
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
  
      /*
       * ==========================================================
       * AÑADIR BLOQUEO AL ESTADO LOCAL
       * ==========================================================
       */
  
      setBlocks(
        (
          current
        ) =>
          [
            ...current,
  
            {
              id:
                block.id,
  
              start_at:
                block.start_at,
  
              end_at:
                block.end_at,
  
              reason:
                block.reason ??
                null,
            },
          ].sort(
            (
              a,
              b
            ) =>
              new Date(
                a.start_at
              ).getTime() -
              new Date(
                b.start_at
              ).getTime()
          )
      );
  
      /*
       * ==========================================================
       * LIMPIAR FORMULARIO
       * ==========================================================
       */
  
      setBlockDate("");
      setBlockStartTime("");
      setBlockEndTime("");
      setBlockReason("");
  
      setBlockAllDay(
        false
      );
  
      /*
       * ==========================================================
       * MENSAJE
       * ==========================================================
       */
  
      const blockedCount =
        typeof result.blockedCount ===
          "number"
          ? result.blockedCount
          : blockedSlotIds.size;
  
      const bookedCount =
        typeof result.bookedCount ===
          "number"
          ? result.bookedCount
          : affectedBookedSlots.length;
  
      if (
        blockedCount >
          0 &&
        bookedCount >
          0
      ) {
        showWarning(
          `Horario bloqueado correctamente. ${blockedCount} huecos retirados de la disponibilidad y ${bookedCount} reserva(s) existentes conservadas.`
        );
  
        return;
      }
  
      if (
        blockedCount >
        0
      ) {
        showSuccess(
          `Horario bloqueado correctamente. ${blockedCount} huecos retirados de la disponibilidad.`
        );
  
        return;
      }
  
      if (
        bookedCount >
        0
      ) {
        showWarning(
          `Horario bloqueado correctamente. Las ${bookedCount} reserva(s) existentes se han conservado.`
        );
  
        return;
      }
  
      showSuccess(
        "Horario bloqueado correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error creating calendar block:",
        error
      );
  
      showError(
        "No se ha podido crear el bloqueo."
      );
    } finally {
      setBlockLoading(
        false
      );
    }
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
  
    try {
      const response =
        await fetch(
          "/api/business/calendar/blocks",
          {
            method:
              "DELETE",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                blockId:
                  block.id,
              }),
          }
        );
  
      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido eliminar el bloqueo."
        );
  
        return;
      }
  
      setBlocks(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              block.id
          )
      );
  
      /*
       * Seguimos respetando la regla existente:
       *
       * quitar el bloqueo NO reactiva automáticamente
       * los slots que quedaron BLOCKED.
       */
  
      showWarning(
        "Bloqueo eliminado. Los huecos bloqueados no se reactivan automáticamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error deleting calendar block:",
        error
      );
  
      showError(
        "No se ha podido eliminar el bloqueo."
      );
    }
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
                  handleServiceChange(
                    e.target.value
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
    Duración exacta (minutos)
  </strong>

  <input
    required
    type="number"
    min={1}
    max={1440}
    step={1}
    value={
      slotDurationMinutes
    }
    onChange={(
      e
    ) =>
      setSlotDurationMinutes(
        Number(
          e.target.value
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
        6,

      fontSize:
        12,
    }}
  >
    Duración seleccionada:{" "}
    {slotDurationMinutes} min
  </div>
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
  Slottye creará automáticamente todos los huecos usando la duración que indiques.
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
                handleBulkServiceChange(
                  e.target.value
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
    Duración de cada hueco (minutos)
  </strong>

  <input
    required
    type="number"
    min={1}
    max={1440}
    step={1}
    value={
      bulkDurationMinutes
    }
    onChange={(
      e
    ) =>
      setBulkDurationMinutes(
        Number(
          e.target.value
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
        6,

      fontSize:
        12,
    }}
  >
    Cada disponibilidad durará{" "}
    {bulkDurationMinutes} min.
  </div>
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
  Slottye utilizará el horario configurado del negocio y generará huecos con la duración que indiques.
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
                handleWeekServiceChange(
                  e.target.value
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
    Duración de cada hueco (minutos)
  </strong>

  <input
    required
    type="number"
    min={1}
    max={1440}
    step={1}
    value={
      weekDurationMinutes
    }
    onChange={(
      e
    ) =>
      setWeekDurationMinutes(
        Number(
          e.target.value
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
        6,

      fontSize:
        12,
    }}
  >
    Cada disponibilidad durará{" "}
    {weekDurationMinutes} min.
  </div>
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