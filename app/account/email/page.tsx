"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

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

export default function ChangeEmailPage() {
  const supabase =
    createClient();

  const [
    currentEmail,
    setCurrentEmail,
  ] =
    useState("");

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
    loadingUser,
    setLoadingUser,
  ] =
    useState(true);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    isError,
    setIsError,
  ] =
    useState(false);

  /*
   * ============================================================
   * CARGAR USUARIO
   * ============================================================
   */

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
        error,
      } =
        await supabase.auth.getUser();

      if (
        error ||
        !user
      ) {
        setMessage(
          "No se ha podido cargar tu cuenta. Vuelve a iniciar sesión."
        );

        setIsError(
          true
        );

        setLoadingUser(
          false
        );

        return;
      }

      setCurrentEmail(
        user.email ?? ""
      );

      setLoadingUser(
        false
      );
    }

    loadUser();
  }, []);

  /*
   * ============================================================
   * CAMBIAR EMAIL
   * ============================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const normalizedEmail =
      newEmail
        .trim()
        .toLowerCase();

    const normalizedConfirmEmail =
      confirmEmail
        .trim()
        .toLowerCase();

    const normalizedCurrentEmail =
      currentEmail
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail
    ) {
      setMessage(
        "Introduce tu nuevo correo electrónico."
      );

      setIsError(
        true
      );

      return;
    }

    if (
      normalizedEmail !==
      normalizedConfirmEmail
    ) {
      setMessage(
        "Los correos electrónicos no coinciden."
      );

      setIsError(
        true
      );

      return;
    }

    if (
      normalizedEmail ===
      normalizedCurrentEmail
    ) {
      setMessage(
        "El nuevo correo debe ser diferente del correo actual."
      );

      setIsError(
        true
      );

      return;
    }

    setLoading(
      true
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

    if (error) {
      setMessage(
        translateEmailError(
          error.message
        )
      );

      setIsError(
        true
      );

      setLoading(
        false
      );

      return;
    }

    /*
     * Con Secure email change activado,
     * el cambio todavía no es definitivo.
     */
    setNewEmail("");
    setConfirmEmail("");

    setMessage(
      "Solicitud enviada. Revisa tu correo y sigue las instrucciones para confirmar el cambio de dirección."
    );

    setIsError(
      false
    );

    setLoading(
      false
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            600,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Tu cuenta
          </div>

          <h1 className="business-title">
            Cambiar correo electrónico
          </h1>

          <p className="muted">
            Puedes cambiar el correo
            asociado a tu cuenta de
            Slottye. El cambio deberá
            confirmarse por email antes
            de hacerse efectivo.
          </p>

          {loadingUser ? (
            <p
              className="muted"
              style={{
                marginTop:
                  22,
              }}
            >
              Cargando cuenta...
            </p>
          ) : (
            <>
              {/* ==============================================
                  EMAIL ACTUAL
                  ============================================== */}

              <div
                style={{
                  marginTop:
                    24,

                  marginBottom:
                    20,

                  padding:
                    "14px 16px",

                  border:
                    "1px solid var(--border)",

                  borderRadius:
                    14,

                  background:
                    "var(--bg)",
                }}
              >
                <div
                  className="muted"
                  style={{
                    fontSize:
                      12,

                    marginBottom:
                      4,
                  }}
                >
                  Correo actual
                </div>

                <strong
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {currentEmail}
                </strong>
              </div>

              {/* ==============================================
                  FORMULARIO
                  ============================================== */}

              <form
                onSubmit={
                  handleSubmit
                }
              >
                <label
                  style={{
                    display:
                      "block",
                  }}
                >
                  <strong>
                    Nuevo correo electrónico
                  </strong>

                  <input
                    required
                    type="email"
                    value={
                      newEmail
                    }
                    onChange={(event) =>
                      setNewEmail(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="nuevo@email.com"
                    autoComplete="email"
                    style={{
                      ...inputStyle,
                      marginTop:
                        8,
                    }}
                  />
                </label>

                <label
                  style={{
                    display:
                      "block",
                  }}
                >
                  <strong>
                    Repite el nuevo correo
                  </strong>

                  <input
                    required
                    type="email"
                    value={
                      confirmEmail
                    }
                    onChange={(event) =>
                      setConfirmEmail(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="nuevo@email.com"
                    autoComplete="email"
                    style={{
                      ...inputStyle,
                      marginTop:
                        8,
                    }}
                  />
                </label>

                <div
                  className="muted"
                  style={{
                    fontSize:
                      12,

                    lineHeight:
                      1.55,

                    marginBottom:
                      16,
                  }}
                >
                  Por seguridad, Slottye
                  enviará un correo de
                  confirmación antes de
                  completar el cambio.
                </div>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    loading
                  }
                  style={{
                    width:
                      "100%",
                  }}
                >
                  {loading
                    ? "Enviando..."
                    : "Cambiar correo electrónico"}
                </button>
              </form>

              {/* ==============================================
                  MENSAJE
                  ============================================== */}

              {message && (
                <div
                  role="alert"
                  style={{
                    marginTop:
                      16,

                    padding:
                      "12px 14px",

                    borderRadius:
                      12,

                    background:
                      isError
                        ? "#fef2f2"
                        : "#f0fdf4",

                    color:
                      isError
                        ? "#b91c1c"
                        : "#166534",

                    border:
                      isError
                        ? "1px solid #fecaca"
                        : "1px solid #bbf7d0",

                    fontWeight:
                      600,

                    fontSize:
                      14,

                    lineHeight:
                      1.5,
                  }}
                >
                  {isError
                    ? "⚠️ "
                    : "✓ "}

                  {message}
                </div>
              )}

              {/* ==============================================
                  VOLVER
                  ============================================== */}

              <div
                style={{
                  marginTop:
                    22,
                }}
              >
                <Link
                  href="/account"
                  className="btn"
                >
                  ← Volver a mi cuenta
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
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

  marginBottom:
    14,

  background:
    "var(--card)",

  color:
    "var(--text)",
};