"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

type Mode =
  | "login"
  | "signup";

type Role =
  | "customer"
  | "business";

/*
 * ============================================================
 * TRADUCCIÓN DE ERRORES DE SUPABASE
 * ============================================================
 */

function translateAuthError(
  message: string
) {
  const text =
    message.toLowerCase();

  /*
   * Contraseña que no cumple
   * los requisitos configurados
   * en Supabase.
   */
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

  /*
   * Login incorrecto.
   */
  if (
    text.includes(
      "invalid login credentials"
    )
  ) {
    return "El correo electrónico o la contraseña no son correctos.";
  }

  /*
   * Email todavía sin confirmar.
   */
  if (
    text.includes(
      "email not confirmed"
    )
  ) {
    return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
  }

  /*
   * Usuario ya registrado.
   */
  if (
    text.includes(
      "user already registered"
    ) ||
    text.includes(
      "already registered"
    )
  ) {
    return "Ya existe una cuenta registrada con este correo electrónico.";
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
   * Demasiados emails.
   */
  if (
    text.includes(
      "email rate limit exceeded"
    )
  ) {
    return "Has solicitado demasiados correos. Espera unos minutos e inténtalo de nuevo.";
  }

  /*
   * Demasiados intentos.
   */
  if (
    text.includes(
      "rate limit"
    ) ||
    text.includes(
      "too many requests"
    )
  ) {
    return "Has realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }

  /*
   * Contraseña débil.
   */
  if (
    text.includes(
      "weak password"
    )
  ) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  /*
   * Fallback.
   */
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}

export default function Login() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const initialMode: Mode =
    searchParams.get("mode") ===
    "signup"
      ? "signup"
      : "login";

  const initialRole: Role =
    searchParams.get("role") ===
    "business"
      ? "business"
      : "customer";

  const [mode, setMode] =
    useState<Mode>(
      initialMode
    );

  const [role, setRole] =
    useState<Role>(
      initialRole
    );

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState(
    searchParams.get("error")
      ? "No se pudo completar el acceso. Inténtalo de nuevo."
      : ""
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const supabase =
    createClient();

  /*
   * ============================================================
   * DESTINO SEGÚN ROL
   * ============================================================
   */

  function getDestination(
    selectedRole: Role
  ) {
    return selectedRole ===
      "business"
      ? "/business-dashboard/create"
      : "/account";
  }

  /*
   * ============================================================
   * GOOGLE
   * ============================================================
   */

  async function handleGoogle() {
    setLoading(true);
    setMessage("");

    const destination =
      getDestination(role);

    const redirectTo =
      `${window.location.origin}/auth/callback` +
      `?role=${role}` +
      `&next=${encodeURIComponent(
        destination
      )}`;

    const { error } =
      await supabase.auth
        .signInWithOAuth({
          provider:
            "google",

          options: {
            redirectTo,
          },
        });

    if (error) {
      setMessage(
        translateAuthError(
          error.message
        )
      );

      setLoading(false);
    }
  }

  /*
   * ============================================================
   * EMAIL / PASSWORD
   * ============================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    /*
     * ==========================================================
     * REGISTRO
     * ==========================================================
     */

    if (
      mode === "signup"
    ) {
      const destination =
        getDestination(role);

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email:
            email.trim(),

          password,

          options: {
            data: {
              full_name:
                name.trim(),

              role,
            },

            emailRedirectTo:
              `${window.location.origin}/auth/callback` +
              `?role=${role}` +
              `&next=${encodeURIComponent(
                destination
              )}`,
          },
        });

      if (error) {
        setMessage(
          translateAuthError(
            error.message
          )
        );

        setLoading(false);

        return;
      }

      /*
       * Si Supabase devuelve sesión,
       * no necesitamos esperar
       * confirmación de email.
       */
      if (data.session) {
        router.push(
          destination
        );

        router.refresh();

        return;
      }

      /*
       * Si no hay sesión, Supabase
       * requiere confirmación por email.
       */
      router.push(
        `/check-email?email=${encodeURIComponent(
          email.trim()
        )}&role=${role}`
      );

      return;
    }

    /*
     * ==========================================================
     * LOGIN
     * ==========================================================
     */

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email:
            email.trim(),

          password,
        });

    if (error) {
      setMessage(
        translateAuthError(
          error.message
        )
      );

      setLoading(false);

      return;
    }

    router.push(
      "/account"
    );

    router.refresh();
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
          maxWidth: 600,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Tu cuenta Slottye
          </div>

          <h1 className="business-title">
            {mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
          </h1>

          <p className="muted">
            {mode === "login"
              ? "Gestiona tus citas, favoritos y avisos."
              : "Regístrate como cliente o como negocio."}
          </p>

          {/* ==================================================
              LOGIN / REGISTRO
              ================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
              margin: "18px 0",
            }}
          >
            <button
              type="button"
              className={`btn ${
                mode === "login"
                  ? "primary"
                  : ""
              }`}
              onClick={() => {
                setMode(
                  "login"
                );

                setMessage(
                  ""
                );
              }}
            >
              Entrar
            </button>

            <button
              type="button"
              className={`btn ${
                mode === "signup"
                  ? "primary"
                  : ""
              }`}
              onClick={() => {
                setMode(
                  "signup"
                );

                setMessage(
                  ""
                );
              }}
            >
              Crear cuenta
            </button>
          </div>

          {/* ==================================================
              ROL
              ================================================== */}

          {mode ===
            "signup" && (
            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 8,
                marginBottom:
                  12,
              }}
            >
              <button
                type="button"
                className={`btn ${
                  role ===
                  "customer"
                    ? "primary"
                    : ""
                }`}
                onClick={() =>
                  setRole(
                    "customer"
                  )
                }
              >
                Soy cliente
              </button>

              <button
                type="button"
                className={`btn ${
                  role ===
                  "business"
                    ? "primary"
                    : ""
                }`}
                onClick={() =>
                  setRole(
                    "business"
                  )
                }
              >
                Soy negocio
              </button>
            </div>
          )}

          {/* ==================================================
              GOOGLE
              ================================================== */}

          <button
            type="button"
            className="btn"
            style={{
              width: "100%",
              marginBottom:
                16,
            }}
            onClick={
              handleGoogle
            }
            disabled={
              loading
            }
          >
            {loading
              ? "Procesando…"
              : "Continuar con Google"}
          </button>

          <div
            className="muted"
            style={{
              textAlign:
                "center",
              marginBottom:
                16,
            }}
          >
            o con email
          </div>

          {/* ==================================================
              FORMULARIO
              ================================================== */}

          <form
            onSubmit={
              handleSubmit
            }
          >
            {mode ===
              "signup" && (
              <input
                required
                value={
                  name
                }
                onChange={(e) =>
                  setName(
                    e.target
                      .value
                  )
                }
                placeholder={
                  role ===
                  "business"
                    ? "Nombre del responsable"
                    : "Tu nombre"
                }
                autoComplete="name"
                style={
                  inputStyle
                }
              />
            )}

            <input
              required
              type="email"
              value={
                email
              }
              onChange={(e) =>
                setEmail(
                  e.target
                    .value
                )
              }
              placeholder="tu@email.com"
              autoComplete="email"
              style={
                inputStyle
              }
            />

            {/* ==================================================
                CONTRASEÑA
                ================================================== */}

            <input
              required
              minLength={
                8
              }
              value={
                password
              }
              onChange={(e) =>
                setPassword(
                  e.target
                    .value
                )
              }
              placeholder="Contraseña"
              type="password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              style={{
                ...inputStyle,

                marginBottom:
                  mode ===
                  "signup"
                    ? 5
                    : 10,
              }}
            />

            {/* ==================================================
                REQUISITOS CONTRASEÑA
                ================================================== */}

            {mode ===
              "signup" && (
              <div
                className="muted"
                style={{
                  fontSize:
                    12,

                  lineHeight:
                    1.5,

                  marginBottom:
                    14,

                  paddingLeft:
                    2,
                }}
              >
                Mínimo 8 caracteres ·
                1 mayúscula ·
                1 minúscula ·
                1 número ·
                1 símbolo
              </div>
            )}

            {/* ==================================================
                RECUPERAR CONTRASEÑA
                ================================================== */}

            {mode ===
              "login" && (
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  marginTop:
                    -2,

                  marginBottom:
                    14,
                }}
              >
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize:
                      13,

                    color:
                      "var(--accent)",

                    fontWeight:
                      700,

                    textDecoration:
                      "none",
                  }}
                >
                  ¿Has olvidado tu contraseña?
                </Link>
              </div>
            )}

            {/* ==================================================
                BOTÓN
                ================================================== */}

            <button
              type="submit"
              className="btn primary"
              style={{
                width:
                  "100%",
              }}
              disabled={
                loading
              }
            >
              {loading
                ? "Procesando…"
                : mode ===
                    "login"
                  ? "Entrar con email"
                  : "Crear cuenta"}
            </button>
          </form>

          {/* ==================================================
              ERROR
              ================================================== */}

          {message && (
            <div
              role="alert"
              style={{
                marginTop:
                  14,

                padding:
                  "12px 14px",

                borderRadius:
                  12,

                background:
                  "#fef2f2",

                border:
                  "1px solid #fecaca",

                color:
                  "#b91c1c",

                fontWeight:
                  600,

                fontSize:
                  14,

                lineHeight:
                  1.5,
              }}
            >
              ⚠️ {message}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/*
 * ============================================================
 * ESTILO INPUT
 * ============================================================
 */

const inputStyle = {
  width: "100%",

  padding: 14,

  border:
    "1px solid var(--border)",

  borderRadius: 14,

  marginBottom: 10,

  background:
    "var(--card)",

  color:
    "var(--text)",
};