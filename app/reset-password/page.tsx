"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [sessionReady, setSessionReady] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (session) {
        setSessionReady(true);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            event ===
              "PASSWORD_RECOVERY" ||
            session
          ) {
            setSessionReady(true);
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
      !/[^A-Za-z0-9]/.test(password)
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
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const validationError =
      validatePassword();

    if (validationError) {
      setMessage(validationError);
      setIsError(true);
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setMessage(error.message);
      setIsError(true);
      setLoading(false);
      return;
    }

    setMessage(
      "Contraseña actualizada correctamente."
    );

    setLoading(false);

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  }

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
            Nueva contraseña
          </h1>

          {!sessionReady ? (
            <p className="muted">
              Estamos comprobando tu enlace de recuperación.
              Si el enlace ha caducado, solicita uno nuevo
              desde la pantalla de inicio de sesión.
            </p>
          ) : (
            <>
              <p className="muted">
                Elige una nueva contraseña para tu cuenta
                de Slottye.
              </p>

              <div
                className="muted"
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Debe tener al menos 8 caracteres e incluir
                una mayúscula, una minúscula, un número
                y un símbolo.
              </div>

              <form
                className="auth-form"
                onSubmit={handleSubmit}
                style={{
                  marginTop: 22,
                }}
              >
                <label className="auth-field">
                  <span>Nueva contraseña</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  className="auth-input"
                />
                </label>

                <label className="auth-field">
                  <span>Confirmar contraseña</span>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  className="auth-input"
                />
                </label>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={loading}
                  style={{
                    width: "100%",
                  }}
                >
                  {loading
                    ? "Guardando..."
                    : "Cambiar contraseña"}
                </button>
              </form>
            </>
          )}

          {message && (
            <div
              className={`auth-alert ${isError ? "auth-alert-error" : "auth-alert-success"}`}
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
              {isError
                ? "⚠️ "
                : "✓ "}
              {message}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

