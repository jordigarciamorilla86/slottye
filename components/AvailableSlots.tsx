"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

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

type Props = {
  slots: Slot[];
  services: Service[];
  loggedIn: boolean;
  selectedServiceId: string;
  onServiceChange: (
    serviceId:
      string
  ) => void;
};

type SelectedSlot = {
  slot: Slot;
  serviceName: string;
};

export function AvailableSlots({
  slots,
  services,
  loggedIn,
  selectedServiceId,
  onServiceChange,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const router =
    useRouter();

  const [
    loadingId,
    setLoadingId,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    selectedSlot,
    setSelectedSlot,
  ] =
    useState<
      SelectedSlot |
      null
    >(
      null
    );

  const [
    confirmedSlot,
    setConfirmedSlot,
  ] =
    useState<
      SelectedSlot |
      null
    >(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" |
      "error" |
      null
    >(
      null
    );

  function getServiceName(
    serviceId:
      string |
      null
  ) {
    return (
      services.find(
        (
          service
        ) =>
          service.id ===
          serviceId
      )?.name ??
      "Cita"
    );
  }

  function formatDate(
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

  function formatTime(
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

  function openConfirmation(
    slot:
      Slot
  ) {
    if (
      !loggedIn
    ) {
      router.push(
        `/login?next=${encodeURIComponent(
          window.location.pathname
        )}`
      );

      return;
    }

    setMessage(
      ""
    );

    setMessageType(
      null
    );

    setSelectedSlot({
      slot,

      serviceName:
        getServiceName(
          slot.service_id
        ),
    });
  }

  function closeConfirmation() {
    if (
      loadingId
    ) {
      return;
    }

    setSelectedSlot(
      null
    );
  }

  async function reserve() {
    if (
      !selectedSlot
    ) {
      return;
    }

    const slotId =
      selectedSlot.slot.id;

    setLoadingId(
      slotId
    );

    setMessage(
      ""
    );

    setMessageType(
      null
    );

    const {
      data:
        bookingId,
      error,
    } =
      await supabase.rpc(
        "book_slot",
        {
          p_slot_id:
            slotId,
        }
      );

    if (
      error
    ) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      setLoadingId(
        null
      );

      return;
    }

    if (
      bookingId
    ) {
      try {
        const notificationResponse =
          await fetch(
            "/api/notifications/booking-confirmed",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  bookingId,
                }),
            }
          );

        if (
          !notificationResponse.ok
        ) {
          const result =
            await notificationResponse.json();

          console.error(
            "Error enviando confirmación:",
            result
          );
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Error enviando confirmación:",
          notificationError
        );
      }
    }

    const reserved =
      selectedSlot;

    setSelectedSlot(
      null
    );

    setConfirmedSlot(
      reserved
    );

    setLoadingId(
      null
    );

    router.refresh();
  }

  function closeSuccess() {
    setConfirmedSlot(
      null
    );
  }

  function goToBookings() {
    router.push(
      "/account/bookings"
    );
  }

  const filteredSlots =
    selectedServiceId ===
    "all"
      ? slots
      : slots.filter(
          (
            slot
          ) =>
            slot.service_id ===
            selectedServiceId
        );

  if (
    slots.length ===
    0
  ) {
    return (
      <div className="panel">
        <h3>
          No hay citas disponibles
        </h3>

        <p className="muted">
          Este negocio no tiene citas libres en este momento.
        </p>
      </div>
    );
  }

  return (
    <>
      {services.length >
        0 && (
        <div
          style={{
            display:
              "flex",

            flexWrap:
              "wrap",

            gap:
              10,

            marginBottom:
              20,
          }}
        >
          <button
            type="button"
            className={
              selectedServiceId ===
              "all"
                ? "btn primary"
                : "btn"
            }
            onClick={() =>
              onServiceChange(
                "all"
              )
            }
          >
            Todos los servicios
          </button>

          {services.map(
            (
              service
            ) => (
              <button
                type="button"
                key={
                  service.id
                }
                className={
                  selectedServiceId ===
                  service.id
                    ? "btn primary"
                    : "btn"
                }
                onClick={() =>
                  onServiceChange(
                    service.id
                  )
                }
              >
                {service.name}
              </button>
            )
          )}
        </div>
      )}

      {filteredSlots.length ===
      0 ? (
        <div className="panel">
          <h3>
            No hay citas disponibles
          </h3>

          <p className="muted">
            Ahora mismo no hay citas disponibles para este servicio.
          </p>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              12,
          }}
        >
          {filteredSlots.map(
            (
              slot
            ) => (
              <div
                className="card"
                key={
                  slot.id
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
                        20,

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <h3>
                        {getServiceName(
                          slot.service_id
                        )}
                      </h3>

                      <div className="meta">
                        📅{" "}
                        {formatDate(
                          slot.start_at
                        )}
                      </div>

                      <div
                        style={{
                          fontSize:
                            22,

                          fontWeight:
                            800,

                          marginTop:
                            8,
                        }}
                      >
                        {formatTime(
                          slot.start_at
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn primary"
                      disabled={
                        loadingId !==
                        null
                      }
                      onClick={() =>
                        openConfirmation(
                          slot
                        )
                      }
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {message &&
        messageType ===
          "error" && (
        <div
          role="alert"
          style={{
            marginTop:
              18,

            padding:
              "14px 16px",

            borderRadius:
              14,

            border:
              "1px solid #ef4444",

            background:
              "#fef2f2",

            color:
              "#b91c1c",

            fontWeight:
              600,
          }}
        >
          ⚠️ {message}
        </div>
      )}

      {selectedSlot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-booking-title"
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              1500,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding:
              20,

            background:
              "rgba(15, 23, 42, 0.52)",
          }}
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget
            ) {
              closeConfirmation();
            }
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                520,

              padding:
                26,

              border:
                "1px solid var(--border)",

              borderRadius:
                18,

              background:
                "#ffffff",

              boxShadow:
                "0 22px 60px rgba(15, 23, 42, 0.24)",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  16,
              }}
            >
              <div>
                <div className="kicker">
                  Reserva
                </div>

                <h2
                  id="confirm-booking-title"
                  style={{
                    margin:
                      "8px 0 0",
                  }}
                >
                  Confirmar reserva
                </h2>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                disabled={
                  loadingId !==
                  null
                }
                onClick={
                  closeConfirmation
                }
                style={{
                  width:
                    38,

                  height:
                    38,

                  border:
                    "1px solid var(--border)",

                  borderRadius:
                    10,

                  background:
                    "#ffffff",

                  cursor:
                    loadingId
                      ? "not-allowed"
                      : "pointer",

                  fontSize:
                    22,

                  lineHeight:
                    1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop:
                  20,

                padding:
                  18,

                border:
                  "1px solid #ddd6fe",

                borderRadius:
                  14,

                background:
                  "#faf5ff",
              }}
            >
              <strong
                style={{
                  display:
                    "block",

                  fontSize:
                    17,
                }}
              >
                {
                  selectedSlot.serviceName
                }
              </strong>

              <div
                style={{
                  marginTop:
                    10,

                  color:
                    "#4b5563",

                  lineHeight:
                    1.7,
                }}
              >
                📅{" "}
                {formatDate(
                  selectedSlot.slot
                    .start_at
                )}

                <br />

                🕐{" "}
                {formatTime(
                  selectedSlot.slot
                    .start_at
                )}
              </div>
            </div>

            <div
              style={{
                marginTop:
                  16,

                padding:
                  "14px 16px",

                border:
                  "1px solid #fde68a",

                borderRadius:
                  14,

                background:
                  "#fffbeb",

                color:
                  "#92400e",

                fontSize:
                  13,

                lineHeight:
                  1.6,
              }}
            >
              <strong>
                Te enviaremos un correo de confirmación.
              </strong>

              <br />

              Si no lo recibes en unos minutos, revisa también las carpetas de Spam, Correo no deseado o Promociones.
            </div>

            {message &&
              messageType ===
                "error" && (
              <div
                role="alert"
                style={{
                  marginTop:
                    16,

                  padding:
                    "12px 14px",

                  border:
                    "1px solid #fecaca",

                  borderRadius:
                    12,

                  background:
                    "#fef2f2",

                  color:
                    "#b91c1c",

                  fontSize:
                    13,

                  fontWeight:
                    600,
                }}
              >
                ⚠️ {message}
              </div>
            )}

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap:
                  10,

                flexWrap:
                  "wrap",

                marginTop:
                  22,
              }}
            >
              <button
                type="button"
                className="btn"
                disabled={
                  loadingId !==
                  null
                }
                onClick={
                  closeConfirmation
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  loadingId !==
                  null
                }
                onClick={
                  reserve
                }
              >
                {loadingId
                  ? "Reservando..."
                  : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmedSlot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              1500,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding:
              20,

            background:
              "rgba(15, 23, 42, 0.52)",
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                520,

              padding:
                28,

              border:
                "1px solid var(--border)",

              borderRadius:
                18,

              background:
                "#ffffff",

              boxShadow:
                "0 22px 60px rgba(15, 23, 42, 0.24)",

              textAlign:
                "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width:
                  64,

                height:
                  64,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                margin:
                  "0 auto",

                borderRadius:
                  "50%",

                background:
                  "#dcfce7",

                fontSize:
                  32,
              }}
            >
              ✓
            </div>

            <h2
              id="booking-success-title"
              style={{
                margin:
                  "18px 0 8px",
              }}
            >
              ¡Tu cita está confirmada!
            </h2>

            <p
              className="muted"
              style={{
                margin:
                  0,

                lineHeight:
                  1.6,
              }}
            >
              La reserva se ha realizado correctamente.
            </p>

            <div
              style={{
                marginTop:
                  20,

                padding:
                  18,

                border:
                  "1px solid #bbf7d0",

                borderRadius:
                  14,

                background:
                  "#f0fdf4",

                textAlign:
                  "left",
              }}
            >
              <strong
                style={{
                  display:
                    "block",

                  fontSize:
                    17,
                }}
              >
                {
                  confirmedSlot.serviceName
                }
              </strong>

              <div
                style={{
                  marginTop:
                    10,

                  color:
                    "#374151",

                  lineHeight:
                    1.7,
                }}
              >
                📅{" "}
                {formatDate(
                  confirmedSlot.slot
                    .start_at
                )}

                <br />

                🕐{" "}
                {formatTime(
                  confirmedSlot.slot
                    .start_at
                )}
              </div>
            </div>

            <div
              style={{
                marginTop:
                  16,

                padding:
                  "14px 16px",

                border:
                  "1px solid #fde68a",

                borderRadius:
                  14,

                background:
                  "#fffbeb",

                color:
                  "#92400e",

                fontSize:
                  13,

                lineHeight:
                  1.6,

                textAlign:
                  "left",
              }}
            >
              <strong>
                Hemos enviado un correo con los detalles.
              </strong>

              <br />

              Si no lo ves, revisa Spam, Correo no deseado y Promociones. También puedes añadir reservas@slottye.com a tus contactos.
            </div>

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "center",

                gap:
                  10,

                flexWrap:
                  "wrap",

                marginTop:
                  24,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={
                  closeSuccess
                }
              >
                Seguir buscando
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={
                  goToBookings
                }
              >
                Ver mis citas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
              }