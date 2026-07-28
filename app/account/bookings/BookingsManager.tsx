"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
      }
    | null;

  services:
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }
    | null;
};

type Props = {
  initialBookings: Booking[];
};

export default function BookingsManager({
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

  async function cancelBooking(
    bookingId: string
  ) {
    const confirmed = window.confirm(
      "¿Seguro que quieres cancelar esta cita?"
    );

    if (!confirmed) return;

    setLoadingId(bookingId);
    setMessage("");

    const { error } = await supabase.rpc(
      "cancel_booking",
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
              status: "CANCELLED_BY_USER",
              cancelled_at:
                new Date().toISOString(),
            }
          : booking
      )
    );

    setMessage(
      "Cita cancelada correctamente."
    );

    setLoadingId(null);
  }

  const upcomingBookings =
    bookings.filter(
      (booking) =>
        booking.status === "CONFIRMED" &&
        booking.slots &&
        new Date(
          booking.slots.start_at
        ) > new Date()
    );

  const upcomingIds = new Set(
    upcomingBookings.map(
      (booking) => booking.id
    )
  );

  const historyBookings =
    bookings.filter(
      (booking) =>
        !upcomingIds.has(booking.id)
    );

  return (
    <div style={{ marginTop: 28 }}>
      <h2>Próximas citas</h2>

      {upcomingBookings.length === 0 ? (
        <p className="muted">
          No tienes próximas citas.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            marginTop: 16,
          }}
        >
          {upcomingBookings.map(
            (booking) => (
              <div
                className="card"
                key={booking.id}
              >
                <div className="card-body">
                  <div className="kicker">
                    Confirmada
                  </div>

                  <h3>
                    {booking.businesses
                      ?.name ?? "Negocio"}
                  </h3>

                  {booking.services && (
                    <p>
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
                          booking.slots
                            .start_at
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
                          booking.slots
                            .start_at
                        )}
                      </div>
                    </>
                  )}

                  {booking.businesses && (
                    <div
                      className="meta"
                      style={{
                        marginTop: 10,
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
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 18,
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
                        loadingId ===
                        booking.id
                      }
                      onClick={() =>
                        cancelBooking(
                          booking.id
                        )
                      }
                    >
                      {loadingId ===
                      booking.id
                        ? "Cancelando..."
                        : "Cancelar cita"}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div style={{ marginTop: 42 }}>
        <h2>Historial</h2>

        {historyBookings.length === 0 ? (
          <p className="muted">
            Todavía no tienes historial.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 16,
            }}
          >
            {historyBookings.map(
              (booking) => (
                <div
                  className="card"
                  key={booking.id}
                >
                  <div className="card-body">
                    <strong>
                      {booking.businesses
                        ?.name ?? "Negocio"}
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

                    {booking.slots && (
                      <div
                        className="meta"
                        style={{
                          marginTop: 8,
                        }}
                      >
                        📅{" "}
                        {formatDate(
                          booking.slots
                            .start_at
                        )}{" "}
                        ·{" "}
                        {formatTime(
                          booking.slots
                            .start_at
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
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