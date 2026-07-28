"use client";

import { FormEvent, useState } from "react";
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
  businessId: string;
  services: Service[];
  initialSlots: Slot[];
};

export default function CalendarManager({
  businessId,
  services,
  initialSlots,
}: Props) {
  const supabase = createClient();

  const [slots, setSlots] = useState(initialSlots);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    const service = services.find(
      (item) => item.id === serviceId
    );

    if (!service) {
      setMessage("Selecciona un servicio.");
      return;
    }

    if (!date || !time) {
      setMessage("Selecciona fecha y hora.");
      return;
    }

    const start = new Date(`${date}T${time}`);

    if (start <= new Date()) {
      setMessage("La cita debe ser posterior a la fecha actual.");
      return;
    }

    const end = new Date(
      start.getTime() +
        service.duration_minutes * 60 * 1000
    );

    setLoading(true);

    const { data, error } = await supabase
      .from("slots")
      .insert({
        business_id: businessId,
        service_id: service.id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "AVAILABLE",
      })
      .select(`
        id,
        service_id,
        start_at,
        end_at,
        status
      `)
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    fetch("/api/notifications/new-slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          slotIds: [data.id],
        }),
      }).catch((error) => {
        console.error(
          "Error notificando nuevas citas:",
          error
        );
      });

    setSlots((current) =>
      [...current, data].sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime()
      )
    );

    setDate("");
    setTime("");
    setMessage("Cita disponible creada correctamente.");
    setLoading(false);
  }

  async function deleteSlot(slot: Slot) {
    if (slot.status !== "AVAILABLE") {
      setMessage("Una cita reservada no se puede eliminar.");
      return;
    }

    const { error } = await supabase
      .from("slots")
      .delete()
      .eq("id", slot.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSlots((current) =>
      current.filter((item) => item.id !== slot.id)
    );

    setMessage("Cita eliminada.");
  }

  function getServiceName(id: string | null) {
    return (
      services.find((service) => service.id === id)?.name ??
      "Servicio"
    );
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  return (
    <div style={{ marginTop: 28 }}>
      <form
        onSubmit={createSlot}
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        <h2>Nueva cita disponible</h2>

        {services.length === 0 ? (
          <div className="panel">
            <strong>Primero necesitas crear un servicio.</strong>
            <p className="muted">
              Las citas se vinculan a uno de los servicios del negocio.
            </p>
          </div>
        ) : (
          <>
            <label>
              <strong>Servicio</strong>

              <select
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecciona un servicio</option>

                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.duration_minutes} min
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label>
                <strong>Fecha</strong>

                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label>
                <strong>Hora</strong>

                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>

            <button
              className="btn primary"
              disabled={loading}
            >
              {loading
                ? "Creando..."
                : "Añadir cita disponible"}
            </button>
          </>
        )}
      </form>

      {message && (
        <p className="muted" style={{ marginTop: 14 }}>
          {message}
        </p>
      )}

      <div style={{ marginTop: 40 }}>
        <h2>Próximas citas</h2>

        {slots.length === 0 ? (
          <p className="muted">
            No tienes citas disponibles creadas.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 16,
            }}
          >
            {slots.map((slot) => (
              <div className="card" key={slot.id}>
                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <div>
                      <strong>
                        {getServiceName(slot.service_id)}
                      </strong>

                      <div
                        className="meta"
                        style={{ marginTop: 6 }}
                      >
                        📅 {formatDate(slot.start_at)}
                      </div>

                      <div
                        className="muted"
                        style={{ marginTop: 6 }}
                      >
                        Estado: {slot.status}
                      </div>
                    </div>

                    {slot.status === "AVAILABLE" && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => deleteSlot(slot)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  border: "1px solid var(--border)",
  borderRadius: 14,
  marginTop: 8,
  background: "var(--card)",
  color: "var(--text)",
};