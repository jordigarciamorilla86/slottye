"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        }
      );

    if (error) {
      setMessage(error.message);
      setIsError(true);
      setLoading(false);
      return;
    }

    setMessage(
      "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
    );

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
            Recuperar contraseña
          </h1>

          <p className="muted">
            Introduce el correo asociado a tu cuenta
            de Slottye y te enviaremos un enlace para
            crear una nueva contraseña.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 24,
            }}
          >
            <input
              required
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="tu@email.com"
              autoComplete="email"
              style={inputStyle}
            />

            <button
              type="submit"
              className="btn primary"
              disabled={loading}
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Enviando..."
                : "Enviar enlace"}
            </button>
          </form>

          {message && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 12,

                background: isError
                  ? "#fef2f2"
                  : "#f0fdf4",

                color: isError
                  ? "#b91c1c"
                  : "#166534",

                border: isError
                  ? "1px solid #fecaca"
                  : "1px solid #bbf7d0",
              }}
            >
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
              className="btn"
            >
              ← Volver a iniciar sesión
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
  border: "1px solid var(--border)",
  borderRadius: 14,
  marginBottom: 12,
  background: "var(--card)",
  color: "var(--text)",
};