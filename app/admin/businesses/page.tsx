import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import AdminBusinessStatusButton from "./AdminBusinessStatusButton";

export default async function AdminBusinessesPage() {
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
   * NEGOCIOS
   * ============================================================
   */

  const {
    data: businesses,
    error,
  } =
    await supabase
      .from("businesses")
      .select(`
        id,
        owner_id,
        category_id,
        name,
        slug,
        description,
        address,
        city,
        postal_code,
        phone,
        email,
        website,
        active,
        created_at,
        updated_at,
        min_booking_notice_hours,
        max_booking_advance_days,
        allow_cancellations,
        min_cancellation_notice_hours,
        google_place_id,
        show_google_reviews,

        profiles (
          id,
          name,
          email
        ),

        categories (
          id,
          name,
          slug
        )
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
      "Error loading admin businesses:",
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
            Negocios
          </h1>

          <p className="muted">
            Consulta los negocios registrados en Slottye.
          </p>

          <div
            style={{
              marginTop:
                24,

              display:
                "grid",

              gap:
                14,
            }}
          >
            {(businesses ?? []).map(
              (
                business
              ) => {
                const owner =
                  Array.isArray(
                    business.profiles
                  )
                    ? business
                        .profiles[0] ??
                      null
                    : business.profiles;

                const category =
                  Array.isArray(
                    business.categories
                  )
                    ? business
                        .categories[0] ??
                      null
                    : business.categories;

                const fullAddress =
                  [
                    business.address,
                    business.postal_code,
                    business.city,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " · "
                    );

                return (
                  <div
                    className="card"
                    key={
                      business.id
                    }
                  >
                    <div className="card-body">
                      {/* ========================================
                          CABECERA
                          ======================================== */}

                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "flex-start",

                          gap:
                            16,

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
                                  20,
                              }}
                            >
                              {
                                business.name
                              }
                            </strong>

                            <span
                              style={{
                                padding:
                                  "4px 9px",

                                borderRadius:
                                  999,

                                fontSize:
                                  12,

                                fontWeight:
                                  800,

                                background:
                                  business.active
                                    ? "#dcfce7"
                                    : "#fee2e2",

                                color:
                                  business.active
                                    ? "#166534"
                                    : "#b91c1c",
                              }}
                            >
                              {business.active
                                ? "ACTIVO"
                                : "INACTIVO"}
                            </span>
                          </div>

                          {category?.name && (
                            <div
                              className="muted"
                              style={{
                                marginTop:
                                  6,
                              }}
                            >
                              {
                                category.name
                              }
                            </div>
                          )}
                        </div>

                        <div
                          className="muted"
                          style={{
                            fontSize:
                              12,

                            wordBreak:
                              "break-all",

                            maxWidth:
                              320,
                          }}
                        >
                          ID:{" "}
                          {
                            business.id
                          }
                        </div>
                      </div>

                      {/* ========================================
                          DATOS
                          ======================================== */}

                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",

                          gap:
                            16,

                          marginTop:
                            20,
                        }}
                      >
                        {/* PROPIETARIO */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize:
                                13,

                              marginBottom:
                                4,
                            }}
                          >
                            Propietario
                          </div>

                          <strong>
                            {owner?.name?.trim() ||
                              "Sin nombre"}
                          </strong>

                          <div
                            className="muted"
                            style={{
                              marginTop:
                                3,

                              fontSize:
                                13,
                            }}
                          >
                            {owner?.email ??
                              "Sin email"}
                          </div>
                        </div>

                        {/* UBICACIÓN */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize:
                                13,

                              marginBottom:
                                4,
                            }}
                          >
                            Ubicación
                          </div>

                          <strong>
                            {fullAddress ||
                              "Sin dirección"}
                          </strong>
                        </div>

                        {/* CONTACTO */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize:
                                13,

                              marginBottom:
                                4,
                            }}
                          >
                            Contacto
                          </div>

                          {business.email ? (
                            <div>
                              ✉{" "}
                              <a
                                href={`mailto:${business.email}`}
                              >
                                {
                                  business.email
                                }
                              </a>
                            </div>
                          ) : (
                            <div className="muted">
                              Sin email
                            </div>
                          )}

                          {business.phone && (
                            <div
                              style={{
                                marginTop:
                                  4,
                              }}
                            >
                              ☎{" "}
                              <a
                                href={`tel:${business.phone}`}
                              >
                                {
                                  business.phone
                                }
                              </a>
                            </div>
                          )}
                        </div>

                        {/* ALTA */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize:
                                13,

                              marginBottom:
                                4,
                            }}
                          >
                            Fecha de alta
                          </div>

                          <strong>
                            {formatDate(
                              business.created_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* ========================================
                          CONFIGURACIÓN DE RESERVAS
                          ======================================== */}

                      <div
                        style={{
                          marginTop:
                            20,

                          paddingTop:
                            18,

                          borderTop:
                            "1px solid var(--border)",
                        }}
                      >
                        <strong>
                          Configuración de reservas
                        </strong>

                        <div
                          className="muted"
                          style={{
                            display:
                              "flex",

                            gap:
                              14,

                            flexWrap:
                              "wrap",

                            marginTop:
                              8,

                            fontSize:
                              13,
                          }}
                        >
                          <span>
                            Aviso mínimo:{" "}
                            <strong>
                              {
                                business.min_booking_notice_hours
                              }
                              h
                            </strong>
                          </span>

                          <span>
                            Antelación máxima:{" "}
                            <strong>
                              {
                                business.max_booking_advance_days
                              }{" "}
                              días
                            </strong>
                          </span>

                          <span>
                            Cancelaciones:{" "}
                            <strong>
                              {business.allow_cancellations
                                ? "Sí"
                                : "No"}
                            </strong>
                          </span>

                          {business.allow_cancellations && (
                            <span>
                              Aviso para cancelar:{" "}
                              <strong>
                                {
                                  business.min_cancellation_notice_hours
                                }
                                h
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ========================================
                          GOOGLE
                          ======================================== */}

                      <div
                        style={{
                          marginTop:
                            16,

                          fontSize:
                            13,
                        }}
                      >
                        <span className="muted">
                          Google Maps:{" "}
                        </span>

                        <strong>
                          {business.google_place_id
                            ? "Vinculado"
                            : "No vinculado"}
                        </strong>

                        {" · "}

                        <span className="muted">
                          Reseñas Google:{" "}
                        </span>

                        <strong>
                          {business.show_google_reviews
                            ? "Visibles"
                            : "Ocultas"}
                        </strong>
                      </div>

                      {/* ========================================
                          ACCIONES
                          ======================================== */}

                      <div
                        style={{
                          display:
                            "flex",

                          gap:
                            10,

                          flexWrap:
                            "wrap",

                          marginTop:
                            20,
                        }}
                      >
                        <Link
                          href={`/business/${business.slug}`}
                          className="btn primary"
                        >
                          Ver ficha pública
                        </Link>

                        {business.website && (
                          <a
                            href={
                              business.website
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="btn"
                          >
                            Web del negocio ↗
                          </a>
                        )}
                        <AdminBusinessStatusButton
  businessId={business.id}
  businessName={business.name}
  active={business.active}
/>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {(businesses ?? [])
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
                No hay negocios registrados.
              </p>
            </div>
          )}
        </section>

        {/* ======================================================
            NAVEGACIÓN
            ====================================================== */}

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