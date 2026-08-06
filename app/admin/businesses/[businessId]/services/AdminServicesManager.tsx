"use client";

import {
  FormEvent,
  useState,
} from "react";

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

export default function AdminServicesManager({
  businessId,
  initialServices,
}: Props) {
  const [
    services,
    setServices,
  ] =
    useState<Service[]>(
      initialServices
    );

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    duration,
    setDuration,
  ] =
    useState(30);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    loadingServiceId,
    setLoadingServiceId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function createService(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/services`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,
                description,

                durationMinutes:
                  duration,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setMessage(
          result.error ??
            "No se ha podido crear el servicio."
        );

        return;
      }

      setServices(
        (
          current
        ) => [
          result.service,
          ...current,
        ]
      );

      setName("");
      setDescription("");
      setDuration(30);

      setMessage(
        "Servicio creado correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error creating service as admin:",
        error
      );

      setMessage(
        "No se ha podido crear el servicio."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleService(
    service:
      Service
  ) {
    if (
      loadingServiceId
    ) {
      return;
    }

    const nextActive =
      !service.active;

    const confirmed =
      window.confirm(
        nextActive
          ? `¿Activar el servicio "${service.name}"?`
          : `¿Desactivar el servicio "${service.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setLoadingServiceId(
      service.id
    );

    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/services`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                serviceId:
                  service.id,

                active:
                  nextActive,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setMessage(
          result.error ??
            "No se ha podido cambiar el estado del servicio."
        );

        return;
      }

      setServices(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              service.id
                ? result.service
                : item
          )
      );

      setMessage(
        nextActive
          ? "Servicio activado correctamente."
          : "Servicio desactivado correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error updating service as admin:",
        error
      );

      setMessage(
        "No se ha podido cambiar el estado del servicio."
      );
    } finally {
      setLoadingServiceId(
        null
      );
    }
  }

  return (
    <div
      style={{
        marginTop:
          28,
      }}
    >
      <form
        onSubmit={
          createService
        }
        style={{
          display:
            "grid",

          gap:
            12,
        }}
      >
        <h2>
          Nuevo servicio
        </h2>

        <p className="muted">
          El servicio se añadirá directamente a la ficha y agenda del negocio.
        </p>

        <label>
          <strong>
            Nombre
          </strong>

          <input
            required
            value={
              name
            }
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
            placeholder="Primera visita"
            style={
              inputStyle
            }
          />
        </label>

        <label>
          <strong>
            Descripción
          </strong>

          <textarea
            value={
              description
            }
            onChange={(
              event
            ) =>
              setDescription(
                event.target.value
              )
            }
            placeholder="Describe el servicio..."
            rows={4}
            style={{
              ...inputStyle,

              resize:
                "vertical",
            }}
          />
        </label>

        <label>
          <strong>
            Duración exacta
          </strong>

          <input
            type="number"
            min={1}
            max={1440}
            step={1}
            required
            value={
              duration
            }
            onChange={(
              event
            ) =>
              setDuration(
                Number(
                  event.target.value
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
                -4,

              fontSize:
                12,
            }}
          >
            Duración en minutos.
          </div>
        </label>

        <button
          type="submit"
          className="btn primary"
          disabled={
            loading
          }
        >
          {loading
            ? "Creando..."
            : "Añadir servicio"}
        </button>
      </form>

      {message && (
        <p
          className="muted"
          style={{
            marginTop:
              14,
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          marginTop:
            38,
        }}
      >
        <h2>
          Servicios del negocio
        </h2>

        {services.length ===
        0 ? (
          <p className="muted">
            Este negocio todavía no tiene servicios.
          </p>
        ) : (
          <div
            style={{
              display:
                "grid",

              gap:
                12,

              marginTop:
                16,
            }}
          >
            {services.map(
              (
                service
              ) => (
                <div
                  className="card"
                  key={
                    service.id
                  }
                >
                  <div className="card-body">
                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          20,

                        alignItems:
                          "center",

                        flexWrap:
                          "wrap",
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

                        <div
                          style={{
                            marginTop:
                              8,

                            fontSize:
                              12,

                            fontWeight:
                              800,

                            color:
                              service.active
                                ? "#166534"
                                : "#b91c1c",
                          }}
                        >
                          {service.active
                            ? "ACTIVO"
                            : "INACTIVO"}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={
                          service.active
                            ? "btn"
                            : "btn primary"
                        }
                        disabled={
                          loadingServiceId ===
                          service.id
                        }
                        onClick={() =>
                          toggleService(
                            service
                          )
                        }
                      >
                        {loadingServiceId ===
                        service.id
                          ? "Procesando..."
                          : service.active
                            ? "Desactivar"
                            : "Activar"}
                      </button>
                    </div>
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

const inputStyle = {
  width:
    "100%",

  padding:
    14,

  border:
    "1px solid var(--border)",

  borderRadius:
    14,

  marginTop:
    8,

  background:
    "var(--card)",

  color:
    "var(--text)",

  font:
    "inherit",
};