"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Check,
  Clock3,
  Edit3,
  Plus,
  Power,
  Save,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { ConfirmDialog, type ConfirmDialogVariant } from "@/components/ui/ConfirmDialog";

type Confirmation = {
  title: string;
  description: string;
  variant: ConfirmDialogVariant;
  confirmLabel: string;
  confirmText?: string;
  resolve: (confirmed: boolean) => void;
};

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
  endpoint?: string;
};

export default function ServicesManager({
  businessId,
  initialServices,
  endpoint = "/api/business/services",
}: Props) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  function requestConfirmation(config: Omit<Confirmation, "resolve">) {
    return new Promise<boolean>((resolve) => setConfirmation({ ...config, resolve }));
  }

  function finishConfirmation(confirmed: boolean) {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  }
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

    if (loading) {
      return;
    }

    const normalizedName =
      name.trim();

    if (!normalizedName) {
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

    setLoading(true);
    clearMessages();

    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,

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

      if (!response.ok) {
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
      setDuration(30);

      setMessage(
        "Servicio creado correctamente."
      );
    } catch (error) {
      console.error(
        "Error creating service:",
        error
      );

      setErrorMessage(
        "No se ha podido crear el servicio."
      );
    } finally {
      setLoading(false);
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
    if (loadingServiceId) {
      return;
    }

    const nextActive =
      !service.active;

    const confirmed = await requestConfirmation({
      title: nextActive ? "Activar servicio" : "Desactivar servicio",
      description: nextActive
        ? `El servicio "${service.name}" volverá a estar disponible para nuevas citas.`
        : `El servicio "${service.name}" dejará de estar disponible para nuevas citas.`,
      variant: nextActive ? "neutral" : "warning",
      confirmLabel: nextActive ? "Activar" : "Desactivar",
    });

    if (!confirmed) {
      return;
    }

    setLoadingServiceId(
      service.id
    );

    clearMessages();

    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,

                serviceId:
                  service.id,

                active:
                  nextActive,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
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
    } catch (error) {
      console.error(
        "Error updating service:",
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

    if (!normalizedName) {
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
          endpoint,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,

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

      if (!response.ok) {
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
    } catch (error) {
      console.error(
        "Error editing service:",
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
    if (loadingServiceId) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: "Eliminar servicio definitivamente",
      description: `Se eliminará "${service.name}" y sus disponibilidades. Si tiene reservas asociadas, Slottye impedirá la eliminación para conservar la información de las citas.`,
      variant: "danger",
      confirmLabel: "Eliminar servicio",
      confirmText: "ELIMINAR",
    });

    if (!confirmed) {
      return;
    }

    setLoadingServiceId(
      service.id
    );

    clearMessages();

    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,

                serviceId:
                  service.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
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
    } catch (error) {
      console.error(
        "Error deleting service:",
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

  const activeCount =
    services.filter(
      (service) =>
        service.active
    ).length;

  return (
    <div className="services10">
      <section className="services10-card services10-create-card">
        <div className="services10-section-head">
          <div className="services10-title-wrap">
            <span className="services10-icon">
              <Plus
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="services10-kicker">
                Nuevo servicio
              </span>

              <h2>
                Añadir servicio
              </h2>

              <p>
                Crea un servicio indicando su nombre, duración y una breve descripción.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={
            createService
          }
          className="services10-create-form"
        >
          <label className="services10-field services10-field-name">
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
            />
          </label>

          <label className="services10-field services10-field-duration">
            <strong>
              Duración
            </strong>

            <div className="services10-duration-input">
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
              />

              <span>
                min
              </span>
            </div>
          </label>

          <label className="services10-field services10-field-description">
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
              placeholder="Describe brevemente el servicio..."
              rows={3}
            />
          </label>

          <div className="services10-create-action">
            <button
              type="submit"
              className="btn primary"
              disabled={
                loading
              }
            >
              <Plus
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />

              {loading
                ? "Creando..."
                : "Añadir servicio"}
            </button>
          </div>
        </form>
      </section>

      {(message ||
        errorMessage) && (
        <div
          className={
            errorMessage
              ? "services10-message is-error"
              : "services10-message is-success"
          }
          role={
            errorMessage
              ? "alert"
              : "status"
          }
        >
          {errorMessage ||
            message}
        </div>
      )}

      <section className="services10-card">
        <div className="services10-section-head services10-list-head">
          <div className="services10-title-wrap">
            <span className="services10-icon">
              <Wrench
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="services10-kicker">
                Servicios
              </span>

              <h2>
                Servicios del negocio
              </h2>

              <p>
                Gestiona qué servicios pueden reservar tus clientes.
              </p>
            </div>
          </div>

          <div className="services10-summary">
            <div>
              <strong>
                {services.length}
              </strong>

              <span>
                total
              </span>
            </div>

            <div>
              <strong>
                {activeCount}
              </strong>

              <span>
                activos
              </span>
            </div>
          </div>
        </div>

        {services.length ===
        0 ? (
          <div className="services10-empty">
            <span className="services10-empty-icon">
              <Wrench
                size={23}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>

            <strong>
              Todavía no tienes servicios
            </strong>

            <p>
              Añade el primero desde el formulario superior.
            </p>
          </div>
        ) : (
          <div className="services10-list">
            {services.map(
              (
                service
              ) => (
                <article
                  key={
                    service.id
                  }
                  className={
                    service.active
                      ? "services10-service"
                      : "services10-service is-inactive"
                  }
                >
                  <div className="services10-service-main">
                    <div className="services10-service-heading">
                      <div>
                        <h3>
                          {service.name}
                        </h3>

                        <span
                          className={
                            service.active
                              ? "services10-badge"
                              : "services10-badge is-inactive"
                          }
                        >
                          {service.active ? (
                            <>
                              <Check
                                size={12}
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />

                              Activo
                            </>
                          ) : (
                            "Inactivo"
                          )}
                        </span>
                      </div>

                      <div className="services10-duration">
                        <Clock3
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        {service.duration_minutes} min
                      </div>
                    </div>

                    {service.description ? (
                      <p>
                        {service.description}
                      </p>
                    ) : (
                      <p className="is-placeholder">
                        Sin descripción.
                      </p>
                    )}
                  </div>

                  <div className="services10-actions">
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
                      <Edit3
                        size={15}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      Editar
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
                      <Power
                        size={15}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      {loadingServiceId ===
                      service.id
                        ? "Procesando..."
                        : service.active
                          ? "Desactivar"
                          : "Activar"}
                    </button>

                    <button
                      type="button"
                      className="btn services10-delete"
                      disabled={
                        loadingServiceId ===
                        service.id
                      }
                      onClick={() =>
                        deleteService(
                          service
                        )
                      }
                    >
                      <Trash2
                        size={15}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      Eliminar
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {editingService && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="services10-edit-title"
          className="services10-modal-backdrop"
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
            className="services10-modal"
          >
            <div className="services10-modal-head">
              <div>
                <span className="services10-kicker">
                  Servicio
                </span>

                <h2 id="services10-edit-title">
                  Editar servicio
                </h2>

                <p>
                  Actualiza la información que verán tus clientes.
                </p>
              </div>

              <button
                type="button"
                className="services10-close"
                aria-label="Cerrar"
                onClick={
                  closeEditing
                }
                disabled={
                  loadingServiceId !==
                  null
                }
              >
                <X
                  size={19}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="services10-modal-fields">
              <label className="services10-field">
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
                />
              </label>

              <label className="services10-field">
                <strong>
                  Duración
                </strong>

                <div className="services10-duration-input">
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
                  />

                  <span>
                    min
                  </span>
                </div>
              </label>

              <label className="services10-field services10-modal-description">
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
                />
              </label>
            </div>

            <div className="services10-modal-actions">
              <button
                type="button"
                className="btn"
                onClick={
                  closeEditing
                }
                disabled={
                  loadingServiceId !==
                  null
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
                <Save
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                {loadingServiceId
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .services10 {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .services10-card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 10px 28px
            rgba(31,27,48,.025);
          overflow: hidden;
        }

        .services10-create-card {
          padding-bottom: 18px;
        }

        .services10-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 19px 14px;
        }

        .services10-list-head {
          border-bottom:
            1px solid #efedf2;
        }

        .services10-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
        }

        .services10-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 36px;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .services10-kicker {
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
        }

        .services10-section-head h2,
        .services10-modal-head h2 {
          margin: 2px 0 3px;
          font-size: 22px;
          line-height: 1.18;
          letter-spacing: -.025em;
        }

        .services10-section-head p,
        .services10-modal-head p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .services10-create-form {
          display: grid;
          grid-template-columns:
            minmax(0, 1.5fr)
            minmax(150px, .5fr)
            auto;
          gap: 12px;
          align-items: end;
          padding: 0 19px;
        }

        .services10-field {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .services10-field strong {
          font-size: 12px;
        }

        .services10-field input,
        .services10-field textarea {
          width: 100%;
          padding: 10px 11px;
          border: 1px solid #dedbe5;
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .services10-field textarea {
          resize: vertical;
          min-height: 78px;
          line-height: 1.45;
        }

        .services10-field input:focus,
        .services10-field textarea:focus {
          border-color: #b9adff;
          box-shadow:
            0 0 0 3px
            rgba(112,87,245,.07);
        }

        .services10-field-description {
          grid-column: 1 / -1;
        }

        .services10-duration-input {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 7px;
        }

        .services10-duration-input span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .services10-create-action {
          display: flex;
          align-items: end;
        }

        .services10-create-action .btn,
        .services10-actions .btn,
        .services10-modal-actions .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .services10-message {
          display: flex;
          align-items: center;
          min-height: 42px;
          padding: 10px 13px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.4;
        }

        .services10-message.is-success {
          border: 1px solid #b9eccb;
          background: #edf9f1;
          color: #237549;
        }

        .services10-message.is-error {
          border: 1px solid #ffc9c9;
          background: #fff0f0;
          color: #b42318;
        }

        .services10-summary {
          display: grid;
          grid-template-columns:
            repeat(2, auto);
          gap: 8px;
        }

        .services10-summary > div {
          min-width: 74px;
          padding: 8px 10px;
          border-radius: 10px;
          background: #f8f6ff;
          text-align: center;
        }

        .services10-summary strong,
        .services10-summary span {
          display: block;
        }

        .services10-summary strong {
          color: var(--accent-dark);
          font-size: 18px;
          line-height: 1;
        }

        .services10-summary span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 9px;
        }

        .services10-list {
          display: grid;
        }

        .services10-service {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 20px;
          padding: 15px 18px;
          border-bottom:
            1px solid #efedf2;
          transition:
            background .15s ease;
        }

        .services10-service:last-child {
          border-bottom: 0;
        }

        .services10-service:hover {
          background: #fcfbff;
        }

        .services10-service.is-inactive {
          background: #fcfbfd;
        }

        .services10-service-main {
          min-width: 0;
        }

        .services10-service-heading {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;
        
          align-items: center;
          gap: 14px;
        }

        .services10-service-heading > div:first-child {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .services10-service h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.25;
        }

        .services10-service p {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .services10-service p.is-placeholder {
          font-style: italic;
          opacity: .75;
        }

        .services10-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border-radius: 999px;
          background: #eaf8ef;
          color: #24774c;
          font-size: 9px;
          font-weight: 850;
          white-space: nowrap;
        }

        .services10-badge.is-inactive {
          background: #f1eff4;
          color: #77717c;
        }

        .services10-duration {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        
          position: relative;
          top: 6px;
        
          gap: 5px;
        
          color: #57515e;
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
        }

        .services10-duration :global(svg) {
          color: #8276d9;
        }

        .services10-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
        }

        .services10-actions .btn {
          padding: 8px 10px;
          font-size: 11px;
        }

        .services10-delete {
          color: #b42318 !important;
          border-color: #ffc9c9 !important;
          background: #fff !important;
        }

        .services10-empty {
          display: grid;
          justify-items: center;
          padding: 38px 20px;
          text-align: center;
        }

        .services10-empty-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
          border-radius: 12px;
          background: #f0ecff;
          color: var(--accent);
        }

        .services10-empty strong {
          font-size: 14px;
        }

        .services10-empty p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        .services10-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            rgba(15,23,42,.52);
        }

        .services10-modal {
          width: min(560px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 24px 70px
            rgba(15,23,42,.25);
        }

        .services10-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .services10-close {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 36px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          cursor: pointer;
        }

        .services10-modal-fields {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(130px, .42fr);
          gap: 13px;
          margin-top: 18px;
        }

        .services10-modal-description {
          grid-column: 1 / -1;
        }

        .services10-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 20px;
        }

        @media (max-width: 760px) {
          .services10-create-form {
            grid-template-columns:
              minmax(0, 1fr)
              130px;
          }

          .services10-create-action {
            grid-column: 1 / -1;
          }

          .services10-create-action .btn {
            width: 100%;
          }

          .services10-service {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .services10-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 560px) {
          .services10 {
            gap: 10px;
            margin-top: 10px;
          }

          .services10-section-head {
            padding: 15px;
          }

          .services10-list-head {
            align-items: stretch;
            flex-direction: column;
          }

          .services10-summary {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .services10-create-form {
            grid-template-columns: 1fr;
            padding: 0 15px;
          }

          .services10-field-description,
          .services10-create-action {
            grid-column: auto;
          }

          .services10-service {
            padding: 14px;
          }

          .services10-service-heading {
            align-items: flex-start;
          }

          .services10-service-heading > div:first-child {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .services10-actions {
            display: grid;
            grid-template-columns:
              repeat(2, 1fr);
          }

          .services10-actions .btn {
            width: 100%;
          }

          .services10-delete {
            grid-column: 1 / -1;
          }

          .services10-modal {
            padding: 18px;
          }

          .services10-modal-fields {
            grid-template-columns: 1fr;
          }

          .services10-modal-description {
            grid-column: auto;
          }

          .services10-modal-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .services10-modal-actions .btn {
            width: 100%;
          }
        }
      `}</style>
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => { if (!open) finishConfirmation(false); }}
        title={confirmation?.title ?? "Confirmar acción"}
        description={confirmation?.description ?? ""}
        variant={confirmation?.variant}
        confirmLabel={confirmation?.confirmLabel}
        confirmText={confirmation?.confirmText}
        onConfirm={() => finishConfirmation(true)}
      />
    </div>
  );
}
