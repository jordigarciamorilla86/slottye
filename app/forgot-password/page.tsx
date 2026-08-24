"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

/*
 * ============================================================
 * TRADUCIR ERRORES DE SUPABASE
 * ============================================================
 */

function translateResetError(
  message: string
) {
  const text =
    message.toLowerCase();

  /*
   * Espera de seguridad entre solicitudes.
   */
  if (
    text.includes(
      "for security purposes"
    ) &&
    text.includes(
      "you can only request this after"
    )
  ) {
    /*
     * Intentamos recuperar los segundos
     * del propio mensaje de Supabase.
     */
    const match =
      message.match(
        /after\s+(\d+)\s+seconds?/i
      );

    const seconds =
      match?.[1];

    return seconds
      ? `Por seguridad, espera ${seconds} segundos antes de solicitar otro enlace.`
      : "Por seguridad, espera unos segundos antes de solicitar otro enlace.";
  }

  /*
   * Rate limit.
   */
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

  /*
   * Email inválido.
   */
  if (
    text.includes(
      "invalid email"
    )
  ) {
    return "Introduce una dirección de correo electrónico válida.";
  }

  /*
   * Fallback.
   */
  return "No se ha podido enviar el enlace. Inténtalo de nuevo.";
}

export default function ForgotPasswordPage() {
  const supabase =
    createClient();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isError,
    setIsError,
  ] = useState(false);

  /*
   * ============================================================
   * ENVIAR EMAIL DE RECUPERACIÓN
   * ============================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);

    const redirectTo =
      `${window.location.origin}/reset-password`;

    const { error } =
      await supabase.auth
        .resetPasswordForEmail(
          email.trim(),
          {
            redirectTo,
          }
        );

    if (error) {
      setMessage(
        translateResetError(
          error.message
        )
      );

      setIsError(true);
      setLoading(false);

      return;
    }

    /*
     * No indicamos si el correo existe
     * o no para no revelar cuentas
     * registradas.
     */
    setMessage(
      "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
    );

    setIsError(false);
    setLoading(false);
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
        className="auth-page"
        style={{
          maxWidth: 600,
        }}
      >
        <section className="auth-card">
          <div className="kicker">
            Seguridad
          </div>

          <h1 className="business-title">
            Recuperar contraseña
          </h1>

          <p className="muted">
            Introduce el correo asociado
            a tu cuenta de Slottye y te
            enviaremos un enlace para
            crear una nueva contraseña.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            style={{
              marginTop: 24,
            }}
          >
            <label className="auth-field">
              <span>Correo electrónico</span>
            <input
              required
              type="email"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
              placeholder="tu@email.com"
              autoComplete="email"
              className="auth-input"
            />
            </label>

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
                : "Enviar enlace"}
            </button>
          </form>

          {/* ==================================================
              MENSAJE
              ================================================== */}

          {message && (
            <div
              className={`auth-alert ${isError ? "auth-alert-error" : "auth-alert-success"}`}
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

          <div
            style={{
              marginTop: 22,
            }}
          >
            <Link
              href="/login"
              className="btn auth-secondary-action"
            >
              ← Volver a iniciar sesión
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

/*
 * ============================================================
 * INPUT
 * ============================================================
 */

