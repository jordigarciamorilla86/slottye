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
};

export function AvailableSlots({
  slots,
  services,
  loggedIn,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  function getServiceName(serviceId: string | null) {
    return (
      services.find(
        (service) => service.id === serviceId
      )?.name ?? "Cita"
    );
  }

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

  async function reserve(slotId: string) {
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

    const { error } = await supabase.rpc(
      "book_slot",
      {
        p_slot_id: slotId,
      }
    );

    if (error) {
      setMessage(error.message);
      setLoadingId(null);
      return;
    }

    setMessage(
      "¡Cita reservada correctamente!"
    );

    setLoadingId(null);

    router.refresh();
  }

  if (slots.length === 0) {
    return (
      <div className="panel">
        <h3>No hay citas disponibles</h3>

        <p className="muted">
          Este negocio no tiene citas libres en este
          momento.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {slots.map((slot) => (
          <div
            className="card"
            key={slot.id}
          >
            <div className="card-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                    📅 {formatDate(slot.start_at)}
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      marginTop: 8,
                    }}
                  >
                    {formatTime(slot.start_at)}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    loadingId === slot.id
                  }
                  onClick={() =>
                    reserve(slot.id)
                  }
                >
                  {loadingId === slot.id
                    ? "Reservando..."
                    : "Reservar"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p
          className="muted"
          style={{ marginTop: 16 }}
        >
          {message}
        </p>
      )}
    </>
  );
}