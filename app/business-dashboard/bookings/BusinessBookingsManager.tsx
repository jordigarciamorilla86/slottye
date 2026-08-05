"use client";

import {
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Booking = {
  id: string;
  user_id: string | null;
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

  services:
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }
    | null;

  profiles:
    | {
        id: string;
        name: string | null;
        email: string | null;
      }
    | null;
};

type Props = {
  initialBookings: Booking[];
};

export default function BusinessBookingsManager({
  initialBookings,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [bookings, setBookings] =
    useState<Booking[]>(initialBookings);

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function statusLabel(status: string) {
    switch (status) {
      case "CONFIRMED":
        return "Confirmada";

      case "CANCELLED_BY_USER":
        return "Cancelada por el cliente";

        case "CANCELLED_BY_BUSINESS":
          return "Cancelada por el negocio";
        
        case "CANCELLED_ACCOUNT_DELETED":
          return "Cancelada por eliminación de cuenta";
        
        case "COMPLETED":
        return "Completada";

      case "NO_SHOW":
        return "No asistió";

      default:
        return status;
    }
  }

  async function cancelBooking(
    bookingId: string
  ) {
    const confirmed = window.confirm(
      "¿Seguro que quieres cancelar esta reserva?"
    );
  
    if (!confirmed) return;
  
    setLoadingId(bookingId);
    setMessage("");
  
    const { error } = await supabase.rpc(
      "cancel_booking_by_business",
      {
        p_booking_id: bookingId,
      }
    );
  
    if (error) {
      setMessage(error.message);
      setLoadingId(null);
      return;
    }
  
    const notificationResponse = await fetch(
      "/api/notifications/booking-cancelled",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
        }),
      }
    );
  
    if (!notificationResponse.ok) {
      const result =
        await notificationResponse.json();
  
      console.error(
        "Error enviando cancelación:",
        result
      );
    }
  
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "CANCELLED_BY_BUSINESS",
              cancelled_at:
                new Date().toISOString(),
            }
          : booking
      )
    );
  
    setMessage(
      "Reserva cancelada correctamente."
    );
  
    setLoadingId(null);
  }

  async function completeBooking(
    bookingId: string
  ) {
    const confirmed =
      window.confirm(
        "¿Marcar esta cita como completada?"
      );

    if (!confirmed) {
      return;
    }

    setLoadingId(
      bookingId
    );

    setMessage(
      ""
    );

    const {
      error,
    } =
      await supabase.rpc(
        "complete_booking",
        {
          p_booking_id:
            bookingId,
        }
      );

    if (
      error
    ) {
      setMessage(
        error.message
      );

      setLoadingId(
        null
      );

      return;
    }

    /*
     * La reserva ya está completada.
     * Solicitamos la reseña al cliente.
     *
     * Si el correo falla, no deshacemos
     * el estado COMPLETED.
     */
    try {
      const reviewResponse =
        await fetch(
          "/api/notifications/review-request",
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
        !reviewResponse.ok
      ) {
        console.error(
          "La reserva se completó, pero no se pudo enviar la solicitud de reseña:",
          await reviewResponse.text()
        );
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Error enviando solicitud de reseña:",
        notificationError
      );
    }

    setBookings(
      (
        current
      ) =>
        current.map(
          (
            booking
          ) =>
            booking.id ===
            bookingId
              ? {
                  ...booking,

                  status:
                    "COMPLETED",
                }
              : booking
        )
    );

    setMessage(
      "Reserva marcada como completada. Se ha enviado al cliente una solicitud de reseña."
    );

    setLoadingId(
      null
    );
  }

  async function noShowBooking(
    bookingId: string
  ) {
    const confirmed = window.confirm(
      "¿Marcar que el cliente no se presentó?"
    );
  
    if (!confirmed) return;
  
    setLoadingId(bookingId);
    setMessage("");
  
    const { error } = await supabase.rpc(
      "no_show_booking",
      {
        p_booking_id: bookingId,
      }
    );
  
    if (error) {
      setMessage(error.message);
      setLoadingId(null);
      return;
    }
  
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "NO_SHOW",
            }
          : booking
      )
    );
  
    setMessage(
      "Reserva marcada como no presentada."
    );
  
    setLoadingId(null);
  }

  const now =
    new Date();

  const upcoming =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.status ===
            "CONFIRMED" &&
          booking.slots &&
          new Date(
            booking.slots.start_at
          ) >
            now
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            first.slots!
              .start_at
          ).getTime() -
          new Date(
            second.slots!
              .start_at
          ).getTime()
      );

  const pendingClosure =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.status ===
            "CONFIRMED" &&
          booking.slots &&
          new Date(
            booking.slots.start_at
          ) <=
            now
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            second.slots!
              .start_at
          ).getTime() -
          new Date(
            first.slots!
              .start_at
          ).getTime()
      );

  const excludedIds =
    new Set([
      ...upcoming.map(
        (
          booking
        ) =>
          booking.id
      ),

      ...pendingClosure.map(
        (
          booking
        ) =>
          booking.id
      ),
    ]);

    const history =
    bookings
      .filter(
        (booking) =>
          !excludedIds.has(
            booking.id
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            second.created_at
          ).getTime() -
          new Date(
            first.created_at
          ).getTime()
      );

  return (
    <div style={{ marginTop: 28 }}>
      <h2>Próximas reservas</h2>

      {upcoming.length === 0 ? (
        <p className="muted">
          No tienes próximas reservas.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            marginTop: 16,
          }}
        >
          {upcoming.map((booking) => (
            <div
              className="card"
              key={booking.id}
            >
              <div className="card-body">
                <div className="kicker">
                  Confirmada
                </div>

                <h3>
                  {booking.profiles?.name ??
                    "Cliente"}
                </h3>

                {booking.profiles?.email && (
                  <div className="meta">
                    ✉ {booking.profiles.email}
                  </div>
                )}

                {booking.services && (
                  <p
                    style={{
                      marginTop: 12,
                    }}
                  >
                    <strong>
                      {booking.services.name}
                    </strong>
                  </p>
                )}

                {booking.slots && (
                  <>
                    <div className="meta">
                      📅{" "}
                      {formatDate(
                        booking.slots.start_at
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        marginTop: 8,
                      }}
                    >
                      {formatTime(
                        booking.slots.start_at
                      )}
                    </div>
                  </>
                )}

                <div
                  style={{
                    marginTop: 18,
                  }}
                >
                  <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    className="btn"
    disabled={loadingId === booking.id}
    onClick={() => cancelBooking(booking.id)}
  >
    {loadingId === booking.id
      ? "Procesando..."
      : "Cancelar reserva"}
  </button>
</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop:
            42,
        }}
      >
        <h2>
          Pendientes de cerrar
        </h2>

        <p className="muted">
          Citas cuya hora ya ha pasado y todavía están confirmadas.
        </p>

        {pendingClosure.length ===
        0 ? (
          <p className="muted">
            No hay citas pendientes de cerrar.
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
            {pendingClosure.map(
              (
                booking
              ) => (
                <div
                  className="card"
                  key={
                    booking.id
                  }
                >
                  <div className="card-body">
                    <div
                      className="kicker"
                      style={{
                        color:
                          "#b45309",
                      }}
                    >
                      Pendiente de cerrar
                    </div>

                    <h3>
                      {booking.profiles
                        ?.name ??
                        "Cliente"}
                    </h3>

                    {booking.profiles
                      ?.email && (
                      <div className="meta">
                        ✉{" "}
                        {
                          booking
                            .profiles
                            .email
                        }
                      </div>
                    )}

                    {booking.services && (
                      <p
                        style={{
                          marginTop:
                            12,
                        }}
                      >
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

                    <div
                      style={{
                        display:
                          "flex",

                        gap:
                          10,

                        flexWrap:
                          "wrap",

                        marginTop:
                          18,
                      }}
                    >
                      <button
                        type="button"
                        className="btn primary"
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          completeBooking(
                            booking.id
                          )
                        }
                      >
                        {loadingId ===
                        booking.id
                          ? "Procesando..."
                          : "Marcar completada"}
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          noShowBooking(
                            booking.id
                          )
                        }
                      >
                        {loadingId ===
                        booking.id
                          ? "Procesando..."
                          : "No se presentó"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 42 }}>
        <h2>Historial</h2>

        {history.length === 0 ? (
          <p className="muted">
            Todavía no hay historial.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 16,
            }}
          >
            {history.map((booking) => (
              <div
                className="card"
                key={booking.id}
              >
                <div className="card-body">
                <strong>
  {booking.status ===
  "CANCELLED_ACCOUNT_DELETED"
    ? "👤 Usuario eliminado"
    : booking.profiles?.name ??
      "Cliente"}
</strong>

                  <div
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      marginTop:
                        8,

                      padding:
                        "5px 9px",

                      borderRadius:
                        999,

                      background:
                        booking.status ===
                        "COMPLETED"
                          ? "#dcfce7"
                          : booking.status ===
                            "NO_SHOW"
                            ? "#ffedd5"
                            : "#fee2e2",

                      color:
                        booking.status ===
                        "COMPLETED"
                          ? "#166534"
                          : booking.status ===
                            "NO_SHOW"
                            ? "#9a3412"
                            : "#b91c1c",

                      fontSize:
                        12,

                      fontWeight:
                        800,
                    }}
                  >
                    {booking.status ===
                    "COMPLETED"
                      ? "✓ "
                      : booking.status ===
                        "NO_SHOW"
                        ? "⚠ "
                        : "× "}

                    {statusLabel(
                      booking.status
                    )}
                  </div>
                  
                  {booking.status ===
  "CANCELLED_ACCOUNT_DELETED" && (
  <div
    className="muted"
    style={{
      marginTop:
        8,

      fontSize:
        13,
    }}
  >
    La cuenta del cliente fue eliminada. Sus datos personales ya no están disponibles.
  </div>
)}
                  {booking.services && (
                    <div
                      className="meta"
                      style={{
                        marginTop: 8,
                      }}
                    >
                      {booking.services.name}
                    </div>
                  )}

                  {booking.slots && (
                    <div
                      className="meta"
                      style={{
                        marginTop: 8,
                      }}
                    >
                      📅{" "}
                      {formatDate(
                        booking.slots.start_at
                      )}{" "}
                      ·{" "}
                      {formatTime(
                        booking.slots.start_at
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p
          className="muted"
          style={{ marginTop: 18 }}
        >
          {message}
        </p>
      )}
    </div>
  );
}