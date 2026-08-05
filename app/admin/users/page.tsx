import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import AdminUserBlockButton from "./AdminUserBlockButton";
import AdminUserDeleteButton from "./AdminUserDeleteButton";

export default async function AdminUsersPage() {
  const supabase =
    await createClient();

  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * COMPROBAR ADMIN
   * ============================================================
   */

  const {
    data: adminProfile,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        name,
        email,
        is_admin
      `)
      .eq(
        "id",
        user.id
      )
      .single();

  if (
    !adminProfile?.is_admin
  ) {
    redirect("/");
  }

  /*
   * ============================================================
   * USUARIOS
   * ============================================================
   */

  const {
    data: users,
    error,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        name,
        email,
        avatar_url,
        role,
        created_at,
        updated_at,
        is_admin,
        is_blocked
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (error) {
    console.error(
      "Error loading admin users:",
      error
    );
  }

  /*
   * ============================================================
   * FORMATO FECHA
   * ============================================================
   */

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
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
            1100,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Admin
          </div>

          <h1 className="business-title">
            Usuarios
          </h1>

          <p className="muted">
            Consulta y gestiona las cuentas registradas en Slottye.
          </p>

          <div
            style={{
              marginTop:
                24,

              display:
                "grid",

              gap:
                12,
            }}
          >
            {(users ?? []).map(
              (
                profile
              ) => (
                <div
                  key={
                    profile.id
                  }
                  className="card"
                >
                  <div className="card-body">
                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          16,

                        alignItems:
                          "flex-start",

                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              10,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                18,
                            }}
                          >
                            {profile.name?.trim() ||
                              "Sin nombre"}
                          </strong>

                          {profile.is_admin && (
                            <span
                              style={{
                                padding:
                                  "4px 8px",

                                borderRadius:
                                  999,

                                background:
                                  "#ede9fe",

                                color:
                                  "#6d28d9",

                                fontSize:
                                  12,

                                fontWeight:
                                  800,
                              }}
                            >
                              ADMIN
                            </span>
                          )}

                          {profile.is_blocked && (
                            <span
                              style={{
                                padding:
                                  "4px 8px",

                                borderRadius:
                                  999,

                                background:
                                  "#fee2e2",

                                color:
                                  "#b91c1c",

                                fontSize:
                                  12,

                                fontWeight:
                                  800,
                              }}
                            >
                              BLOQUEADO
                            </span>
                          )}
                        </div>

                        <div
                          className="muted"
                          style={{
                            marginTop:
                              6,
                          }}
                        >
                          {profile.email ??
                            "Sin email"}
                        </div>

                        <div
                          style={{
                            marginTop:
                              10,

                            display:
                              "flex",

                            gap:
                              10,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span
                            className="muted"
                            style={{
                              fontSize:
                                13,
                            }}
                          >
                            Tipo:{" "}
                            <strong>
                              {profile.role ===
                              "business"
                                ? "Negocio"
                                : "Cliente"}
                            </strong>
                          </span>

                          <span
                            className="muted"
                            style={{
                              fontSize:
                                13,
                            }}
                          >
                            Alta:{" "}
                            <strong>
                              {formatDate(
                                profile.created_at
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div
                        className="muted"
                        style={{
                          fontSize:
                            12,

                          maxWidth:
                            280,

                          wordBreak:
                            "break-all",
                        }}
                      >
                        ID:{" "}
                        {profile.id}
                      </div>
                    </div>

                    {/* ==========================================
                        ACCIONES
                        ========================================== */}

                    <div
                      style={{
                        marginTop:
                          18,

                        display:
                          "flex",

                        gap:
                          10,

                        flexWrap:
                          "wrap",
                      }}
                    >
                      <AdminUserBlockButton
                        userId={
                          profile.id
                        }
                        userName={
                          profile.name?.trim() ||
                          profile.email ||
                          "Usuario"
                        }
                        blocked={
                          profile.is_blocked
                        }
                        isAdmin={
                          profile.is_admin
                        }
                      />
                      <AdminUserDeleteButton
  userId={
    profile.id
  }
  userName={
    profile.name?.trim() ||
    profile.email ||
    "Usuario"
  }
  isAdmin={
    profile.is_admin
  }
/>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {(users ?? [])
            .length ===
            0 && (
            <div
              className="panel"
              style={{
                marginTop:
                  20,
              }}
            >
              <p className="muted">
                No hay usuarios registrados.
              </p>
            </div>
          )}
        </section>

        <section
          style={{
            marginTop:
              20,

            display:
              "flex",

            gap:
              10,

            flexWrap:
              "wrap",
          }}
        >
          <Link
            href="/admin"
            className="btn"
          >
            ← Volver al panel
          </Link>

          <Link
            href="/"
            className="btn"
          >
            Volver a Slottye
          </Link>
        </section>
      </main>
    </>
  );
}