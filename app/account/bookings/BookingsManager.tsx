"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ReviewForm } from "@/components/ReviewForm";

type Slot = {
  id: string;
  start_at: string;
  end_at: string;
};

type Booking = {
  id: string;
  status: string;
  created_at: string;
  cancelled_at: string | null;

  slots:
    | {
        id: string;
        start_at: string;
        end_at: string;
      }
    | null;

  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
        allow_cancellations: boolean;
        min_cancellation_notice_hours: number;
      }
    | null;

  services:
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }
    | null;

  reviews:
    | {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        updated_at: string;
      }
    | null;
};

type Props = {
  initialBookings: Booking[];
  userId: string;
  highlightedBookingId:
    string |
    null;
};

type MessageType =
  | "success"
  | "error"
  | null;

export default function BookingsManager({
  initialBookings,
  userId,
  highlightedBookingId,
}: Props) {
  

  const highlightedRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [bookings, setBookings] =
    useState<Booking[]>(
      initialBookings
    );

  const [loadingId, setLoadingId] =
    useState<string | null>(
      null
    );

  const [
    rescheduleLoadingId,
    setRescheduleLoadingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    reschedulingBookingId,
    setReschedulingBookingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    availableSlots,
    setAvailableSlots,
  ] =
    useState<
      Record<string, Slot[]>
    >({});

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      null
    );

  /*
   * ============================================================
   * ABRIR RESEÑA DESDE EL EMAIL
   * ============================================================
   */

  useEffect(() => {
    if (
      !highlightedBookingId
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          highlightedRef.current
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center",
            });
        },
        150
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    highlightedBookingId,
  ]);

  /*
   * ============================================================
   * FORMATO
   * ============================================================
   */

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  function formatTime(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  function formatDateTime(
    value: Date
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
        timeZone:
          "Europe/Madrid",
      }
    ).format(value);
  }

  function statusLabel(
    status: string
  ) {
    switch (status) {
      case "CONFIRMED":
        return "Confirmada";

      case "CANCELLED_BY_USER":
        return "Cancelada por ti";

      case "CANCELLED_BY_BUSINESS":
        return "Cancelada por el negocio";

      case "COMPLETED":
        return "Completada";

      case "NO_SHOW":
        return "No asististe";

      default:
        return status;
    }
  }

  /*
   * ============================================================
   * MENSAJES
   * ============================================================
   */

  function showSuccess(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "success"
    );
  }

  function showError(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "error"
    );
  }

  function clearMessage() {
    setMessage("");
    setMessageType(
      null
    );
  }

  /*
   * ============================================================
   * CANCELACIÓN
   * ============================================================
   */

  function getCancellationInfo(
    booking: Booking
  ) {
    if (!booking.slots) {
      return {
        canCancel: false,

        reason:
          "No se ha encontrado la información de la cita.",

        deadline:
          null as Date | null,
      };
    }

    if (
      !booking.businesses
    ) {
      return {
        canCancel: false,

        reason:
          "No se ha encontrado la información del negocio.",

        deadline:
          null as Date | null,
      };
    }

    if (
      booking.businesses
        .allow_cancellations ===
      false
    ) {
      return {
        canCancel: false,

        reason:
          "Este negocio no permite cambios ni cancelaciones online.",

        deadline:
          null as Date | null,
      };
    }

    const startAt =
      new Date(
        booking.slots
          .start_at
      );

    const noticeHours =
      booking.businesses
        .min_cancellation_notice_hours ??
      0;

    const deadline =
      new Date(
        startAt.getTime() -
          noticeHours *
            60 *
            60 *
            1000
      );

    if (
      new Date() >
      deadline
    ) {
      return {
        canCancel: false,

        reason:
          noticeHours > 0
            ? `Ya no puedes cambiar ni cancelar esta cita. Este negocio requiere al menos ${noticeHours} horas de antelación.`
            : "Esta cita ya no se puede cambiar ni cancelar.",

        deadline,
      };
    }

    return {
      canCancel: true,
      reason: null,
      deadline,
    };
  }

  async function cancelBooking(
    booking: Booking
  ) {
    clearMessage();
  
    const cancellation =
      getCancellationInfo(
        booking
      );
  
    if (
      !cancellation.canCancel
    ) {
      showError(
        cancellation.reason ??
          "Esta cita no se puede cancelar."
      );
  
      return;
    }
  
    const confirmed =
      window.confirm(
        "¿Seguro que quieres cancelar esta cita?"
      );
  
    if (!confirmed) {
      return;
    }
  
    setLoadingId(
      booking.id
    );
  
    try {
      const response =
        await fetch(
          "/api/account/bookings/manage",
          {
            method:
              "POST",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                action:
                  "cancel",
  
                bookingId:
                  booking.id,
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido cancelar la cita."
        );
  
        return;
      }
  
      /*
       * Avisamos a los suscriptores
       * de que el hueco vuelve
       * a estar disponible.
       */
  
      fetch(
        "/api/notifications/slot-available",
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
                booking.id,
            }),
        }
      ).catch(
        (
          error
        ) => {
          console.error(
            "Error enviando aviso de cita liberada:",
            error
          );
        }
      );
  
      /*
       * Actualización visual local.
       */
  
      setBookings(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              booking.id
                ? {
                    ...item,
  
                    status:
                      "CANCELLED_BY_USER",
  
                    cancelled_at:
                      new Date()
                        .toISOString(),
                  }
                : item
          )
      );
  
      showSuccess(
        "Cita cancelada correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error cancelling booking:",
        error
      );
  
      showError(
        "No se ha podido cancelar la cita."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  /*
   * ============================================================
   * REPROGRAMACIÓN
   * ============================================================
   */

  async function openReschedule(
    booking: Booking
  ) {
    clearMessage();
  
    if (
      !booking.businesses ||
      !booking.services ||
      !booking.slots
    ) {
      showError(
        "No se ha podido cargar la información necesaria para cambiar esta cita."
      );
  
      return;
    }
  
    if (
      reschedulingBookingId ===
      booking.id
    ) {
      setReschedulingBookingId(
        null
      );
  
      setSelectedSlotId(
        null
      );
  
      return;
    }
  
    setRescheduleLoadingId(
      booking.id
    );
  
    try {
      const response =
        await fetch(
          `/api/account/bookings/manage?bookingId=${encodeURIComponent(
            booking.id
          )}`,
          {
            method:
              "GET",
  
            cache:
              "no-store",
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se han podido cargar las citas disponibles."
        );
  
        return;
      }
  
      setAvailableSlots(
        (
          current
        ) => ({
          ...current,
  
          [booking.id]:
            result.slots ??
            [],
        })
      );
  
      setSelectedSlotId(
        null
      );
  
      setReschedulingBookingId(
        booking.id
      );
    } catch (
      error
    ) {
      console.error(
        "Error loading reschedule slots:",
        error
      );
  
      showError(
        "No se han podido cargar las citas disponibles."
      );
    } finally {
      setRescheduleLoadingId(
        null
      );
    }
  }
  async function confirmReschedule(
    booking: Booking
  ) {
    clearMessage();
  
    if (
      !selectedSlotId
    ) {
      showError(
        "Selecciona una nueva cita."
      );
  
      return;
    }
  
    const slotsForBooking =
      availableSlots[
        booking.id
      ] ?? [];
  
    const selectedSlot =
      slotsForBooking.find(
        (
          slot
        ) =>
          slot.id ===
          selectedSlotId
      );
  
    if (
      !selectedSlot
    ) {
      showError(
        "La cita seleccionada ya no está disponible."
      );
  
      return;
    }
  
    const confirmed =
      window.confirm(
        `¿Cambiar tu cita al ${formatDate(
          selectedSlot.start_at
        )} a las ${formatTime(
          selectedSlot.start_at
        )}?`
      );
  
    if (
      !confirmed
    ) {
      return;
    }
  
    setRescheduleLoadingId(
      booking.id
    );
  
    try {
      const response =
        await fetch(
          "/api/account/bookings/manage",
          {
            method:
              "POST",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                action:
                  "reschedule",
  
                bookingId:
                  booking.id,
  
                newSlotId:
                  selectedSlot.id,
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        console.error(
          "Error reprogramando cita:",
          result
        );
  
        showError(
          result.error ??
            "No se ha podido cambiar la cita."
        );
  
        return;
      }
  
      const oldSlotId =
        typeof result.oldSlotId ===
          "string"
          ? result.oldSlotId
          : booking.slots?.id;
  
      const newSlot =
        result.newSlot &&
        typeof result.newSlot ===
          "object"
          ? result.newSlot
          : selectedSlot;
  
      /*
       * El hueco anterior ha quedado libre.
       * Avisamos a los suscriptores.
       */
  
      if (
        oldSlotId
      ) {
        fetch(
          "/api/notifications/rescheduled-slot-available",
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
                  booking.id,
  
                oldSlotId,
              }),
          }
        ).catch(
          (
            error
          ) => {
            console.error(
              "Error avisando del hueco liberado tras reprogramación:",
              error
            );
          }
        );
      }
  
      /*
       * Notificación de reprogramación.
       */
  
      fetch(
        "/api/notifications/booking-rescheduled",
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
                booking.id,
            }),
        }
      ).catch(
        (
          error
        ) => {
          console.error(
            "Error enviando notificación de reprogramación:",
            error
          );
        }
      );
  
      /*
       * Actualización visual local.
       */
  
      setBookings(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              booking.id
                ? {
                    ...item,
  
                    slots: {
                      id:
                        newSlot.id,
  
                      start_at:
                        newSlot.start_at,
  
                      end_at:
                        newSlot.end_at,
                    },
                  }
                : item
          )
      );
  
      setReschedulingBookingId(
        null
      );
  
      setSelectedSlotId(
        null
      );
  
      setAvailableSlots(
        (
          current
        ) => ({
          ...current,
  
          [booking.id]:
            [],
        })
      );
  
      showSuccess(
        `Cita modificada correctamente. Tu nueva cita es el ${formatDate(
          newSlot.start_at
        )} a las ${formatTime(
          newSlot.start_at
        )}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Error rescheduling booking:",
        error
      );
  
      showError(
        "No se ha podido cambiar la cita."
      );
    } finally {
      setRescheduleLoadingId(
        null
      );
    }
  }

  /*
   * ============================================================
   * AGRUPAR HUECOS POR DÍA
   * ============================================================
   */

  function getDayKey(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  function groupSlotsByDay(
    slots: Slot[]
  ) {
    const grouped =
      slots.reduce(
        (acc, slot) => {
          const key =
            getDayKey(
              slot.start_at
            );

          if (
            !acc[key]
          ) {
            acc[key] = [];
          }

          acc[key].push(
            slot
          );

          return acc;
        },
        {} as Record<
          string,
          Slot[]
        >
      );

    return Object.entries(
      grouped
    ).sort(
      ([a], [b]) =>
        a.localeCompare(
          b
        )
    );
  }

  /*
   * ============================================================
   * PRÓXIMAS / HISTORIAL
   * ============================================================
   */

  const upcomingBookings =
    bookings
      .filter(
        (booking) =>
          booking.status ===
            "CONFIRMED" &&
          booking.slots &&
          new Date(
            booking.slots
              .start_at
          ) >
            new Date()
      )
      .sort(
        (a, b) =>
          new Date(
            a.slots!
              .start_at
          ).getTime() -
          new Date(
            b.slots!
              .start_at
          ).getTime()
      );

  const upcomingIds =
    new Set(
      upcomingBookings.map(
        (booking) =>
          booking.id
      )
    );

  const historyBookings =
    bookings.filter(
      (booking) =>
        !upcomingIds.has(
          booking.id
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
        marginTop: 28,
      }}
    >
      {/* MENSAJES */}

      {message && (
        <div
          role="alert"
          style={{
            marginBottom:
              22,

            padding:
              "14px 16px",

            borderRadius:
              14,

            border:
              messageType ===
              "error"
                ? "1px solid #ef4444"
                : "1px solid #22c55e",

            background:
              messageType ===
              "error"
                ? "#fef2f2"
                : "#f0fdf4",

            color:
              messageType ===
              "error"
                ? "#b91c1c"
                : "#166534",

            fontWeight:
              600,
          }}
        >
          {messageType ===
          "error"
            ? "⚠️ "
            : "✓ "}

          {message}
        </div>
      )}

      {/* PRÓXIMAS */}

      <h2>
        Próximas citas
      </h2>

      {upcomingBookings.length ===
      0 ? (
        <p className="muted">
          No tienes próximas citas.
        </p>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap: 14,

            marginTop:
              16,
          }}
        >
          {upcomingBookings.map(
            (booking) => {
              const cancellation =
                getCancellationInfo(
                  booking
                );

              const noticeHours =
                booking.businesses
                  ?.min_cancellation_notice_hours ??
                0;

              const isRescheduling =
                reschedulingBookingId ===
                booking.id;

              const slotsForBooking =
                availableSlots[
                  booking.id
                ] ?? [];

              const groupedAvailableSlots =
                groupSlotsByDay(
                  slotsForBooking
                );

              return (
                <div
                  className="card"
                  key={
                    booking.id
                  }
                >
                  <div className="card-body">
                    <div className="kicker">
                      Confirmada
                    </div>

                    <h3>
                      {booking
                        .businesses
                        ?.name ??
                        "Negocio"}
                    </h3>

                    {booking.services && (
                      <p>
                        <strong>
                          {
                            booking
                              .services
                              .name
                          }
                        </strong>
                      </p>
                    )}

                    {booking.slots && (
                      <>
                        <div className="meta">
                          📅{" "}
                          {formatDate(
                            booking
                              .slots
                              .start_at
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
                            booking
                              .slots
                              .start_at
                          )}
                        </div>
                      </>
                    )}

                    {booking.businesses && (
                      <div
                        className="meta"
                        style={{
                          marginTop:
                            10,
                        }}
                      >
                        📍{" "}
                        {[
                          booking
                            .businesses
                            .address,

                          booking
                            .businesses
                            .city,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " · "
                          )}
                      </div>
                    )}

                    {/* POLÍTICA */}

                    {booking.businesses &&
                      booking.slots && (
                        <div
                          style={{
                            marginTop:
                              16,

                            padding:
                              "12px 14px",

                            borderRadius:
                              12,

                            background:
                              cancellation.canCancel
                                ? "#f0fdf4"
                                : "#fef2f2",

                            border:
                              cancellation.canCancel
                                ? "1px solid #bbf7d0"
                                : "1px solid #fecaca",

                            color:
                              cancellation.canCancel
                                ? "#166534"
                                : "#b91c1c",
                          }}
                        >
                          {cancellation.canCancel ? (
                            <>
                              <strong>
                                ✓ Puedes cancelar esta cita
                              </strong>

                              {noticeHours >
                                0 &&
                                cancellation.deadline && (
                                  <div
                                    style={{
                                      marginTop:
                                        5,

                                      fontSize:
                                        14,
                                    }}
                                  >
                                    Puedes cancelarla hasta el{" "}
                                    {formatDateTime(
                                      cancellation.deadline
                                    )}
                                    .
                                  </div>
                                )}

                              {noticeHours ===
                                0 && (
                                <div
                                  style={{
                                    marginTop:
                                      5,

                                    fontSize:
                                      14,
                                  }}
                                >
                                  Este negocio no exige una antelación mínima para cancelar.
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <strong>
                                ⚠️ Cambios y cancelaciones no disponibles
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    5,

                                  fontSize:
                                    14,
                                }}
                              >
                                {
                                  cancellation.reason
                                }
                              </div>
                            </>
                          )}
                        </div>
                      )}

                    {/* BOTONES */}

                    <div
                      style={{
                        display:
                          "flex",

                        gap: 10,

                        flexWrap:
                          "wrap",

                        marginTop:
                          18,
                      }}
                    >
                      {booking.businesses && (
                        <Link
                          className="btn"

                          href={`/business/${booking.businesses.slug}`}
                        >
                          Ver negocio
                        </Link>
                      )}

                      <button
                        type="button"

                        className="btn"

                        disabled={
                          rescheduleLoadingId ===
                            booking.id ||
                          !cancellation.canCancel
                        }

                        onClick={() =>
                          openReschedule(
                            booking
                          )
                        }

                        title={
                          !cancellation.canCancel
                            ? cancellation.reason ??
                              "Esta cita ya no se puede modificar."
                            : "Cambiar fecha u hora de la cita"
                        }

                        style={{
                          opacity:
                            cancellation.canCancel
                              ? 1
                              : 0.5,

                          cursor:
                            cancellation.canCancel
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {rescheduleLoadingId ===
                        booking.id
                          ? "Cargando..."
                          : isRescheduling
                            ? "Cerrar cambio"
                            : "Cambiar cita"}
                      </button>

                      <button
                        type="button"

                        className="btn"

                        disabled={
                          loadingId ===
                            booking.id ||
                          !cancellation.canCancel
                        }

                        onClick={() =>
                          cancelBooking(
                            booking
                          )
                        }

                        style={{
                          opacity:
                            cancellation.canCancel
                              ? 1
                              : 0.5,

                          cursor:
                            cancellation.canCancel
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {loadingId ===
                        booking.id
                          ? "Cancelando..."
                          : "Cancelar cita"}
                      </button>
                    </div>

                    {/* REPROGRAMAR */}

                    {isRescheduling && (
                      <div
                        style={{
                          marginTop:
                            22,

                          paddingTop:
                            20,

                          borderTop:
                            "1px solid var(--border)",
                        }}
                      >
                        <h3>
                          Cambiar cita
                        </h3>

                        <p className="muted">
                          Selecciona otro hueco disponible para el mismo servicio.
                        </p>

                        {slotsForBooking.length ===
                        0 ? (
                          <div
                            className="panel"

                            style={{
                              marginTop:
                                14,
                            }}
                          >
                            <strong>
                              No hay otros huecos disponibles
                            </strong>

                            <p
                              className="muted"

                              style={{
                                marginBottom:
                                  0,
                              }}
                            >
                              Este negocio no tiene otras citas libres para este servicio en este momento.
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              display:
                                "grid",

                              gap: 18,

                              marginTop:
                                16,
                            }}
                          >
                            {groupedAvailableSlots.map(
                              ([
                                dayKey,
                                daySlots,
                              ]) => (
                                <div
                                  key={
                                    dayKey
                                  }
                                >
                                  <strong
                                    style={{
                                      textTransform:
                                        "capitalize",
                                    }}
                                  >
                                    {formatDate(
                                      daySlots[0]
                                        .start_at
                                    )}
                                  </strong>

                                  <div
                                    style={{
                                      display:
                                        "flex",

                                      flexWrap:
                                        "wrap",

                                      gap: 8,

                                      marginTop:
                                        10,
                                    }}
                                  >
                                    {daySlots.map(
                                      (
                                        slot
                                      ) => {
                                        const selected =
                                          selectedSlotId ===
                                          slot.id;

                                        return (
                                          <button
                                            key={
                                              slot.id
                                            }

                                            type="button"

                                            className={
                                              selected
                                                ? "btn primary"
                                                : "btn"
                                            }

                                            onClick={() =>
                                              setSelectedSlotId(
                                                slot.id
                                              )
                                            }
                                          >
                                            {formatTime(
                                              slot.start_at
                                            )}
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )
                            )}

                            <div
                              style={{
                                display:
                                  "flex",

                                gap: 10,

                                flexWrap:
                                  "wrap",

                                marginTop:
                                  4,
                              }}
                            >
                              <button
                                type="button"

                                className="btn primary"

                                disabled={
                                  !selectedSlotId ||
                                  rescheduleLoadingId ===
                                    booking.id
                                }

                                onClick={() =>
                                  confirmReschedule(
                                    booking
                                  )
                                }
                              >
                                {rescheduleLoadingId ===
                                booking.id
                                  ? "Cambiando..."
                                  : "Confirmar cambio"}
                              </button>

                              <button
                                type="button"

                                className="btn"

                                onClick={() => {
                                  setReschedulingBookingId(
                                    null
                                  );

                                  setSelectedSlotId(
                                    null
                                  );
                                }}
                              >
                                Cancelar cambio
                              </button>
                            </div>
                          </div>
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

      {/* HISTORIAL */}

      <div
        style={{
          marginTop:
            42,
        }}
      >
        <h2>
          Historial
        </h2>

        {historyBookings.length ===
        0 ? (
          <p className="muted">
            Todavía no tienes historial.
          </p>
        ) : (
          <div
            style={{
              display:
                "grid",

              gap: 12,

              marginTop:
                16,
            }}
          >
            {historyBookings.map(
              (booking) => (
                <div
                  className="card"

                  key={
                    booking.id
                  }

                  id={`booking-${booking.id}`}

                  ref={
                    highlightedBookingId ===
                    booking.id
                      ? highlightedRef
                      : undefined
                  }

                  style={{
                    borderColor:
                      highlightedBookingId ===
                      booking.id
                        ? "#8b5cf6"
                        : undefined,

                    boxShadow:
                      highlightedBookingId ===
                      booking.id
                        ? "0 0 0 3px rgba(139, 92, 246, 0.16)"
                        : undefined,

                    scrollMarginTop:
                      120,
                  }}
                >
                  <div className="card-body">
                    <strong>
                      {booking
                        .businesses
                        ?.name ??
                        "Negocio"}
                    </strong>

                    <div
                      className="muted"

                      style={{
                        marginTop:
                          6,
                      }}
                    >
                      {statusLabel(
                        booking.status
                      )}
                    </div>

                    {booking.services && (
                      <div
                        style={{
                          marginTop:
                            8,
                        }}
                      >
                        {
                          booking
                            .services
                            .name
                        }
                      </div>
                    )}

                    {booking.slots && (
                      <div
                        className="meta"

                        style={{
                          marginTop:
                            8,
                        }}
                      >
                        📅{" "}
                        {formatDate(
                          booking
                            .slots
                            .start_at
                        )}{" "}
                        ·{" "}
                        {formatTime(
                          booking
                            .slots
                            .start_at
                        )}
                      </div>
                    )}

                    {booking.status ===
                      "COMPLETED" &&
                      booking.businesses && (
                        <>
                          {highlightedBookingId ===
                            booking.id &&
                            !booking.reviews && (
                              <div
                                style={{
                                  marginTop:
                                    16,

                                  padding:
                                    "12px 14px",

                                  border:
                                    "1px solid #ddd6fe",

                                  borderRadius:
                                    12,

                                  background:
                                    "#faf5ff",

                                  color:
                                    "#5b21b6",

                                  fontSize:
                                    14,

                                  fontWeight:
                                    700,
                                }}
                              >
                                ⭐ Cuéntanos cómo fue tu experiencia.
                              </div>
                            )}

                          <ReviewForm
                            bookingId={
                              booking.id
                            }

                            businessId={
                              booking
                                .businesses
                                .id
                            }

                            userId={
                              userId
                            }

                            initialReview={
                              booking.reviews
                            }
                          />
                        </>
                      )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}