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
      "invalid login credentials"
    )
  ) {
    return "El correo electrónico o la contraseña no son correctos.";
  }

  if (
    text.includes(
      "email not confirmed"
    )
  ) {
    return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
  }

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

  if (
    text.includes(
      "invalid email"
    )
  ) {
    return "Introduce una dirección de correo electrónico válida.";
  }

  if (
    text.includes(
      "email rate limit exceeded"
    )
  ) {
    return "Has solicitado demasiados correos. Espera unos minutos e inténtalo de nuevo.";
  }

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

  if (
    text.includes(
      "weak password"
    )
  ) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}

/*
 * ============================================================
 * ICONO GOOGLE
 * ============================================================
 */

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.39a4.61 4.61 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.97-4.33 2.97-7.38Z"
      />

      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.89 6.63-2.39l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"
      />

      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.48H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.52l3.35-2.59Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 2.95 14.7 2 12 2a10 10 0 0 0-8.96 5.48l3.35 2.59C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}

/*
 * ============================================================
 * ICONO OJO
 * ============================================================
 */

function EyeIcon({
  visible,
}: {
  visible: boolean;
}) {
  if (visible) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M10.6 10.7A2 2 0 0 0 13.3 13.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 8a9.5 9.5 0 0 1-2.2 3.7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M6.6 6.6C4.4 8 3 10.2 3 12c0 3 3.5 8 9 8 1.5 0 2.8-.4 4-.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
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

  const [
    mode,
    setMode,
  ] =
    useState<Mode>(
      initialMode
    );

  const [
    role,
    setRole,
  ] =
    useState<Role>(
      initialRole
    );

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      searchParams.get("error")
        ? "No se pudo completar el acceso. Inténtalo de nuevo."
        : ""
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

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
   * CAMBIO DE MODO
   * ============================================================
   */

  function changeMode(
    nextMode: Mode
  ) {
    setMode(
      nextMode
    );

    setMessage(
      ""
    );

    setShowPassword(
      false
    );

    if (
      nextMode ===
      "login"
    ) {
      setAcceptedTerms(
        false
      );
    }
  }

  /*
   * ============================================================
   * GOOGLE
   * ============================================================
   */

  async function handleGoogle() {
    /*
     * Si estamos creando cuenta,
     * exigimos aceptar condiciones
     * también para Google.
     */
    if (
      mode === "signup" &&
      !acceptedTerms
    ) {
      setMessage(
        "Debes aceptar las Condiciones de uso y confirmar que has leído la Política de privacidad."
      );

      return;
    }

    setLoading(
      true
    );

    setMessage(
      ""
    );

    const destination =
      getDestination(
        role
      );

    const redirectTo =
      `${window.location.origin}/auth/callback` +
      `?role=${role}` +
      `&next=${encodeURIComponent(
        destination
      )}`;

    const {
      error,
    } =
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

      setLoading(
        false
      );
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

    /*
     * ==========================================================
     * CONDICIONES
     * ==========================================================
     */

    if (
      mode === "signup" &&
      !acceptedTerms
    ) {
      setMessage(
        "Debes aceptar las Condiciones de uso y confirmar que has leído la Política de privacidad."
      );

      return;
    }

    setLoading(
      true
    );

    setMessage(
      ""
    );

    /*
     * ==========================================================
     * REGISTRO
     * ==========================================================
     */

    if (
      mode === "signup"
    ) {
      const destination =
        getDestination(
          role
        );

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

        setLoading(
          false
        );

        return;
      }

      /*
       * Cuando la protección contra enumeración de usuarios
       * está activa, Supabase puede devolver un usuario simulado
       * para un correo que ya existe.
       *
       * En ese caso no hay identidades nuevas asociadas.
       */
      if (
        data.user &&
        Array.isArray(
          data.user.identities
        ) &&
        data.user.identities.length ===
          0
      ) {
        setMessage(
          "Ya existe una cuenta con este correo electrónico. Inicia sesión o recupera tu contraseña."
        );

        setLoading(
          false
        );

        return;
      }

      /*
       * Si Supabase devuelve sesión,
       * no necesitamos confirmación.
       */
      if (
        data.session
      ) {
        router.push(
          destination
        );

        router.refresh();

        return;
      }

      /*
       * Si no devuelve sesión,
       * esperamos confirmación por email.
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

    const {
      data,
      error,
    } =
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

      setLoading(
        false
      );

      return;
    }

    /*
     * ==========================================================
     * COMPROBAR SI LA CUENTA ESTÁ BLOQUEADA
     * ==========================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(`
          role,
          is_blocked
        `)
        .eq(
          "id",
          data.user.id
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Error loading profile:",
        profileError
      );

      await supabase.auth
        .signOut();

      setMessage(
        "No se ha podido verificar el estado de tu cuenta."
      );

      setLoading(
        false
      );

      return;
    }

    if (
      profile?.is_blocked
    ) {
      await supabase.auth
        .signOut();

      setMessage(
        "Tu cuenta está bloqueada temporalmente. Si crees que se trata de un error, ponte en contacto con el equipo de Slottye. contacto@slottye.com"
      );

      setLoading(
        false
      );

      return;
    }

    /*
     * ==========================================================
     * REDIRECCIÓN SEGÚN EL ROL
     * ==========================================================
     */

    router.push(
      profile?.role ===
        "business"
        ? "/business-dashboard"
        : "/account"
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
          maxWidth:
            600,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Tu cuenta Slottye
          </div>

          <h1 className="business-title">
            {mode ===
            "login"
              ? "Entrar"
              : "Crear cuenta"}
          </h1>

          <p className="muted">
            {mode ===
            "login"
              ? "Gestiona tus citas, favoritos y avisos."
              : "Regístrate como cliente o como negocio."}
          </p>

          {/* ==================================================
              LOGIN / REGISTRO
              ================================================== */}

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 1fr",

              gap: 8,

              margin:
                "18px 0",
            }}
          >
            <button
              type="button"
              className={`btn ${
                mode ===
                "login"
                  ? "primary"
                  : ""
              }`}
              onClick={() =>
                changeMode(
                  "login"
                )
              }
            >
              Entrar
            </button>

            <button
              type="button"
              className={`btn ${
                mode ===
                "signup"
                  ? "primary"
                  : ""
              }`}
              onClick={() =>
                changeMode(
                  "signup"
                )
              }
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
              width:
                "100%",

              marginBottom:
                16,

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              gap: 10,

              background:
                "#ffffff",

              color:
                "#1f2937",
            }}
            onClick={
              handleGoogle
            }
            disabled={
              loading ||
              (
                mode ===
                  "signup" &&
                !acceptedTerms
              )
            }
          >
            {!loading && (
              <GoogleIcon />
            )}

            <span>
              {loading
                ? "Procesando…"
                : "Continuar con Google"}
            </span>
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
                onChange={(
                  e
                ) =>
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
              onChange={(
                e
              ) =>
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
                CONTRASEÑA + OJO
                ================================================== */}

            <div
              style={{
                position:
                  "relative",

                marginBottom:
                  mode ===
                  "signup"
                    ? 5
                    : 10,
              }}
            >
              <input
                required
                minLength={
                  8
                }
                value={
                  password
                }
                onChange={(
                  e
                ) =>
                  setPassword(
                    e.target
                      .value
                  )
                }
                placeholder="Contraseña"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete={
                  mode ===
                  "login"
                    ? "current-password"
                    : "new-password"
                }
                style={{
                  ...inputStyle,

                  marginBottom:
                    0,

                  paddingRight:
                    52,
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                title={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                style={{
                  position:
                    "absolute",

                  right:
                    8,

                  top:
                    "50%",

                  transform:
                    "translateY(-50%)",

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
                    "none",

                  borderRadius:
                    10,

                  background:
                    "transparent",

                  color:
                    "var(--muted)",

                  cursor:
                    "pointer",

                  padding:
                    0,
                }}
              >
                <EyeIcon
                  visible={
                    showPassword
                  }
                />
              </button>
            </div>

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
                CONDICIONES + PRIVACIDAD
                ================================================== */}

            {mode ===
              "signup" && (
              <label
                style={{
                  display:
                    "flex",

                  alignItems:
                    "flex-start",

                  gap: 10,

                  marginBottom:
                    16,

                  cursor:
                    "pointer",

                  fontSize:
                    13,

                  lineHeight:
                    1.5,

                  color:
                    "var(--muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    acceptedTerms
                  }
                  onChange={(
                    e
                  ) =>
                    setAcceptedTerms(
                      e.target
                        .checked
                    )
                  }
                  required
                  style={{
                    width:
                      17,

                    height:
                      17,

                    marginTop:
                      2,

                    flexShrink:
                      0,

                    cursor:
                      "pointer",

                    accentColor:
                      "var(--accent)",
                  }}
                />

                <span>
                  He leído y
                  acepto las{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(
                      event
                    ) =>
                      event.stopPropagation()
                    }
                    style={{
                      color:
                        "var(--accent)",

                      fontWeight:
                        700,

                      textDecoration:
                        "none",
                    }}
                  >
                    Condiciones
                    de uso
                  </Link>{" "}
                  y confirmo
                  haber leído
                  la{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(
                      event
                    ) =>
                      event.stopPropagation()
                    }
                    style={{
                      color:
                        "var(--accent)",

                      fontWeight:
                        700,

                      textDecoration:
                        "none",
                    }}
                  >
                    Política de
                    privacidad
                  </Link>
                  .
                </span>
              </label>
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
                BOTÓN EMAIL
                ================================================== */}

            <button
              type="submit"
              className="btn primary"
              style={{
                width:
                  "100%",
              }}
              disabled={
                loading ||
                (
                  mode ===
                    "signup" &&
                  !acceptedTerms
                )
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
  width:
    "100%",

  padding:
    14,

  border:
    "1px solid var(--border)",

  borderRadius:
    14,

  marginBottom:
    10,

  background:
    "var(--card)",

  color:
    "var(--text)",
};