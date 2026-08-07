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
    editingService,
    setEditingService,
  ] =
    useState<
      Service |
      null
    >(null);

  const [
    editName,
    setEditName,
  ] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] =
    useState("");

  const [
    editDuration,
    setEditDuration,
  ] =
    useState(30);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /*
   * ============================================================
   * MENSAJES
   * ============================================================
   */

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  /*
   * ============================================================
   * CREAR SERVICIO
   * ============================================================
   */

  async function createService(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      loading
    ) {
      return;
    }

    const normalizedName =
      name.trim();

    if (
      !normalizedName
    ) {
      setErrorMessage(
        "Introduce el nombre del servicio."
      );

      return;
    }

    if (
      !Number.isInteger(
        duration
      ) ||
      duration <
        1 ||
      duration >
        1440
    ) {
      setErrorMessage(
        "Introduce una duración válida entre 1 y 1440 minutos."
      );

      return;
    }

    setLoading(
      true
    );

    clearMessages();

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
                name:
                  normalizedName,

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
        setErrorMessage(
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
      setDuration(
        30
      );

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

      setErrorMessage(
        "No se ha podido crear el servicio."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * ACTIVAR / DESACTIVAR
   * ============================================================
   */

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
          : `¿Desactivar el servicio "${service.name}"? Dejará de estar disponible para nuevas citas.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setLoadingServiceId(
      service.id
    );

    clearMessages();

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
        setErrorMessage(
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

      setErrorMessage(
        "No se ha podido cambiar el estado del servicio."
      );
    } finally {
      setLoadingServiceId(
        null
      );
    }
  }

  /*
   * ============================================================
   * ABRIR EDICIÓN
   * ============================================================
   */

  function startEditing(
    service:
      Service
  ) {
    clearMessages();

    setEditingService(
      service
    );

    setEditName(
      service.name
    );

    setEditDescription(
      service.description ??
        ""
    );

    setEditDuration(
      service.duration_minutes
    );
  }

  function closeEditing() {
    if (
      loadingServiceId
    ) {
      return;
    }

    setEditingService(
      null
    );

    setErrorMessage("");
  }

  /*
   * ============================================================
   * GUARDAR EDICIÓN
   * ============================================================
   */

  async function updateService(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !editingService ||
      loadingServiceId
    ) {
      return;
    }

    const normalizedName =
      editName.trim();

    if (
      !normalizedName
    ) {
      setErrorMessage(
        "El nombre del servicio es obligatorio."
      );

      return;
    }

    if (
      !Number.isInteger(
        editDuration
      ) ||
      editDuration <
        1 ||
      editDuration >
        1440
    ) {
      setErrorMessage(
        "Introduce una duración válida entre 1 y 1440 minutos."
      );

      return;
    }

    setLoadingServiceId(
      editingService.id
    );

    clearMessages();

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
                  editingService.id,

                name:
                  normalizedName,

                description:
                  editDescription,

                durationMinutes:
                  editDuration,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setErrorMessage(
          result.error ??
            "No se ha podido editar el servicio."
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
              editingService.id
                ? result.service
                : item
          )
      );

      setEditingService(
        null
      );

      setMessage(
        "Servicio actualizado correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error editing service as admin:",
        error
      );

      setErrorMessage(
        "No se ha podido editar el servicio."
      );
    } finally {
      setLoadingServiceId(
        null
      );
    }
  }

  /*
   * ============================================================
   * ELIMINAR
   * ============================================================
   */

  async function deleteService(
    service:
      Service
  ) {
    if (
      loadingServiceId
    ) {
      return;
    }

    const confirmation =
      window.prompt(
        `Vas a eliminar definitivamente el servicio "${service.name}".\n\nSi existen reservas asociadas, Slottye NO permitirá eliminarlo para no perder información del historial.\n\nSi no tiene reservas, también se eliminarán sus disponibilidades.\n\nEscribe ELIMINAR para continuar.`
      );

    if (
      confirmation !==
      "ELIMINAR"
    ) {
      return;
    }

    setLoadingServiceId(
      service.id
    );

    clearMessages();

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/services`,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                serviceId:
                  service.id,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setErrorMessage(
          result.error ??
            "No se ha podido eliminar el servicio."
        );

        return;
      }

      setServices(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              service.id
          )
      );

      setMessage(
        result.deletedSlots >
          0
          ? `Servicio eliminado correctamente. También se eliminaron ${result.deletedSlots} disponibilidades.`
          : "Servicio eliminado correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error deleting service as admin:",
        error
      );

      setErrorMessage(
        "No se ha podido eliminar el servicio."
      );
    } finally {
      setLoadingServiceId(
        null
      );
    }
  }

  return (
    <>
      <div
        style={{
          marginTop:
            28,
        }}
      >
        {/* ======================================================
            NUEVO SERVICIO
            ====================================================== */}

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

        {/* ======================================================
            MENSAJES
            ====================================================== */}

        {message && (
          <div
            style={{
              marginTop:
                16,

              padding:
                "12px 14px",

              border:
                "1px solid #bbf7d0",

              borderRadius:
                12,

              background:
                "#f0fdf4",

              color:
                "#166534",
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
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

              fontWeight:
                600,

              lineHeight:
                1.6,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ======================================================
            SERVICIOS
            ====================================================== */}

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

                          alignItems:
                            "center",

                          gap:
                            20,

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div
                          style={{
                            minWidth:
                              0,

                            flex:
                              "1 1 260px",
                          }}
                        >
                          <h3
                            style={{
                              margin:
                                0,
                            }}
                          >
                            {service.name}
                          </h3>

                          {service.description && (
                            <p
                              className="muted"
                              style={{
                                margin:
                                  "8px 0 0",

                                lineHeight:
                                  1.6,
                              }}
                            >
                              {service.description}
                            </p>
                          )}

                          <div
                            className="meta"
                            style={{
                              marginTop:
                                8,
                            }}
                          >
                            ⏱{" "}
                            {
                              service.duration_minutes
                            }{" "}
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

                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              8,

                            flexWrap:
                              "wrap",

                            justifyContent:
                              "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            className="btn"
                            disabled={
                              loadingServiceId ===
                              service.id
                            }
                            onClick={() =>
                              startEditing(
                                service
                              )
                            }
                          >
                            ✏️ Editar
                          </button>

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

                          <button
                            type="button"
                            className="btn"
                            disabled={
                              loadingServiceId ===
                              service.id
                            }
                            onClick={() =>
                              deleteService(
                                service
                              )
                            }
                            style={{
                              color:
                                "#b91c1c",

                              borderColor:
                                "#fecaca",
                            }}
                          >
                            🗑 Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL EDITAR
          ======================================================== */}

      {editingService && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-service-title"
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              10000,

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
              closeEditing();
            }
          }}
        >
          <form
            onSubmit={
              updateService
            }
            style={{
              width:
                "100%",

              maxWidth:
                600,

              maxHeight:
                "90vh",

              overflowY:
                "auto",

              padding:
                26,

              border:
                "1px solid var(--border)",

              borderRadius:
                18,

              background:
                "#ffffff",

              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.25)",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap:
                  16,
              }}
            >
              <div>
                <div className="kicker">
                  Slottye Super Admin
                </div>

                <h2
                  id="admin-edit-service-title"
                  style={{
                    margin:
                      "8px 0 0",
                  }}
                >
                  Editar servicio
                </h2>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                onClick={
                  closeEditing
                }
                disabled={
                  loadingServiceId !==
                  null
                }
                style={
                  closeButtonStyle
                }
              >
                ×
              </button>
            </div>

            <div
              style={{
                display:
                  "grid",

                gap:
                  14,

                marginTop:
                  22,
              }}
            >
              <label>
                <strong>
                  Nombre
                </strong>

                <input
                  required
                  value={
                    editName
                  }
                  onChange={(
                    event
                  ) =>
                    setEditName(
                      event.target.value
                    )
                  }
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
                    editDescription
                  }
                  onChange={(
                    event
                  ) =>
                    setEditDescription(
                      event.target.value
                    )
                  }
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
                    editDuration
                  }
                  onChange={(
                    event
                  ) =>
                    setEditDuration(
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
            </div>

            {errorMessage && (
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

                  fontWeight:
                    600,
                }}
              >
                ⚠️ {errorMessage}
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
                  loadingServiceId !==
                  null
                }
                onClick={
                  closeEditing
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn primary"
                disabled={
                  loadingServiceId !==
                  null
                }
              >
                {loadingServiceId
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
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

const closeButtonStyle = {
  width:
    38,

  height:
    38,

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  border:
    "1px solid var(--border)",

  borderRadius:
    10,

  background:
    "#ffffff",

  cursor:
    "pointer",

  fontSize:
    22,

  lineHeight:
    1,
};