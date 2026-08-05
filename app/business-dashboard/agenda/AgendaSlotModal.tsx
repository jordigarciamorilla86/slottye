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

type Props = {
  businessId: string;

  date: Date;

  services: Service[];

  onClose: () => void;
};

type Mode =
  | "menu"
  | "manual"
  | "availability"
  | "block";

function formatDate(
  date: Date
) {
  return date.toLocaleDateString(
    "es-ES",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(
  date: Date
) {
  return date.toLocaleTimeString(
    "es-ES",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function timeInputValue(
  date: Date
) {
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

function dateWithTime(
  date: Date,
  time: string
) {
  const [
    hour,
    minute,
  ] =
    time
      .split(":")
      .map(Number);

  const result =
    new Date(
      date
    );

  result.setHours(
    hour,
    minute,
    0,
    0
  );

  return result;
}

function normalizeToExactMinute(
  date: Date
) {
  const normalizedDate =
    new Date(date);

  normalizedDate.setSeconds(
    0,
    0
  );

  return normalizedDate;
}

function addMinutes(
  date: Date,
  minutes: number
) {
  return new Date(
    date.getTime() +
      minutes *
        60 *
        1000
  );
}

function formatDuration(
  minutes: number
) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainingMinutes =
    minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1
      ? "1 hora"
      : `${hours} horas`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

export default function AgendaSlotModal({
  businessId,
  date,
  services,
  onClose,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

    const [
      selectedTime,
      setSelectedTime,
    ] =
      useState(
        timeInputValue(
          date
        )
      );
    
    const selectedDate =
      useMemo(
        () =>
          dateWithTime(
            date,
            selectedTime
          ),
        [
          date,
          selectedTime,
        ]
      );
  /*
   * ============================================================
   * MODO
   * ============================================================
   */

  const [
    mode,
    setMode,
  ] =
    useState<Mode>(
      "menu"
    );

  /*
   * ============================================================
   * RESERVA MANUAL
   * ============================================================
   */

  const [
    customerName,
    setCustomerName,
  ] =
    useState("");

  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] =
    useState("");

  const [
    manualServiceId,
    setManualServiceId,
  ] =
    useState("");

  const [
    manualDurationMinutes,
    setManualDurationMinutes,
  ] =
    useState(30);

  const [
    notes,
    setNotes,
  ] =
    useState("");

  /*
   * ============================================================
   * DISPONIBILIDAD
   * ============================================================
   */

  const [
    availabilityServiceId,
    setAvailabilityServiceId,
  ] =
    useState("");

  const [
    availabilityDurationMinutes,
    setAvailabilityDurationMinutes,
  ] =
    useState(30);

  /*
   * ============================================================
   * ESTADO GENERAL
   * ============================================================
   */

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

  const [
    blockDurationMinutes,
    setBlockDurationMinutes,
  ] =
    useState(30);

  const [
    blockReason,
    setBlockReason,
  ] =
    useState("");

  /*
   * ============================================================
   * SERVICIOS ACTIVOS
   * ============================================================
   */

  const activeServices =
    useMemo(
      () =>
        services.filter(
          (service) =>
            service.active
        ),
      [services]
    );

  /*
   * ============================================================
   * SERVICIO DE DISPONIBILIDAD
   * ============================================================
   */

  const availabilityService =
    activeServices.find(
      (service) =>
        service.id ===
        availabilityServiceId
    ) ?? null;

  function handleAvailabilityServiceChange(
    value: string
  ) {
    setAvailabilityServiceId(
      value
    );

    const service =
      activeServices.find(
        (item) =>
          item.id ===
          value
      );

    if (service) {
      setAvailabilityDurationMinutes(
        service.duration_minutes
      );
    }

    setError(
      ""
    );
  }

  /*
   * ============================================================
   * CAMBIAR SERVICIO DE RESERVA MANUAL
   * ============================================================
   */

  function handleManualServiceChange(
    value: string
  ) {
    setManualServiceId(
      value
    );

    const service =
      activeServices.find(
        (item) =>
          item.id ===
          value
      );

    if (service) {
      setManualDurationMinutes(
        service.duration_minutes
      );
    }
  }

  /*
   * ============================================================
   * CREAR RESERVA MANUAL
   * ============================================================
   */

  async function createManualBooking(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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
      !Number.isInteger(
        manualDurationMinutes
      ) ||
      manualDurationMinutes <=
        0 ||
      manualDurationMinutes >
        1440
    ) {
      setError(
        "La duración no es válida."
      );

      return;
    }

    setLoading(
      true
    );

    const startAt =
      normalizeToExactMinute(
        selectedDate
      );

    const endAt =
      addMinutes(
        startAt,
        manualDurationMinutes
      );

    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "create_manual_booking",
        {
          p_business_id:
            businessId,

          p_service_id:
            manualServiceId ||
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
          "Error creating manual booking:",
          rpcError
        );
      
        const message =
          rpcError.message
            .toLowerCase();
      
        if (
          message.includes(
            "cuenta está bloqueada"
          ) ||
          message.includes(
            "cuenta esta bloqueada"
          )
        ) {
          setError(
            "Tu cuenta está bloqueada."
          );
        } else if (
          message.includes(
            "reserva slottye"
          ) ||
          message.includes(
            "online booking"
          )
        ) {
          setError(
            "Ya existe una reserva de Slottye en ese horario."
          );
        } else if (
          message.includes(
            "reserva manual"
          ) ||
          message.includes(
            "manual booking"
          )
        ) {
          setError(
            "Ya existe otra reserva manual que coincide con ese horario."
          );
        } else if (
          message.includes(
            "horario está bloqueado"
          ) ||
          message.includes(
            "horario esta bloqueado"
          ) ||
          message.includes(
            "block"
          )
        ) {
          setError(
            "No puedes crear la reserva porque ese horario está bloqueado."
          );
        } else if (
          message.includes(
            "nombre del cliente"
          )
        ) {
          setError(
            "Debes indicar el nombre del cliente."
          );
        } else if (
          message.includes(
            "servicio"
          )
        ) {
          setError(
            "El servicio seleccionado no es válido."
          );
        } else {
          setError(
            rpcError.message ||
              "No se ha podido crear la reserva manual."
          );
        }
      
        setLoading(
          false
        );
      
        return;
      }
    /*
     * La RPC ya se encarga de retirar
     * todos los slots AVAILABLE que
     * coincidan con la reserva manual.
     */

    setLoading(
      false
    );

    onClose();
  }

  /*
   * ============================================================
   * CREAR DISPONIBILIDAD
   * ============================================================
   */

  async function createAvailability(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const service =
      activeServices.find(
        (item) =>
          item.id ===
          availabilityServiceId
      );

    if (!service) {
      setError(
        "Selecciona un servicio."
      );

      return;
    }

    if (
      !Number.isInteger(
        availabilityDurationMinutes
      ) ||
      availabilityDurationMinutes <=
        0 ||
      availabilityDurationMinutes >
        1440
    ) {
      setError(
        "La duración de la disponibilidad no es válida."
      );

      return;
    }

    const startAt =
      normalizeToExactMinute(
        selectedDate
      );

    const endAt =
      addMinutes(
        startAt,
        availabilityDurationMinutes
      );

    /*
     * No permitimos crear disponibilidad
     * completamente en el pasado.
     */

    if (
      endAt <=
      new Date()
    ) {
      setError(
        "No puedes crear disponibilidad en un horario que ya ha pasado."
      );

      return;
    }

    setLoading(
      true
    );

    const {
      data:
        createdSlot,
      error:
        rpcError,
    } =
      await supabase.rpc(
        "create_agenda_slot",
        {
          p_business_id:
            businessId,

          p_service_id:
            service.id,

          p_start_at:
            startAt.toISOString(),

          p_end_at:
            endAt.toISOString(),
        }
      );

    if (rpcError) {
      console.error(
        "Error creating agenda slot:",
        rpcError
      );

      const message =
        rpcError.message
          .toLowerCase();

          if (
            message.includes(
              "cuenta está bloqueada"
            ) ||
            message.includes(
              "cuenta esta bloqueada"
            )
          ) {
            setError(
              "Tu cuenta está bloqueada."
            );
          } else if (
            message.includes(
              "online booking"
            )
          ) {
        setError(
          "No puedes crear disponibilidad porque ya existe una reserva de Slottye en ese horario."
        );
      } else if (
        message.includes(
          "manual booking"
        )
      ) {
        setError(
          "No puedes crear disponibilidad porque ya existe una reserva manual en ese horario."
        );
      } else if (
        message.includes(
          "already a slot"
        )
      ) {
        setError(
          "Ya existe un hueco disponible o reservado que coincide con ese horario."
        );
      } else if (
        message.includes(
          "invalid service"
        )
      ) {
        setError(
          "El servicio seleccionado no es válido."
        );
      } else {
        setError(
          "No se ha podido crear la disponibilidad."
        );
      }

      setLoading(
        false
      );

      return;
    }

    /*
     * ==========================================================
     * NOTIFICAR A SUSCRIPTORES
     * ==========================================================
     *
     * Mismo comportamiento que el calendario tradicional.
     * ==========================================================
     */

    const createdSlotRecord =
      Array.isArray(
        createdSlot
      )
        ? createdSlot[0]
        : createdSlot;

    const createdSlotId =
      createdSlotRecord &&
      typeof createdSlotRecord ===
        "object" &&
      "id" in createdSlotRecord &&
      typeof createdSlotRecord.id ===
        "string"
        ? createdSlotRecord.id
        : null;

    if (createdSlotId) {
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
                createdSlotId,
              ],
            }),
        }
      ).catch(
        (
          notificationError
        ) => {
          console.error(
            "Error notificando nueva disponibilidad:",
            notificationError
          );
        }
      );
    }

    setLoading(
      false
    );

    /*
     * El padre vuelve a cargar los datos
     * de la semana al cerrar el modal.
     */

    onClose();
  }

  /*
   * ============================================================
   * VOLVER AL MENÚ
   * ============================================================
   */

  function goBack() {
    setError("");

    setMode(
      "menu"
    );
  }

  async function createBlock(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
  
    setError("");
  
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
        "La duración del bloqueo no es válida."
      );
  
      return;
    }
  
    const startAt =
      normalizeToExactMinute(
        selectedDate
      );
  
    const endAt =
      addMinutes(
        startAt,
        blockDurationMinutes
      );
  
    if (
      endAt <=
      new Date()
    ) {
      setError(
        "No puedes bloquear un horario que ya ha pasado."
      );
  
      return;
    }
  
    setLoading(
      true
    );
  
    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "create_agenda_block",
        {
          p_business_id:
            businessId,
  
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
        "Error creating agenda block:",
        rpcError
      );
  
      const message =
        rpcError.message
          .toLowerCase();
  
      if (
        message.includes(
          "cuenta está bloqueada"
        ) ||
        message.includes(
          "cuenta esta bloqueada"
        )
      ) {
        setError(
          "Tu cuenta está bloqueada."
        );
      } else if (
        message.includes(
          "not authorized"
        )
      ) {
        setError(
          "No tienes permisos para bloquear este horario."
        );
      } else if (
        message.includes(
          "invalid block dates"
        )
      ) {
        setError(
          "El horario seleccionado no es válido."
        );
      } else if (
        message.includes(
          "online booking"
        ) ||
        message.includes(
          "reserva slottye"
        )
      ) {
        setError(
          "No puedes bloquear el horario porque ya contiene una reserva de Slottye."
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
          "No puedes bloquear el horario porque ya contiene una reserva manual."
        );
      } else {
        setError(
          rpcError.message ||
            "No se ha podido bloquear el horario."
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
  
    onClose();
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
          1000,

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
          onClose();
        }
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            520,

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
        {/* ==================================================
            CABECERA
            ================================================== */}

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
              {formatTime(
                selectedDate
              )}
            </h2>

            <div
              className="muted"
              style={{
                textTransform:
                  "capitalize",
              }}
            >
              {formatDate(
                date
              )}
            </div>
            <label
  style={{
    display:
      "block",

    marginTop:
      16,

    maxWidth:
      180,
  }}
>
  <strong
    style={{
      display:
        "block",

      fontSize:
        13,
    }}
  >
    Hora de inicio
  </strong>

  <input
    type="time"
    step={60}
    value={
      selectedTime
    }
    disabled={
      loading
    }
    onChange={(
      event
    ) => {
      setSelectedTime(
        event.target.value
      );

      setError(
        ""
      );
    }}
    style={{
      ...inputStyle,

      marginBottom:
        0,
    }}
  />
</label>
          </div>

          <button
            type="button"
            className="btn"
            disabled={
              loading
            }
            onClick={
              onClose
            }
            style={{
              padding:
                "7px 11px",
            }}
          >
            ✕
          </button>
        </div>

        {/* ==================================================
            MENÚ
            ================================================== */}

        {mode ===
          "menu" && (
          <div
            style={{
              display:
                "grid",

              gap:
                10,

              marginTop:
                24,
            }}
          >
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                setMode(
                  "manual"
                )
              }
            >
              👤 Crear reserva manual
            </button>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setMode(
                  "availability"
                )
              }
            >
              🟢 Crear disponibilidad
            </button>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setMode(
                  "block"
                )
              }
            >
              🔒 Bloquear horario
            </button>

            <button
              type="button"
              className="btn"
              onClick={
                onClose
              }
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ==================================================
            RESERVA MANUAL
            ================================================== */}

        {mode ===
          "manual" && (
          <form
            onSubmit={
              createManualBooking
            }
            style={{
              marginTop:
                24,
            }}
          >
            <h3>
              Reserva manual
            </h3>

            <p className="muted">
              Crea una cita introducida directamente por el negocio.
            </p>

            {/* CLIENTE */}

            <label
              style={{
                display:
                  "block",

                marginTop:
                  18,
              }}
            >
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
                placeholder="Nombre del cliente"
                style={
                  inputStyle
                }
              />
            </label>

            {/* TELÉFONO */}

            <label
              style={{
                display:
                  "block",
              }}
            >
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
                placeholder="600 000 000"
                style={
                  inputStyle
                }
              />
            </label>

            {/* EMAIL */}

            <label
              style={{
                display:
                  "block",
              }}
            >
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
                placeholder="cliente@email.com"
                style={
                  inputStyle
                }
              />
            </label>

            {/* SERVICIO */}

            <label
              style={{
                display:
                  "block",
              }}
            >
              <strong>
                Servicio
              </strong>

              <select
                value={
                  manualServiceId
                }
                onChange={(
                  event
                ) =>
                  handleManualServiceChange(
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
                      (
                      {
                        service.duration_minutes
                      }{" "}
                      min)
                    </option>
                  )
                )}
              </select>
            </label>

            {/* DURACIÓN */}

            <label
              style={{
                display:
                  "block",
              }}
            >
              <strong>
                Duración exacta (minutos)
              </strong>

              <input
                type="number"
                min={1}
                max={1440}
                step={1}
                required
                value={
                  manualDurationMinutes
                }
                onChange={(
                  event
                ) =>
                  setManualDurationMinutes(
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
                {formatDuration(
                  manualDurationMinutes
                )}
              </div>
            </label>

            {/* HORARIO */}

            <div
              style={{
                padding:
                  "12px 14px",

                border:
                  "1px solid var(--border)",

                borderRadius:
                  12,

                marginBottom:
                  16,

                background:
                  "#f8fafc",
              }}
            >
              <div
                className="muted"
                style={{
                  fontSize:
                    12,

                  marginBottom:
                    4,
                }}
              >
                Horario
              </div>

              <strong>
                {formatTime(
                  selectedDate
                )}
              </strong>

              {" → "}

              <strong>
                {formatTime(
                  addMinutes(
                    normalizeToExactMinute(
                      selectedDate
                    ),
                    manualDurationMinutes
                  )
                )}
              </strong>
            </div>

            {/* NOTAS */}

            <label
              style={{
                display:
                  "block",
              }}
            >
              <strong>
                Notas
              </strong>

              <textarea
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
                placeholder="Información adicional..."
                rows={3}
                style={{
                  ...inputStyle,

                  resize:
                    "vertical",
                }}
              />
            </label>

            {/* ERROR */}

            {error && (
              <ErrorMessage
                message={
                  error
                }
              />
            )}

            {/* BOTONES */}

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
                  ? "Creando..."
                  : "Crear reserva"}
              </button>

              <button
                type="button"
                className="btn"
                disabled={
                  loading
                }
                onClick={
                  goBack
                }
              >
                ← Volver
              </button>
            </div>
          </form>
        )}

        {/* ==================================================
            CREAR DISPONIBILIDAD
            ================================================== */}

        {mode ===
          "availability" && (
          <form
            onSubmit={
              createAvailability
            }
            style={{
              marginTop:
                24,
            }}
          >
            <h3>
              Crear disponibilidad
            </h3>

            <p className="muted">
              Publica este horario para que un cliente pueda reservarlo desde Slottye.
            </p>

            {activeServices.length ===
            0 ? (
              <div
                style={{
                  marginTop:
                    18,

                  padding:
                    "14px 16px",

                  borderRadius:
                    12,

                  border:
                    "1px solid #fde68a",

                  background:
                    "#fffbeb",

                  color:
                    "#92400e",
                }}
              >
                Primero necesitas tener al menos un servicio activo.
              </div>
            ) : (
              <>
                {/* SERVICIO */}

                <label
                  style={{
                    display:
                      "block",

                    marginTop:
                      18,
                  }}
                >
                  <strong>
                    Servicio *
                  </strong>

                  <select
                    required
                    value={
                      availabilityServiceId
                    }
                    onChange={(
                      event
                    ) =>
                      handleAvailabilityServiceChange(
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

                {/* DURACIÓN */}

                <label
                  style={{
                    display:
                      "block",
                  }}
                >
                  <strong>
                    Duración exacta (minutos)
                  </strong>

                  <input
                    type="number"
                    min={1}
                    max={1440}
                    step={1}
                    required
                    value={
                      availabilityDurationMinutes
                    }
                    onChange={(
                      event
                    ) =>
                      setAvailabilityDurationMinutes(
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
                    Duración actual:{" "}
                    {formatDuration(
                      availabilityDurationMinutes
                    )}
                  </div>
                </label>

                {/* RESUMEN */}

                <div
                  style={{
                    padding:
                      "14px 16px",

                    border:
                      "1px solid var(--border)",

                    borderRadius:
                      12,

                    marginBottom:
                      16,

                    background:
                      "#f0fdf4",
                  }}
                >
                  <div
                    className="muted"
                    style={{
                      fontSize:
                        12,

                      marginBottom:
                        5,
                    }}
                  >
                    Nueva disponibilidad
                  </div>

                  <strong>
                    {formatTime(
                      selectedDate
                    )}
                  </strong>

                  {availabilityService ? (
                    <>
                      {" → "}

                      <strong>
                        {formatTime(
                          addMinutes(
                            normalizeToExactMinute(
                              selectedDate
                            ),
                            availabilityDurationMinutes
                          )
                        )}
                      </strong>

                      <div
                        style={{
                          marginTop:
                            6,

                          fontSize:
                            13,
                        }}
                      >
                        {
                          availabilityService.name
                        }
                        {" · "}
                        {
                          availabilityDurationMinutes
                        }{" "}
                        min
                      </div>
                    </>
                  ) : (
                    <div
                      className="muted"
                      style={{
                        marginTop:
                          6,

                        fontSize:
                          13,
                      }}
                    >
                      Selecciona un servicio para calcular la hora final.
                    </div>
                  )}
                </div>

                <div
                  className="muted"
                  style={{
                    marginBottom:
                      16,

                    fontSize:
                      12,

                    lineHeight:
                      1.55,
                  }}
                >
                  Puedes crear disponibilidad aunque esta franja esté fuera del horario habitual del negocio. Se considerará una excepción puntual.
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
                      loading ||
                      !availabilityServiceId
                    }
                  >
                    {loading
                      ? "Creando..."
                      : "Crear disponibilidad"}
                  </button>

                  <button
                    type="button"
                    className="btn"
                    disabled={
                      loading
                    }
                    onClick={
                      goBack
                    }
                  >
                    ← Volver
                  </button>
                </div>
              </>
            )}

            {activeServices.length ===
              0 && (
              <div
                style={{
                  marginTop:
                    16,
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={
                    goBack
                  }
                >
                  ← Volver
                </button>
              </div>
            )}
          </form>
        )}

        {/* ==================================================
            BLOQUEO
            ================================================== */}

{mode ===
  "block" && (
  <form
    onSubmit={
      createBlock
    }
    style={{
      marginTop:
        24,
    }}
  >
    <h3>
      Bloquear horario
    </h3>

    <p className="muted">
      Bloquea este periodo para que no pueda reservarse desde Slottye.
    </p>

    {/* DURACIÓN */}

    <label
      style={{
        display:
          "block",

        marginTop:
          18,
      }}
    >
      <strong>
        Duración exacta (minutos)
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
        {formatDuration(
          blockDurationMinutes
        )}
      </div>
    </label>

    {/* HORARIO */}

    <div
      style={{
        padding:
          "12px 14px",

        border:
          "1px solid var(--border)",

        borderRadius:
          12,

        marginBottom:
          16,

        background:
          "#fef2f2",
      }}
    >
      <div
        className="muted"
        style={{
          fontSize:
            12,

          marginBottom:
            4,
        }}
      >
        Horario bloqueado
      </div>

      <strong>
        {formatTime(
          selectedDate
        )}
      </strong>

      {" → "}

      <strong>
        {formatTime(
          addMinutes(
            normalizeToExactMinute(
              selectedDate
            ),
            blockDurationMinutes
          )
        )}
      </strong>
    </div>

    {/* MOTIVO */}

    <label
      style={{
        display:
          "block",
      }}
    >
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
      className="muted"
      style={{
        marginBottom:
          16,

        fontSize:
          12,

        lineHeight:
          1.55,
      }}
    >
      Los huecos disponibles que coincidan con este periodo dejarán de estar disponibles para los clientes.
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
          ? "Bloqueando..."
          : "Bloquear horario"}
      </button>

      <button
        type="button"
        className="btn"
        disabled={
          loading
        }
        onClick={
          goBack
        }
      >
        ← Volver
      </button>
    </div>
  </form>
)}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * MENSAJE DE ERROR
 * ============================================================
 */

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="alert"
      style={{
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

        lineHeight:
          1.5,
      }}
    >
      ⚠️ {message}
    </div>
  );
}

/*
 * ============================================================
 * INPUT
 * ============================================================
 */

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