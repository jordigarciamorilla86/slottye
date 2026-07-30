"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

export default function DeleteAccountPage() {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    role,
    setRole,
  ] =
    useState<
      string | null
    >(null);

  const [
    loadingUser,
    setLoadingUser,
  ] =
    useState(true);

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

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

  /*
   * ============================================================
   * CARGAR PERFIL
   * ============================================================
   */

  useEffect(() => {
    async function loadProfile() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push(
          "/login"
        );

        return;
      }

      const {
        data:
          profileData,
      } =
        await supabase
          .from("profiles")
          .select(`
            role
          `)
          .eq(
            "id",
            user.id
          )
          .maybeSingle<Profile>();

      setRole(
        profileData?.role ??
          null
      );

      setLoadingUser(
        false
      );
    }

    loadProfile();
  }, []);

  /*
   * ============================================================
   * ELIMINAR CUENTA
   * ============================================================
   */

  async function deleteAccount() {
    if (
      confirmation.trim() !==
      "ELIMINAR"
    ) {
      setMessage(
        'Escribe "ELIMINAR" para confirmar.'
      );

      return;
    }

    setLoading(
      true
    );

    setMessage("");

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
        setMessage(
          result.error ??
            "No se ha podido eliminar la cuenta."
        );

        setLoading(
          false
        );

        return;
      }

      /*
       * La cuenta Auth ya ha sido eliminada,
       * pero limpiamos cualquier sesión
       * restante del navegador.
       */
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

      setMessage(
        "Ha ocurrido un error inesperado. Inténtalo de nuevo."
      );

      setLoading(
        false
      );
    }
  }

  const isBusiness =
    role ===
    "business";

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
            650,
        }}
      >
        <section className="panel">
          <div
            className="kicker"
            style={{
              background:
                "#fef2f2",

              color:
                "#b91c1c",
            }}
          >
            Zona de peligro
          </div>

          <h1
            className="business-title"
            style={{
              marginTop:
                14,
            }}
          >
            Eliminar cuenta
          </h1>

          {loadingUser ? (
            <p className="muted">
              Cargando información
              de la cuenta...
            </p>
          ) : (
            <>
              <p
                style={{
                  lineHeight:
                    1.7,
                }}
              >
                Esta acción es{" "}
                <strong>
                  permanente
                </strong>{" "}
                y no se puede
                deshacer.
              </p>

              {isBusiness ? (
                <div
                  style={{
                    marginTop:
                      18,

                    padding:
                      "16px 18px",

                    border:
                      "1px solid #fecaca",

                    borderRadius:
                      14,

                    background:
                      "#fef2f2",
                  }}
                >
                  <strong>
                    Se eliminará
                    definitivamente:
                  </strong>

                  <ul
                    style={{
                      marginBottom:
                        0,

                      lineHeight:
                        1.8,
                    }}
                  >
                    <li>
                      Tu cuenta de
                      Slottye
                    </li>

                    <li>
                      Tu negocio
                    </li>

                    <li>
                      Servicios y
                      horarios
                    </li>

                    <li>
                      Citas y
                      disponibilidad
                    </li>

                    <li>
                      Imágenes
                    </li>

                    <li>
                      Reservas
                      asociadas
                    </li>

                    <li>
                      Suscriptores
                    </li>

                    <li>
                      Reseñas y
                      notificaciones
                      relacionadas
                    </li>
                  </ul>
                </div>
              ) : (
                <div
                  style={{
                    marginTop:
                      18,

                    padding:
                      "16px 18px",

                    border:
                      "1px solid #fecaca",

                    borderRadius:
                      14,

                    background:
                      "#fef2f2",
                  }}
                >
                  <strong>
                    Se eliminará
                    definitivamente:
                  </strong>

                  <ul
                    style={{
                      marginBottom:
                        0,

                      lineHeight:
                        1.8,
                    }}
                  >
                    <li>
                      Tu cuenta de
                      Slottye
                    </li>

                    <li>
                      Tus reservas
                    </li>

                    <li>
                      Tus favoritos
                    </li>

                    <li>
                      Tus
                      suscripciones
                    </li>

                    <li>
                      Tus
                      notificaciones
                    </li>

                    <li>
                      Tus reseñas
                      asociadas
                    </li>
                  </ul>
                </div>
              )}

              <div
                style={{
                  marginTop:
                    24,
                }}
              >
                <label>
                  <strong>
                    Escribe
                    {" "}
                    ELIMINAR
                    {" "}
                    para confirmar
                  </strong>

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

                    style={{
                      width:
                        "100%",

                      marginTop:
                        10,

                      padding:
                        14,

                      border:
                        "1px solid var(--border)",

                      borderRadius:
                        14,

                      background:
                        "var(--card)",

                      color:
                        "var(--text)",

                      font:
                        "inherit",
                    }}
                  />
                </label>
              </div>

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
                      "#fef2f2",

                    color:
                      "#b91c1c",

                    border:
                      "1px solid #fecaca",

                    fontWeight:
                      600,

                    fontSize:
                      14,
                  }}
                >
                  ⚠️ {message}
                </div>
              )}

              <div
                style={{
                  display:
                    "flex",

                  flexWrap:
                    "wrap",

                  gap:
                    10,

                  marginTop:
                    24,
                }}
              >
                <button
                  type="button"

                  className="btn"

                  disabled={
                    loading ||
                    confirmation.trim() !==
                      "ELIMINAR"
                  }

                  onClick={
                    deleteAccount
                  }

                  style={{
                    background:
                      confirmation.trim() ===
                      "ELIMINAR"
                        ? "#dc2626"
                        : undefined,

                    borderColor:
                      confirmation.trim() ===
                      "ELIMINAR"
                        ? "#dc2626"
                        : undefined,

                    color:
                      confirmation.trim() ===
                      "ELIMINAR"
                        ? "#ffffff"
                        : undefined,
                  }}
                >
                  {loading
                    ? "Eliminando..."
                    : "Eliminar mi cuenta definitivamente"}
                </button>

                <Link
                  href="/account"
                  className="btn"
                >
                  Cancelar
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}