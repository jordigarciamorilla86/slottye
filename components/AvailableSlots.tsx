"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

type Props = {
  slots: Slot[];
  services: Service[];
  loggedIn: boolean;
  selectedServiceId: string;
  onServiceChange: (serviceId: string) => void;
};

export function AvailableSlots({
  slots,
  services,
  loggedIn,
  selectedServiceId,
  onServiceChange,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

    const [messageType, setMessageType] =
  useState<"success" | "error" | null>(null);

  function getServiceName(
    serviceId: string | null
  ) {
    return (
      services.find(
        (service) =>
          service.id === serviceId
      )?.name ?? "Cita"
    );
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(new Date(value));
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(value));
  }

  async function reserve(
    slotId: string
  ) {
    if (!loggedIn) {
      router.push(
        `/login?next=${encodeURIComponent(
          window.location.pathname
        )}`
      );

      return;
    }

    setLoadingId(slotId);
setMessage("");
setMessageType(null);

    const {
      data: bookingId,
      error,
    } = await supabase.rpc(
      "book_slot",
      {
        p_slot_id: slotId,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setLoadingId(null);
      return;
    }
    if (bookingId) {
      const notificationResponse =
        await fetch(
          "/api/notifications/booking-confirmed",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
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
          "Error enviando confirmación:",
          result
        );
      }
    }
    setMessage(
      "¡Cita reservada correctamente!"
    );
    setMessageType("success");

    setLoadingId(null);

    router.refresh();
  }

  const filteredSlots =
    selectedServiceId === "all"
      ? slots
      : slots.filter(
          (slot) =>
            slot.service_id ===
            selectedServiceId
        );

  if (slots.length === 0) {
    return (
      <div className="panel">
        <h3>
          No hay citas disponibles
        </h3>

        <p className="muted">
          Este negocio no tiene citas libres
          en este momento.
        </p>
      </div>
    );
  }

  return (
    <>
      {services.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 20,
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
              onServiceChange("all")
            }
          >
            Todos los servicios
          </button>

          {services.map(
            (service) => (
              <button
                type="button"
                key={service.id}
                className={
                  selectedServiceId ===
                  service.id
                    ? "btn primary"
                    : "btn"
                }
                onClick={() =>
                  onServiceChange(service.id)
                }
              >
                {service.name}
              </button>
            )
          )}
        </div>
      )}

      {filteredSlots.length === 0 ? (
        <div className="panel">
          <h3>
            No hay citas disponibles
          </h3>

          <p className="muted">
            Ahora mismo no hay citas
            disponibles para este servicio.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {filteredSlots.map(
            (slot) => (
              <div
                className="card"
                key={slot.id}
              >
                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: 20,
                      flexWrap: "wrap",
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
                          fontSize: 22,
                          fontWeight: 800,
                          marginTop: 8,
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
                        loadingId ===
                        slot.id
                      }
                      onClick={() =>
                        reserve(slot.id)
                      }
                    >
                      {loadingId ===
                      slot.id
                        ? "Reservando..."
                        : "Reservar"}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

{message && (
  <div
    role="alert"
    style={{
      marginTop: 18,
      padding: "14px 16px",
      borderRadius: 14,
      border:
        messageType === "error"
          ? "1px solid #ef4444"
          : "1px solid #22c55e",
      background:
        messageType === "error"
          ? "#fef2f2"
          : "#f0fdf4",
      color:
        messageType === "error"
          ? "#b91c1c"
          : "#166534",
      fontWeight: 600,
    }}
  >
    {messageType === "error" ? "⚠️ " : "✓ "}
    {message}
  </div>
)}
    </>
  );
}