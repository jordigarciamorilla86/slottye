"use client";

import {
  FormEvent,
  useState,
} from "react";

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
        error.message
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
          error.message
        );

        setLoading(false);

        return;
      }

      /*
       * Si Supabase devuelve una sesión,
       * significa que no necesitamos esperar
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
       * Si NO hay sesión, normalmente significa
       * que Supabase requiere confirmación
       * mediante email.
       *
       * En vez de dejar al usuario en el formulario,
       * lo enviamos a una pantalla específica.
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
        error.message
      );

      setLoading(false);

      return;
    }

    /*
     * Al iniciar sesión dejamos que /account
     * gestione la entrada normal.
     */
    router.push(
      "/account"
    );

    router.refresh();
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

          {/* LOGIN / REGISTRO */}

          <div
            style={{
              display: "grid",

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

          {/* ROL */}

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

          {/* GOOGLE */}

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

          {/* EMAIL */}

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

              style={
                inputStyle
              }
            />

            <input
              required

              minLength={
                6
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

              style={
                inputStyle
              }
            />

            <button
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