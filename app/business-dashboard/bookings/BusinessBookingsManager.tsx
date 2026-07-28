"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Booking = {
  id: string;
  user_id: string;
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
  const supabase = createClient();

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
    const confirmed = window.confirm(
      "¿Marcar esta cita como completada?"
    );
  
    if (!confirmed) return;
  
    setLoadingId(bookingId);
    setMessage("");
  
    const { error } = await supabase.rpc(
      "complete_booking",
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
              status: "COMPLETED",
            }
          : booking
      )
    );
  
    setMessage(
      "Reserva marcada como completada."
    );
  
    setLoadingId(null);
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

  const upcoming = bookings.filter(
    (booking) =>
      booking.status === "CONFIRMED" &&
      booking.slots &&
      new Date(booking.slots.start_at) >
        new Date()
  );

  const upcomingIds = new Set(
    upcoming.map((booking) => booking.id)
  );

  const history = bookings.filter(
    (booking) =>
      !upcomingIds.has(booking.id)
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
  {booking.slots &&
    new Date(booking.slots.start_at) <= new Date() && (
      <>
        <button
          type="button"
          className="btn primary"
          disabled={loadingId === booking.id}
          onClick={() => completeBooking(booking.id)}
        >
          Marcar completada
        </button>

        <button
          type="button"
          className="btn"
          disabled={loadingId === booking.id}
          onClick={() => noShowBooking(booking.id)}
        >
          No se presentó
        </button>
      </>
    )}

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
                    {booking.profiles?.name ??
                      "Cliente"}
                  </strong>

                  <div
                    className="muted"
                    style={{
                      marginTop: 6,
                    }}
                  >
                    {statusLabel(
                      booking.status
                    )}
                  </div>

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