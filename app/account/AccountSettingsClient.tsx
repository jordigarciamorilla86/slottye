"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  AtSign,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  initialEmail: string;
  role: string | null;
};

type OpenSection =
  | "email"
  | "password"
  | "delete"
  | null;

function translateEmailError(
  message: string
) {
  const text =
    message.toLowerCase();

  if (
    text.includes(
      "email address is invalid"
    ) ||
    text.includes(
      "invalid email"
    )
  ) {
    return "Introduce una dirección de correo electrónico válida.";
  }

  if (
    text.includes(
      "email already registered"
    ) ||
    text.includes(
      "already been registered"
    )
  ) {
    return "Ya existe una cuenta asociada a ese correo electrónico.";
  }

  if (
    text.includes(
      "for security purposes"
    ) &&
    text.includes(
      "you can only request this after"
    )
  ) {
    const match =
      message.match(
        /after\s+(\d+)\s+seconds?/i
      );

    const seconds =
      match?.[1];

    return seconds
      ? `Por seguridad, espera ${seconds} segundos antes de volver a intentarlo.`
      : "Por seguridad, espera unos segundos antes de volver a intentarlo.";
  }

  if (
    text.includes(
      "rate limit"
    ) ||
    text.includes(
      "too many requests"
    )
  ) {
    return "Has realizado demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.";
  }

  if (
    text.includes(
      "reauthentication"
    ) ||
    text.includes(
      "reauthenticate"
    )
  ) {
    return "Por seguridad, vuelve a iniciar sesión antes de cambiar tu correo electrónico.";
  }

  return "No se ha podido solicitar el cambio de correo. Inténtalo de nuevo.";
}

function translatePasswordError(
  message: string,
  code?: string
) {
  const text =
    message.toLowerCase();

  if (
    code ===
      "invalid_credentials" ||
    text.includes(
      "current password"
    ) &&
    (
      text.includes("invalid") ||
      text.includes("incorrect")
    )
  ) {
    return "La contraseña actual no es correcta.";
  }

  if (
    text.includes(
      "current_password"
    ) &&
    text.includes(
      "required"
    )
  ) {
    return "Debes introducir tu contraseña actual para confirmar el cambio.";
  }

  if (
    code ===
      "weak_password" ||
    text.includes(
      "known to be weak"
    ) ||
    text.includes(
      "leaked password"
    )
  ) {
    return "Esa contraseña es demasiado predecible o aparece en filtraciones conocidas. Utiliza una contraseña nueva y única.";
  }

  if (
    code ===
      "reauthentication_not_valid" ||
    text.includes(
      "reauthentication nonce"
    )
  ) {
    return "El código de seguridad no es válido o ha caducado. Solicita uno nuevo.";
  }

  if (
    code ===
      "reauthentication_needed" ||
    text.includes(
      "reauthentication"
    )
  ) {
    return "Por seguridad, debes confirmar el código enviado a tu correo.";
  }

  if (
    text.includes(
      "password should be at least"
    ) ||
    text.includes(
      "password should contain at least one character of each"
    )
  ) {
    return "La contraseña debe tener al menos 8 caracteres e incluir una letra mayúscula, una minúscula, un número y un símbolo.";
  }

  if (
    code ===
      "same_password" ||
    text.includes(
      "new password should be different from the old password"
    )
  ) {
    return "La nueva contraseña debe ser diferente de la contraseña actual.";
  }

  return "No se ha podido cambiar la contraseña. Inténtalo de nuevo.";
}

