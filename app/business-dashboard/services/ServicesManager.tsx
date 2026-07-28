"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  active: boolean;
};

type Props = {
  businessId: string;
  initialServices: Service[];
};

export default function ServicesManager({
  businessId,
  initialServices,
}: Props) {
  const supabase = createClient();

  const [services, setServices] =
    useState<Service[]>(initialServices);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [duration, setDuration] = useState(30);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function createService(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("services")
      .insert({
        business_id: businessId,
        name,
        description:
          description.trim() || null,
        duration_minutes: duration,
        active: true,
      })
      .select(`
        id,
        name,
        description,
        duration_minutes,
        active
      `)
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setServices((current) => [
      data,
      ...current,
    ]);

    setName("");
    setDescription("");
    setDuration(30);

    setMessage("Servicio creado correctamente.");
    setLoading(false);
  }

  async function toggleService(
    service: Service
  ) {
    const newActive = !service.active;

    const { error } = await supabase
      .from("services")
      .update({
        active: newActive,
      })
      .eq("id", service.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setServices((current) =>
      current.map((item) =>
        item.id === service.id
          ? {
              ...item,
              active: newActive,
            }
          : item
      )
    );
  }

  return (
    <div style={{ marginTop: 28 }}>
      <form
        onSubmit={createService}
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        <h2>Nuevo servicio</h2>

        <label>
          <strong>Nombre</strong>

          <input
            required
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Primera visita"
            style={inputStyle}
          />
        </label>

        <label>
          <strong>Descripción</strong>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Describe el servicio..."
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </label>

        <label>
          <strong>Duración</strong>

          <select
            value={duration}
            onChange={(e) =>
              setDuration(
                Number(e.target.value)
              )
            }
            style={inputStyle}
          >
            <option value={15}>
              15 minutos
            </option>

            <option value={30}>
              30 minutos
            </option>

            <option value={45}>
              45 minutos
            </option>

            <option value={60}>
              1 hora
            </option>

            <option value={90}>
              1 hora 30 minutos
            </option>

            <option value={120}>
              2 horas
            </option>
          </select>
        </label>

        <button
          className="btn primary"
          disabled={loading}
        >
          {loading
            ? "Creando..."
            : "Añadir servicio"}
        </button>
      </form>

      {message && (
        <p
          className="muted"
          style={{ marginTop: 14 }}
        >
          {message}
        </p>
      )}

      <div style={{ marginTop: 38 }}>
        <h2>Mis servicios</h2>

        {services.length === 0 ? (
          <p className="muted">
            Todavía no has creado ningún servicio.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 16,
            }}
          >
            {services.map((service) => (
              <div
                className="card"
                key={service.id}
              >
                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 20,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3>
                        {service.name}
                      </h3>

                      {service.description && (
                        <p className="muted">
                          {service.description}
                        </p>
                      )}

                      <div className="meta">
                        ⏱{" "}
                        {service.duration_minutes}{" "}
                        minutos
                      </div>
                    </div>

                    <button
                      className={
                        service.active
                          ? "btn"
                          : "btn primary"
                      }
                      onClick={() =>
                        toggleService(
                          service
                        )
                      }
                    >
                      {service.active
                        ? "Desactivar"
                        : "Activar"}
                    </button>
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