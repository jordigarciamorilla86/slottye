"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { ConfirmDialog, type ConfirmDialogVariant } from "@/components/ui/ConfirmDialog";

type Confirmation = {
  title: string;
  description: string;
  variant: ConfirmDialogVariant;
  confirmLabel: string;
  resolve: (confirmed: boolean) => void;
};


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
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  function requestConfirmation(config: Omit<Confirmation, "resolve">) {
    return new Promise<boolean>((resolve) => setConfirmation({ ...config, resolve }));
  }

  function finishConfirmation(confirmed: boolean) {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  }
  

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

  // ============================================================
  // PAGINACIÓN
  // ============================================================

  const [blockPage, setBlockPage] = useState(1);
  const [dayPage, setDayPage] = useState(1);

  const BLOCKS_PER_PAGE = 5;
  const DAYS_PER_PAGE = 7;

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
      const confirmed = await requestConfirmation({
        title: "El periodo contiene reservas",
        description: `Hay ${affectedBookedSlots.length} reserva(s) dentro de este periodo. No se cancelarán; solo se bloqueará el resto del horario.`,
        variant: "warning",
        confirmLabel: "Bloquear horario libre",
      });
  
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
    const confirmed = await requestConfirmation({
      title: "Eliminar bloqueo",
      description: "El horario volverá a quedar disponible según la configuración del calendario.",
      variant: "danger",
      confirmLabel: "Eliminar bloqueo",
    });
  
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


  function isAllDayBlock(
    block: BusinessBlock
  ) {
    const start = new Date(block.start_at);
    const end = new Date(block.end_at);

    const madridTime = (value: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Madrid",
      }).format(value);

    const startDay = getDayKey(block.start_at);
    const endDay = getDayKey(block.end_at);

    return (
      madridTime(start) === "00:00" &&
      madridTime(end) === "00:00" &&
      startDay !== endDay
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


  const blockPageCount = Math.max(
    1,
    Math.ceil(blocks.length / BLOCKS_PER_PAGE)
  );
  const safeBlockPage = Math.min(blockPage, blockPageCount);
  const visibleBlocks = blocks.slice(
    (safeBlockPage - 1) * BLOCKS_PER_PAGE,
    safeBlockPage * BLOCKS_PER_PAGE
  );

  const dayPageCount = Math.max(
    1,
    Math.ceil(groupedDays.length / DAYS_PER_PAGE)
  );
  const safeDayPage = Math.min(dayPage, dayPageCount);
  const visibleGroupedDays = groupedDays.slice(
    (safeDayPage - 1) * DAYS_PER_PAGE,
    safeDayPage * DAYS_PER_PAGE
  );

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  const availableTotal =
    slots.filter(
      (slot) =>
        slot.status ===
        "AVAILABLE"
    ).length;

  const bookedTotal =
    slots.filter(
      (slot) =>
        slot.status ===
        "BOOKED"
    ).length;

  const blockedTotal =
    slots.filter(
      (slot) =>
        slot.status ===
        "BLOCKED"
    ).length;

  return (
    <div className="calendar10">
      {message && (
        <div
          role="alert"
          aria-live="polite"
          className={`calendar10-toast is-${messageType ?? "success"}`}
        >
          <span>
            {message}
          </span>

          <button
            type="button"
            onClick={
              clearMessage
            }
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      )}

      <section className="calendar10-summary">
        <div>
          <span>
            Próximos huecos
          </span>

          <strong>
            {slots.length}
          </strong>
        </div>

        <div>
          <span>
            Disponibles
          </span>

          <strong>
            {availableTotal}
          </strong>
        </div>

        <div>
          <span>
            Reservados
          </span>

          <strong>
            {bookedTotal}
          </strong>
        </div>

        <div>
          <span>
            Bloqueados
          </span>

          <strong>
            {blockedTotal}
          </strong>
        </div>
      </section>

      <section className="calendar10-card">
        <div className="calendar10-section-head">
          <span className="calendar10-icon">
            <CalendarPlus
              size={19}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="calendar10-kicker">
              Disponibilidad
            </span>

            <h2>
              Crear citas disponibles
            </h2>

            <p>
              Añade un hueco puntual, genera varios seguidos o prepara una semana completa.
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="calendar10-empty">
            <strong>
              Primero necesitas crear un servicio.
            </strong>

            <p>
              Las citas disponibles deben estar vinculadas a un servicio activo.
            </p>
          </div>
        ) : (
          <div className="calendar10-create-grid">
            <form
              onSubmit={
                createSlot
              }
              className="calendar10-create-box"
            >
              <div className="calendar10-create-title">
                <span className="calendar10-mini-icon">
                  <Plus
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <strong>
                    Cita individual
                  </strong>

                  <span>
                    Crea un único hueco.
                  </span>
                </div>
              </div>

              <label className="calendar10-field">
                <strong>
                  Servicio
                </strong>

                <select
                  required
                  value={
                    serviceId
                  }
                  onChange={(
                    event
                  ) =>
                    handleServiceChange(
                      event.target.value
                    )
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
                        {service.name}
                        {" · "}
                        {service.duration_minutes} min
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="calendar10-fields-2">
                <label className="calendar10-field">
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
                      event
                    ) =>
                      setDate(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="calendar10-field">
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
                      event
                    ) =>
                      setTime(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <label className="calendar10-field">
                <strong>
                  Duración
                </strong>

                <div className="calendar10-number">
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
                      event
                    ) =>
                      setSlotDurationMinutes(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  />

                  <span>
                    min
                  </span>
                </div>
              </label>

              <button
                className="btn primary calendar10-submit"
                disabled={
                  loading
                }
              >
                <Plus
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                {loading
                  ? "Creando..."
                  : "Añadir cita"}
              </button>
            </form>

            <form
              onSubmit={
                createBulkSlots
              }
              className="calendar10-create-box"
            >
              <div className="calendar10-create-title">
                <span className="calendar10-mini-icon">
                  <CalendarRange
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <strong>
                    Generar intervalo
                  </strong>

                  <span>
                    Crea varios huecos seguidos.
                  </span>
                </div>
              </div>

              <label className="calendar10-field">
                <strong>
                  Servicio
                </strong>

                <select
                  required
                  value={
                    bulkServiceId
                  }
                  onChange={(
                    event
                  ) =>
                    handleBulkServiceChange(
                      event.target.value
                    )
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
                        {service.name}
                        {" · "}
                        {service.duration_minutes} min
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="calendar10-field">
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
                    event
                  ) =>
                    setBulkDate(
                      event.target.value
                    )
                  }
                />
              </label>

              <div className="calendar10-fields-2">
                <label className="calendar10-field">
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
                      event
                    ) =>
                      setBulkStartTime(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="calendar10-field">
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
                      event
                    ) =>
                      setBulkEndTime(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <label className="calendar10-field">
                <strong>
                  Duración por hueco
                </strong>

                <div className="calendar10-number">
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
                      event
                    ) =>
                      setBulkDurationMinutes(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  />

                  <span>
                    min
                  </span>
                </div>
              </label>

              <button
                type="submit"
                className="btn primary calendar10-submit"
                disabled={
                  bulkLoading
                }
              >
                <CalendarRange
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                {bulkLoading
                  ? "Generando..."
                  : "Generar citas"}
              </button>
            </form>

            <form
              onSubmit={
                createWeekSlots
              }
              className="calendar10-create-box"
            >
              <div className="calendar10-create-title">
                <span className="calendar10-mini-icon">
                  <CalendarDays
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <strong>
                    Semana completa
                  </strong>

                  <span>
                    Usa tu horario habitual.
                  </span>
                </div>
              </div>

              <label className="calendar10-field">
                <strong>
                  Servicio
                </strong>

                <select
                  required
                  value={
                    weekServiceId
                  }
                  onChange={(
                    event
                  ) =>
                    handleWeekServiceChange(
                      event.target.value
                    )
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
                        {service.name}
                        {" · "}
                        {service.duration_minutes} min
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="calendar10-field">
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
                    event
                  ) =>
                    setWeekStartDate(
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="calendar10-field">
                <strong>
                  Duración por hueco
                </strong>

                <div className="calendar10-number">
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
                      event
                    ) =>
                      setWeekDurationMinutes(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  />

                  <span>
                    min
                  </span>
                </div>
              </label>

              <div className="calendar10-week-note">
                Slottye respetará los días cerrados, tus dos tramos horarios y los bloqueos existentes.
              </div>

              <button
                type="submit"
                className="btn primary calendar10-submit"
                disabled={
                  weekLoading
                }
              >
                <CalendarDays
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                {weekLoading
                  ? "Generando..."
                  : "Generar semana"}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="calendar10-grid">
        <div className="calendar10-card">
          <div className="calendar10-section-head">
            <span className="calendar10-icon">
              <Ban
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="calendar10-kicker">
                Bloqueos
              </span>

              <h2>
                Bloquear disponibilidad
              </h2>

              <p>
                Reserva vacaciones, reuniones o cierres sin aceptar nuevas citas.
              </p>
            </div>
          </div>

          <form
            onSubmit={
              createBlock
            }
            className="calendar10-block-form"
          >
            <label className="calendar10-field">
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
                  event
                ) =>
                  setBlockDate(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="calendar10-check">
              <input
                type="checkbox"
                checked={
                  blockAllDay
                }
                onChange={(
                  event
                ) =>
                  setBlockAllDay(
                    event.target.checked
                  )
                }
              />

              <span>
                Bloquear todo el día
              </span>
            </label>

            {!blockAllDay && (
              <div className="calendar10-fields-2">
                <label className="calendar10-field">
                  <strong>
                    Desde
                  </strong>

                  <input
                    type="time"
                    value={
                      blockStartTime
                    }
                    onChange={(
                      event
                    ) =>
                      setBlockStartTime(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="calendar10-field">
                  <strong>
                    Hasta
                  </strong>

                  <input
                    type="time"
                    value={
                      blockEndTime
                    }
                    onChange={(
                      event
                    ) =>
                      setBlockEndTime(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            )}

            <label className="calendar10-field">
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
                    event.target.value
                  )
                }
                placeholder="Vacaciones, reunión, cerrado..."
              />
            </label>

            <button
              type="submit"
              className="btn calendar10-block-button"
              disabled={
                blockLoading
              }
            >
              <Ban
                size={15}
                strokeWidth={2}
                aria-hidden="true"
              />

              {blockLoading
                ? "Bloqueando..."
                : "Bloquear horario"}
            </button>
          </form>
        </div>

        <div className="calendar10-card">
          <div className="calendar10-section-head">
            <span className="calendar10-icon">
              <Clock3
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="calendar10-kicker">
                Próximos cierres
              </span>

              <h2>
                Bloqueos activos
              </h2>

              <p>
                Periodos que no aceptarán nuevas reservas.
              </p>
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="calendar10-empty calendar10-empty-small">
              <strong>
                No hay bloqueos próximos
              </strong>

              <p>
                Tu agenda está disponible según el horario habitual.
              </p>
            </div>
          ) : (
            <div className="calendar10-block-list">
              {visibleBlocks.map(
                (
                  block
                ) => (
                  <article
                    key={
                      block.id
                    }
                    className="calendar10-block-row"
                  >
                    <div>
                      <strong>
                        {formatBlockDate(
                          block.start_at
                        )}
                      </strong>

                      <span>
                        {isAllDayBlock(block)
                          ? "Todo el día"
                          : `${formatBlockTime(block.start_at)} – ${formatBlockTime(block.end_at)}`}
                      </span>

                      {block.reason && (
                        <small>
                          {block.reason}
                        </small>
                      )}
                    </div>

                    <button
                      type="button"
                      className="calendar10-icon-button is-danger"
                      aria-label="Eliminar bloqueo"
                      onClick={() =>
                        deleteBlock(
                          block
                        )
                      }
                    >
                      <Trash2
                        size={15}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </button>
                  </article>
                )
              )}

              {blockPageCount > 1 && (
                <div className="calendar10-pagination">
                  <button
                    type="button"
                    className="btn"
                    disabled={safeBlockPage === 1}
                    onClick={() => setBlockPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </button>

                  <span>
                    Página {safeBlockPage} de {blockPageCount}
                  </span>

                  <button
                    type="button"
                    className="btn"
                    disabled={safeBlockPage === blockPageCount}
                    onClick={() =>
                      setBlockPage((page) => Math.min(blockPageCount, page + 1))
                    }
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="calendar10-card calendar10-upcoming">
        <div className="calendar10-section-head calendar10-upcoming-head">
          <span className="calendar10-icon">
            <CalendarDays
              size={19}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="calendar10-kicker">
              Calendario
            </span>

            <h2>
              Próxima disponibilidad
            </h2>

            <p>
              Consulta los próximos huecos y reservas agrupados por día.
            </p>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="calendar10-empty">
            <strong>
              No tienes citas creadas
            </strong>

            <p>
              Genera disponibilidad desde cualquiera de las opciones superiores.
            </p>
          </div>
        ) : (
          <div className="calendar10-days">
            {visibleGroupedDays.map(
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
                    (
                      slot
                    ) =>
                      slot.status ===
                      "AVAILABLE"
                  ).length;

                const bookedCount =
                  daySlots.filter(
                    (
                      slot
                    ) =>
                      slot.status ===
                      "BOOKED"
                  ).length;

                const blockedCount =
                  daySlots.filter(
                    (
                      slot
                    ) =>
                      slot.status ===
                      "BLOCKED"
                  ).length;

                return (
                  <article
                    className="calendar10-day"
                    key={
                      dayKey
                    }
                  >
                    <div className="calendar10-day-head">
                      <button
                        type="button"
                        className="calendar10-day-toggle"
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
                        <div>
                          <strong>
                            {formatDayTitle(
                              daySlots[
                                0
                              ].start_at
                            )}
                          </strong>

                          <span>
                            {daySlots.length} huecos
                            {" · "}
                            {availableCount} disponibles
                            {" · "}
                            {bookedCount} reservados
                            {" · "}
                            {blockedCount} bloqueados
                          </span>
                        </div>

                        {expanded ? (
                          <ChevronUp
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </button>

                      <Link
                        href={`/business-dashboard/agenda?date=${encodeURIComponent(
                          dayKey
                        )}`}
                        className="btn calendar10-view-agenda"
                      >
                        Ver en agenda

                        <ExternalLink
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </Link>
                    </div>

                    {expanded && (
                      <div className="calendar10-slot-list">
                        {daySlots.map(
                          (
                            slot
                          ) => (
                            <div
                              key={
                                slot.id
                              }
                              className="calendar10-slot"
                            >
                              <div className="calendar10-slot-main">
                                <strong>
                                  {formatSlotTime(
                                    slot.start_at
                                  )}
                                </strong>

                                <span>
                                  {getServiceName(
                                    slot.service_id
                                  )}
                                </span>
                              </div>

                              <div className="calendar10-slot-right">
                                <span
                                  className={`calendar10-status is-${slot.status.toLowerCase()}`}
                                >
                                  {slot.status === "AVAILABLE"
                                    ? "Disponible"
                                    : slot.status === "BOOKED"
                                      ? "Reservado"
                                      : slot.status === "BLOCKED"
                                        ? "Bloqueado"
                                        : slot.status}
                                </span>


                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}

            {dayPageCount > 1 && (
              <div className="calendar10-pagination calendar10-pagination-days">
                <button
                  type="button"
                  className="btn"
                  disabled={safeDayPage === 1}
                  onClick={() => setDayPage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </button>

                <span>
                  Página {safeDayPage} de {dayPageCount}
                </span>

                <button
                  type="button"
                  className="btn"
                  disabled={safeDayPage === dayPageCount}
                  onClick={() =>
                    setDayPage((page) => Math.min(dayPageCount, page + 1))
                  }
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        .calendar10 {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .calendar10-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          width: min(420px, calc(100vw - 32px));
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 15px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          box-shadow: 0 14px 40px rgba(0,0,0,.12);
        }

        .calendar10-toast.is-success {
          border: 1px solid #b9eccb;
          background: #edf9f1;
          color: #237549;
        }

        .calendar10-toast.is-error {
          border: 1px solid #ffc9c9;
          background: #fff0f0;
          color: #b42318;
        }

        .calendar10-toast.is-warning {
          border: 1px solid #f5d795;
          background: #fff8e8;
          color: #8b5a00;
        }

        .calendar10-toast button {
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          font-size: 19px;
          line-height: 1;
          cursor: pointer;
        }

        .calendar10-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .calendar10-summary > div {
          padding: 13px 15px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
        }

        .calendar10-summary span,
        .calendar10-summary strong {
          display: block;
        }

        .calendar10-summary span {
          color: var(--muted);
          font-size: 12px;
        }

        .calendar10-summary strong {
          margin-top: 3px;
          font-size: 21px;
          line-height: 1;
        }

        .calendar10-card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 12px 32px rgba(31,27,48,.025);
          overflow: hidden;
        }

        .calendar10-section-head {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 18px 19px 14px;
        }

        .calendar10-icon,
        .calendar10-mini-icon {
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .calendar10-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
        }

        .calendar10-mini-icon {
          width: 34px;
          height: 34px;
          min-width: 34px;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          align-self: center;
          padding: 0;
          margin: 0;
          line-height: 1;
        }

        .calendar10-mini-icon > :global(svg) {
          display: block;
          width: 17px;
          height: 17px;
          flex: 0 0 17px;
          margin: 0;
        }

        .calendar10-kicker {
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
        }

        .calendar10-section-head h2 {
          margin: 2px 0 3px;
          font-size: 22px;
          line-height: 1.18;
          letter-spacing: -.025em;
        }

        .calendar10-section-head p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .calendar10-create-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 0 18px 18px;
        }

        .calendar10-create-box {
          display: flex;
          flex-direction: column;
          gap: 13px;
          min-width: 0;
          padding: 15px;
          border: 1px solid #e5e2ec;
          border-radius: 14px;
          background: #fcfbff;
        }

        .calendar10-create-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 38px;
        }

        .calendar10-create-title > div > strong,
        .calendar10-create-title > div > span {
          display: block;
        }

        .calendar10-create-title > div > strong {
          font-size: 14px;
          line-height: 1.25;
        }

        .calendar10-create-title > div > span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }

        .calendar10-field {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .calendar10-field strong {
          font-size: 12.5px;
          line-height: 1.25;
        }

        .calendar10-field input,
        .calendar10-field select {
          width: 100%;
          min-width: 0;
          height: 38px;
          padding: 0 10px;
          border: 1px solid #dedbe5;
          border-radius: 9px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .calendar10-field input:focus,
        .calendar10-field select:focus {
          border-color: #b9adff;
          box-shadow: 0 0 0 3px rgba(112,87,245,.07);
        }

        .calendar10-fields-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .calendar10-number {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 7px;
        }

        .calendar10-number span {
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 700;
        }

        .calendar10-submit {
          width: 100%;
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .calendar10-week-note {
          padding: 10px 11px;
          border-radius: 9px;
          background: #f7f5ff;
          color: #625c70;
          font-size: 11.5px;
          line-height: 1.45;
        }

        .calendar10-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
        }

        .calendar10-block-form {
          display: grid;
          gap: 11px;
          padding: 0 18px 18px;
        }

        .calendar10-check {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 10px;
          background: #f8f7fb;
          font-size: 11px;
          font-weight: 750;
        }

        .calendar10-block-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .calendar10-block-list {
          display: grid;
          padding: 0 18px 18px;
        }

        .calendar10-block-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid #efedf2;
        }

        .calendar10-block-row:last-child {
          border-bottom: 0;
        }

        .calendar10-block-row strong,
        .calendar10-block-row span,
        .calendar10-block-row small {
          display: block;
        }

        .calendar10-block-row strong {
          font-size: 14px;
          text-transform: capitalize;
        }

        .calendar10-block-row span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 12px;
        }

        .calendar10-block-row small {
          margin-top: 4px;
          color: #635d69;
          font-size: 11px;
          line-height: 1.4;
        }

        .calendar10-icon-button {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .calendar10-icon-button.is-danger {
          border-color: #ffc9c9;
          color: #c72f2f;
        }

        .calendar10-upcoming-head {
          border-bottom: 1px solid #efedf2;
        }

        .calendar10-days {
          display: grid;
        }

        .calendar10-day {
          border-bottom: 1px solid #efedf2;
        }

        .calendar10-day:last-child {
          border-bottom: 0;
        }

        .calendar10-day-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }

        .calendar10-day-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-width: 0;
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .calendar10-day-toggle strong,
        .calendar10-day-toggle span {
          display: block;
        }

        .calendar10-day-toggle strong {
          font-size: 15px;
          text-transform: capitalize;
        }

        .calendar10-day-toggle span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .calendar10-view-agenda {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 750;
        }

        .calendar10-slot-list {
          display: grid;
          padding: 0 16px 10px 48px;
        }

        .calendar10-slot {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          min-height: 46px;
          padding: 8px 0;
          border-top: 1px solid #f1eff4;
        }

        .calendar10-slot-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .calendar10-slot-main strong {
          width: 48px;
          flex: 0 0 48px;
          font-size: 13px;
        }

        .calendar10-slot-main span {
          overflow: hidden;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .calendar10-slot-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .calendar10-status {
          display: inline-flex;
          align-items: center;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 850;
        }

        .calendar10-status.is-available {
          background: #eaf8ef;
          color: #24774c;
        }

        .calendar10-status.is-booked {
          background: #f0ecff;
          color: var(--accent-dark);
        }

        .calendar10-status.is-blocked {
          background: #f1eff4;
          color: #706a75;
        }

        .calendar10-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 0 2px;
          border-top: 1px solid #efedf2;
        }

        .calendar10-pagination-days {
          padding: 16px;
          border-top: 1px solid #efedf2;
        }

        .calendar10-pagination span {
          min-width: 110px;
          text-align: center;
          color: var(--muted);
          font-size: 12px;
          font-weight: 750;
        }

        .calendar10-pagination .btn {
          min-width: 92px;
          justify-content: center;
          font-size: 11px;
        }

        .calendar10-pagination .btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .calendar10-empty {
          padding: 28px 18px;
          text-align: center;
        }

        .calendar10-empty-small {
          padding-top: 16px;
        }

        .calendar10-empty strong {
          display: block;
          font-size: 13px;
        }

        .calendar10-empty p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        @media (max-width: 920px) {
          .calendar10-create-grid {
            grid-template-columns: 1fr;
          }

          .calendar10-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .calendar10 {
            gap: 10px;
            margin-top: 10px;
          }

          .calendar10-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .calendar10-section-head {
            padding: 15px;
          }

          .calendar10-create-grid,
          .calendar10-block-form,
          .calendar10-block-list {
            padding-left: 14px;
            padding-right: 14px;
          }

          .calendar10-fields-2 {
            grid-template-columns: 1fr;
          }

          .calendar10-day-head {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .calendar10-view-agenda {
            width: 100%;
            justify-content: center;
          }

          .calendar10-slot-list {
            padding-left: 14px;
            padding-right: 14px;
          }

          .calendar10-slot {
            grid-template-columns: 1fr;
          }

          .calendar10-slot-right {
            justify-content: space-between;
          }

          .calendar10-toast {
            top: 12px;
            right: 16px;
            left: 16px;
            width: auto;
          }
        }
      `}</style>
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => { if (!open) finishConfirmation(false); }}
        title={confirmation?.title ?? "Confirmar acción"}
        description={confirmation?.description ?? ""}
        variant={confirmation?.variant}
        confirmLabel={confirmation?.confirmLabel}
        onConfirm={() => finishConfirmation(true)}
      />
    </div>
  );
}