export default function AccountSettingsClient({
  initialEmail,
  role,
}: Props) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    openSection,
    setOpenSection,
  ] =
    useState<OpenSection>(
      null
    );

  const [
    newEmail,
    setNewEmail,
  ] =
    useState("");

  const [
    confirmEmail,
    setConfirmEmail,
  ] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    passwordNonce,
    setPasswordNonce,
  ] =
    useState("");

  const [
    passwordReauthentication,
    setPasswordReauthentication,
  ] =
    useState(false);

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState<
      "email" |
      "password" |
      "delete" |
      null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState<{
      text: string;
      type:
        | "success"
        | "error";
    } | null>(
      null
    );

  function showMessage(
    text: string,
    type:
      | "success"
      | "error"
  ) {
    setMessage({
      text,
      type,
    });
  }

  function toggleSection(
    section: OpenSection
  ) {
    setMessage(
      null
    );

    setOpenSection(
      (
        current
      ) =>
        current ===
        section
          ? null
          : section
    );
  }

  async function handleEmailSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(
      null
    );

    const normalizedEmail =
      newEmail
        .trim()
        .toLowerCase();

    const normalizedConfirmEmail =
      confirmEmail
        .trim()
        .toLowerCase();

    const normalizedCurrentEmail =
      initialEmail
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail
    ) {
      showMessage(
        "Introduce tu nuevo correo electrónico.",
        "error"
      );
      return;
    }

    if (
      normalizedEmail !==
      normalizedConfirmEmail
    ) {
      showMessage(
        "Los correos electrónicos no coinciden.",
        "error"
      );
      return;
    }

    if (
      normalizedEmail ===
      normalizedCurrentEmail
    ) {
      showMessage(
        "El nuevo correo debe ser diferente del correo actual.",
        "error"
      );
      return;
    }

    setLoading(
      "email"
    );

    const {
      error,
    } =
      await supabase.auth.updateUser(
        {
          email:
            normalizedEmail,
        },
        {
          emailRedirectTo:
            `${window.location.origin}/account`,
        }
      );

    if (
      error
    ) {
      showMessage(
        translateEmailError(
          error.message
        ),
        "error"
      );

      setLoading(
        null
      );

      return;
    }

    setNewEmail("");
    setConfirmEmail("");

    showMessage(
      "Solicitud enviada. Revisa tu correo y sigue las instrucciones para confirmar el cambio de dirección.",
      "success"
    );

    setLoading(
      null
    );
  }

  function validatePassword() {
    if (
      password.length <
      8
    ) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    if (
      !/[a-z]/.test(
        password
      )
    ) {
      return "La contraseña debe incluir una letra minúscula.";
    }

    if (
      !/[A-Z]/.test(
        password
      )
    ) {
      return "La contraseña debe incluir una letra mayúscula.";
    }

    if (
      !/[0-9]/.test(
        password
      )
    ) {
      return "La contraseña debe incluir un número.";
    }

    if (
      !/[^A-Za-z0-9]/.test(
        password
      )
    ) {
      return "La contraseña debe incluir un símbolo.";
    }

    if (
      password !==
      confirmPassword
    ) {
      return "Las contraseñas no coinciden.";
    }

    return null;
  }

  async function handlePasswordSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(
      null
    );

    if (
      !currentPassword
    ) {
      showMessage(
        "Introduce tu contraseña actual.",
        "error"
      );
      return;
    }

    const validationError =
      validatePassword();

    if (
      validationError
    ) {
      showMessage(
        validationError,
        "error"
      );
      return;
    }

    if (
      passwordReauthentication &&
      !passwordNonce.trim()
    ) {
      showMessage(
        "Introduce el código de seguridad enviado a tu correo.",
        "error"
      );
      return;
    }

    setLoading(
      "password"
    );

    const {
      error,
    } =
      await supabase.auth
        .updateUser({
          current_password:
            currentPassword,
          password,
          ...(passwordReauthentication
            ? {
                nonce:
                  passwordNonce.trim(),
              }
            : {}),
        });

    if (
      error
    ) {
      console.error(
        "Password update failed:",
        {
          code:
            error.code,
          status:
            error.status,
        }
      );

      if (
        error.code ===
        "reauthentication_needed"
      ) {
        const {
          error:
            reauthenticationError,
        } =
          await supabase.auth
            .reauthenticate();

        if (
          reauthenticationError
        ) {
          showMessage(
            translatePasswordError(
              reauthenticationError.message,
              reauthenticationError.code
            ),
            "error"
          );

          setLoading(null);
          return;
        }

        setPasswordReauthentication(
          true
        );

        showMessage(
          "Te hemos enviado un código de seguridad por correo. Introdúcelo para confirmar el cambio.",
          "success"
        );

        setLoading(null);
        return;
      }

      showMessage(
        translatePasswordError(
          error.message,
          error.code
        ),
        "error"
      );

      setLoading(
        null
      );

      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setPasswordNonce("");
    setPasswordReauthentication(false);

    /*
     * Un cambio de contraseña puede rotar los tokens de la sesión.
     * Forzamos su renovación antes de volver a renderizar la página
     * para que el Server Component reciba ya las cookies nuevas.
     */
    const {
      error: refreshError,
    } =
      await supabase.auth
        .refreshSession();

    if (
      refreshError
    ) {
      console.error(
        "Session refresh after password update failed:",
        {
          code:
            refreshError.code,
          status:
            refreshError.status,
        }
      );
    }

    showMessage(
      "Contraseña actualizada correctamente.",
      "success"
    );

    setLoading(
      null
    );

    if (!refreshError) {
      router.replace(
        "/account"
      );
      router.refresh();
    }
  }

  async function deleteAccount() {
    if (
      confirmation.trim() !==
      "ELIMINAR"
    ) {
      showMessage(
        'Escribe "ELIMINAR" para confirmar.',
        "error"
      );

      return;
    }

    setLoading(
      "delete"
    );

    setMessage(
      null
    );

    try {
      const response =
        await fetch(
          "/api/account/delete",
          {
            method:
              "DELETE",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        showMessage(
          result.error ??
            "No se ha podido eliminar la cuenta.",
          "error"
        );

        setLoading(
          null
        );

        return;
      }

      await supabase.auth
        .signOut();

      router.push(
        "/"
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        error
      );

      showMessage(
        "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
        "error"
      );

      setLoading(
        null
      );
    }
  }

  const isBusiness =
    role ===
    "business";

  return (
    <section className="settings10">
      <header className="settings10-head">
        <div>
          <span className="settings10-kicker">
            Cuenta y seguridad
          </span>

          <h2>
            Datos de acceso
          </h2>

          <p>
            Cambia tu correo, contraseña o elimina tu cuenta desde aquí.
          </p>
        </div>
      </header>

      {message && (
        <div
          className={`settings10-message is-${message.type}`}
          role="alert"
        >
          {message.type ===
          "success" ? (
            <CheckCircle2
              size={17}
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : (
            <XCircle
              size={17}
              strokeWidth={2}
              aria-hidden="true"
            />
          )}

          <span>
            {message.text}
          </span>
        </div>
      )}

      <div className="settings10-list">
        <div className="settings10-item">
          <button
            type="button"
            className="settings10-row"
            onClick={() =>
              toggleSection(
                "email"
              )
            }
          >
            <span className="settings10-icon">
              <AtSign
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <span className="settings10-copy">
              <strong>
                Correo electrónico
              </strong>

              <small>
                {initialEmail}
              </small>
            </span>

            <span className="settings10-action">
              Cambiar

              <ChevronDown
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className={
                  openSection ===
                  "email"
                    ? "is-open"
                    : undefined
                }
              />
            </span>
          </button>

          {openSection ===
            "email" && (
            <form
              className="settings10-form"
              onSubmit={
                handleEmailSubmit
              }
            >
              <label>
                Nuevo correo electrónico

                <input
                  required
                  type="email"
                  value={
                    newEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setNewEmail(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="nuevo@email.com"
                  autoComplete="email"
                />
              </label>

              <label>
                Repite el nuevo correo

                <input
                  required
                  type="email"
                  value={
                    confirmEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmEmail(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="nuevo@email.com"
                  autoComplete="email"
                />
              </label>

              <p>
                Slottye enviará un correo de confirmación antes de completar el cambio.
              </p>

              <button
                type="submit"
                className="btn primary"
                disabled={
                  loading ===
                  "email"
                }
              >
                {loading ===
                "email"
                  ? "Enviando..."
                  : "Solicitar cambio"}
              </button>
            </form>
          )}
        </div>

        <div className="settings10-item">
          <button
            type="button"
            className="settings10-row"
            onClick={() =>
              toggleSection(
                "password"
              )
            }
          >
            <span className="settings10-icon">
              <KeyRound
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <span className="settings10-copy">
              <strong>
                Contraseña
              </strong>

              <small>
                Actualiza la contraseña de acceso.
              </small>
            </span>

            <span className="settings10-action">
              Cambiar

              <ChevronDown
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className={
                  openSection ===
                  "password"
                    ? "is-open"
                    : undefined
                }
              />
            </span>
          </button>

          {openSection ===
            "password" && (
            <form
              className="settings10-form"
              onSubmit={
                handlePasswordSubmit
              }
            >
              <label>
                Contraseña actual

                <input
                  required
                  type="password"
                  value={
                    currentPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrentPassword(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  placeholder="Contraseña actual"
                />
              </label>

              <label>
                Nueva contraseña

                <input
                  required
                  type="password"
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event
                        .target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Nueva contraseña"
                />
              </label>

              <label>
                Repite la nueva contraseña

                <input
                  required
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event
                        .target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Repite la nueva contraseña"
                />
              </label>

              <p>
                Mínimo 8 caracteres · 1 mayúscula · 1 minúscula · 1 número · 1 símbolo
              </p>

              {passwordReauthentication && (
                <label>
                  Código de seguridad

                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={
                      passwordNonce
                    }
                    onChange={(
                      event
                    ) =>
                      setPasswordNonce(
                        event.target.value
                      )
                    }
                    placeholder="Código recibido por correo"
                  />
                </label>
              )}

              <button
                type="submit"
                className="btn primary"
                disabled={
                  loading ===
                  "password"
                }
              >
                {loading ===
                "password"
                  ? "Guardando..."
                  : "Cambiar contraseña"}
              </button>
            </form>
          )}
        </div>

        <div className="settings10-item is-danger">
          <button
            type="button"
            className="settings10-row"
            onClick={() =>
              toggleSection(
                "delete"
              )
            }
          >
            <span className="settings10-icon is-danger">
              <Trash2
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <span className="settings10-copy">
              <strong>
                Eliminar cuenta
              </strong>

              <small>
                Elimina permanentemente tu cuenta y datos asociados.
              </small>
            </span>

            <span className="settings10-action is-danger">
              Eliminar

              <ChevronDown
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className={
                  openSection ===
                  "delete"
                    ? "is-open"
                    : undefined
                }
              />
            </span>
          </button>

          {openSection ===
            "delete" && (
            <div className="settings10-delete">
              <div className="settings10-danger-note">
                <ShieldAlert
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <div>
                  <strong>
                    Esta acción es permanente
                  </strong>

                  <p>
                    {isBusiness
                      ? "Se eliminarán tu cuenta, negocio, servicios, horarios, disponibilidad, reservas, imágenes, suscriptores, reseñas y datos asociados."
                      : "Se eliminarán tu cuenta, reservas, favoritos, suscripciones, notificaciones, reseñas y datos asociados."}
                  </p>
                </div>
              </div>

              <label>
                Escribe ELIMINAR para confirmar

                <input
                  value={
                    confirmation
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmation(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="ELIMINAR"
                  autoComplete="off"
                />
              </label>

              <button
                type="button"
                className="btn settings10-delete-button"
                disabled={
                  loading ===
                    "delete" ||
                  confirmation.trim() !==
                    "ELIMINAR"
                }
                onClick={
                  deleteAccount
                }
              >
                <Trash2
                  size={15}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                {loading ===
                "delete"
                  ? "Eliminando..."
                  : "Eliminar mi cuenta definitivamente"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings10 {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 14px 34px
            rgba(31,27,48,.025);
        }

        .settings10-head {
          padding: 18px 20px 15px;
          border-bottom: 1px solid #efedf2;
        }

        .settings10-kicker {
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
        }

        .settings10-head h2 {
          margin: 4px 0 4px;
          font-size: 20px;
          letter-spacing: -.025em;
        }

        .settings10-head p {
          margin: 0;
          color: var(--muted);
          font-size: 11.5px;
        }

        .settings10-message {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 14px 16px 0;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 750;
        }

        .settings10-message.is-success {
          border: 1px solid #b8ebc9;
          background: #effaf3;
          color: #176b3a;
        }

        .settings10-message.is-error {
          border: 1px solid #ffc9c9;
          background: #fff2f2;
          color: #a92727;
        }

        .settings10-list {
          display: grid;
        }

        .settings10-item {
          border-bottom: 1px solid #efedf2;
        }

        .settings10-item:last-child {
          border-bottom: 0;
        }

        .settings10-row {
          width: 100%;
          display: grid;
          grid-template-columns:
            auto
            minmax(0,1fr)
            auto;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .settings10-row:hover {
          background: #fbfaff;
        }

        .settings10-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .settings10-icon svg {
          display: block;
          margin: 0;
        }

        .settings10-icon.is-danger {
          background: #fff0f0;
          color: #c62828;
        }

        .settings10-copy strong,
        .settings10-copy small {
          display: block;
        }

        .settings10-copy strong {
          font-size: 12.5px;
        }

        .settings10-copy small {
          margin-top: 3px;
          color: var(--muted);
          font-size: 10.5px;
          line-height: 1.35;
        }

        .settings10-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent-dark);
          font-size: 10.5px;
          font-weight: 800;
        }

        .settings10-action.is-danger {
          color: #b42318;
        }

        .settings10-action svg {
          transition: transform .16s ease;
        }

        .settings10-action svg.is-open {
          transform: rotate(180deg);
        }

        .settings10-form,
        .settings10-delete {
          display: grid;
          gap: 12px;
          padding: 2px 18px 16px 64px;
        }

        .settings10-form label,
.settings10-delete label {
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 800;
}

        .settings10-form input,
        .settings10-delete input {
          width: 100%;
          padding: 11px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          font: inherit;
        }

        .settings10-form p {
            margin: 0;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.5;
          }

        .settings10-form .btn,
        .settings10-delete .btn {
          width: fit-content;
        }

        .settings10-danger-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 12px;
          border: 1px solid #fecaca;
          border-radius: 11px;
          background: #fff7f7;
          color: #a92727;
        }

        .settings10-danger-note svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .settings10-danger-note strong {
          display: block;
          font-size: 11.5px;
        }

        .settings10-danger-note p {
          margin: 3px 0 0;
          font-size: 10.5px;
          line-height: 1.45;
        }

        .settings10-delete-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-color: #dc2626;
          background: #dc2626;
          color: #fff;
        }

        .settings10-delete-button:disabled {
          opacity: .38;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .settings10-row {
            padding: 14px;
          }

          .settings10-action {
            font-size: 0;
          }

          .settings10-action svg {
            width: 17px;
            height: 17px;
          }

          .settings10-form,
          .settings10-delete {
            padding:
              2px
              14px
              16px;
          }
        }
      `}</style>
    </section>
  );
}
