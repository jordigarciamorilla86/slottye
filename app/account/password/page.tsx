"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

function translatePasswordError(
  message: string
) {
  const text =
    message.toLowerCase();

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
    text.includes(
      "new password should be different from the old password"
    )
  ) {
    return "La nueva contraseña debe ser diferente de la contraseña actual.";
  }

  return "No se ha podido cambiar la contraseña. Inténtalo de nuevo.";
}

export default function ChangePasswordPage() {
  const supabase =
    createClient();

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
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

  function validatePassword() {
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    if (!/[a-z]/.test(password)) {
      return "La contraseña debe incluir una letra minúscula.";
    }

    if (!/[A-Z]/.test(password)) {
      return "La contraseña debe incluir una letra mayúscula.";
    }

    if (!/[0-9]/.test(password)) {
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

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const validationError =
      validatePassword();

    if (validationError) {
      setMessage(
        validationError
      );

      setIsError(true);

      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth
        .updateUser({
          password,
        });

    if (error) {
      setMessage(
        translatePasswordError(
          error.message
        )
      );

      setIsError(true);
      setLoading(false);

      return;
    }

    setPassword("");
    setConfirmPassword("");

    setMessage(
      "Contraseña actualizada correctamente."
    );

    setIsError(false);
    setLoading(false);
  }

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 600,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Seguridad
          </div>

          <h1 className="business-title">
            Cambiar contraseña
          </h1>

          <p className="muted">
            Elige una nueva contraseña
            para tu cuenta de Slottye.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            style={{
              marginTop: 22,
            }}
          >
            <input
              required
              type="password"
              value={
                password
              }
              onChange={(event) =>
                setPassword(
                  event.target
                    .value
                )
              }
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              style={{
                ...inputStyle,
                marginBottom: 5,
              }}
            />

            <div
              className="muted"
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 14,
                paddingLeft: 2,
              }}
            >
              Mínimo 8 caracteres ·
              1 mayúscula ·
              1 minúscula ·
              1 número ·
              1 símbolo
            </div>

            <input
              required
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target
                    .value
                )
              }
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              style={
                inputStyle
              }
            />

            <button
              type="submit"
              className="btn primary"
              disabled={
                loading
              }
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Guardando..."
                : "Cambiar contraseña"}
            </button>
          </form>

          {message && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding:
                  "12px 14px",
                borderRadius: 12,

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

                fontWeight: 600,
                fontSize: 14,
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
              href="/account"
              className="btn"
            >
              ← Volver a mi cuenta
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  border:
    "1px solid var(--border)",
  borderRadius: 14,
  marginBottom: 12,
  background:
    "var(--card)",
  color:
    "var(--text)",
};