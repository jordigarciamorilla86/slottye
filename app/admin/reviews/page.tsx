import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { AdminContent, AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { ServerPagination } from "@/components/ServerPagination";
import { createClient } from "@/lib/supabase/server";
import collectionStyles from "../AdminCollections.module.css";
import AdminReviewVisibilityButton from "./AdminReviewVisibilityButton";

const PAGE_SIZE = 25;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const supabase = await createClient();

  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * COMPROBAR ADMIN
   * ============================================================
   */

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select(`
      id,
      name,
      email,
      is_admin
    `)
    .eq("id", user.id)
    .single();

  if (!adminProfile?.is_admin) {
    redirect("/");
  }

  /*
   * ============================================================
   * RESEÑAS
   * ============================================================
   */

  const {
    data: reviews,
    error,
    count,
  } = await supabase
    .from("reviews")
    .select(`
      id,
      booking_id,
      user_id,
      business_id,
      rating,
      comment,
      visible,
      created_at,
      updated_at,

      profiles (
        id,
        name,
        email
      ),

      businesses (
        id,
        name,
        slug,
        city
      ),

      bookings (
        id,
        status,
        slots (
          start_at
        ),
        services (
          name
        )
      )
    `, { count: "exact" })
    .order("created_at", {
      ascending: false,
    })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  if (error) {
    console.error(
      "Error loading admin reviews:",
      error
    );
  }

  /*
   * ============================================================
   * FORMATO FECHA
   * ============================================================
   */

  function formatDateTime(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Madrid",
      }
    ).format(new Date(value));
  }

  /*
   * ============================================================
   * ESTRELLAS
   * ============================================================
   */

  function renderStars(
    rating: number
  ) {
    return Array.from({
      length: 5,
    }).map((_, index) => (
      <span
        key={index}
        style={{
          color:
            index < rating
              ? "#f59e0b"
              : "#d1d5db",

          fontSize: 20,
          letterSpacing: 2,
        }}
      >
        ★
      </span>
    ));
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      <Header />

      <AdminShell maxWidth={1180}>
        <AdminPageHeader title="Reseñas" description="Consulta y modera todas las opiniones verificadas publicadas en Slottye." />
        <AdminContent>
        <section className={`panel ${collectionStyles.panel}`}>

          <div
            className={collectionStyles.grid}
            style={{
              marginTop: 24,
              display: "grid",
              gap: 14,
            }}
          >
            {(reviews ?? []).map(
              (review) => {
                /*
                 * ================================================
                 * NORMALIZAR RELACIONES
                 * ================================================
                 */

                const profile =
                  Array.isArray(
                    review.profiles
                  )
                    ? review.profiles[0] ??
                      null
                    : review.profiles;

                const business =
                  Array.isArray(
                    review.businesses
                  )
                    ? review.businesses[0] ??
                      null
                    : review.businesses;

                const booking =
                  Array.isArray(
                    review.bookings
                  )
                    ? review.bookings[0] ??
                      null
                    : review.bookings;

                const slot =
                  booking
                    ? Array.isArray(
                        booking.slots
                      )
                      ? booking.slots[0] ??
                        null
                      : booking.slots
                    : null;

                const service =
                  booking
                    ? Array.isArray(
                        booking.services
                      )
                      ? booking.services[0] ??
                        null
                      : booking.services
                    : null;

                return (
                  <div
                    className="card"
                    key={review.id}
                  >
                    <div className="card-body">
                      {/* ========================================
                          CABECERA
                          ======================================== */}

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 16,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 10,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 20,
                              }}
                            >
                              {business?.name ??
                                "Negocio"}
                            </strong>

                            {/* ESTADO DE VISIBILIDAD */}

                            <span
                              style={{
                                padding:
                                  "4px 9px",
                                borderRadius:
                                  999,
                                fontSize: 12,
                                fontWeight: 800,

                                background:
                                  review.visible
                                    ? "#dcfce7"
                                    : "#fee2e2",

                                color:
                                  review.visible
                                    ? "#166534"
                                    : "#b91c1c",
                              }}
                            >
                              {review.visible
                                ? "VISIBLE"
                                : "OCULTA"}
                            </span>
                          </div>

                          {business?.city && (
                            <div
                              className="muted"
                              style={{
                                marginTop: 4,
                              }}
                            >
                              {business.city}
                            </div>
                          )}
                        </div>

                        <div
                          className="muted"
                          style={{
                            fontSize: 12,
                            wordBreak:
                              "break-all",
                            maxWidth: 320,
                          }}
                        >
                          ID: {review.id}
                        </div>
                      </div>

                      {/* ========================================
                          VALORACIÓN
                          ======================================== */}

                      <div
                        style={{
                          marginTop: 16,
                        }}
                      >
                        <div>
                          {renderStars(
                            review.rating
                          )}
                        </div>

                        <strong
                          style={{
                            display:
                              "inline-block",
                            marginTop: 4,
                          }}
                        >
                          {review.rating} de 5
                        </strong>
                      </div>

                      {/* ========================================
                          COMENTARIO
                          ======================================== */}

                      <div
                        style={{
                          marginTop: 18,
                          padding: 16,
                          borderRadius: 14,
                          background:
                            "var(--bg)",
                        }}
                      >
                        {review.comment?.trim() ? (
                          <p
                            style={{
                              margin: 0,
                              lineHeight: 1.65,
                            }}
                          >
                            {review.comment}
                          </p>
                        ) : (
                          <p
                            className="muted"
                            style={{
                              margin: 0,
                            }}
                          >
                            El usuario no escribió ningún comentario.
                          </p>
                        )}
                      </div>

                      {/* ========================================
                          USUARIO + RESERVA
                          ======================================== */}

                      <div
                        style={{
                          display: "grid",

                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",

                          gap: 18,
                          marginTop: 20,
                        }}
                      >
                        {/* USUARIO */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize: 13,
                              marginBottom: 4,
                            }}
                          >
                            Usuario
                          </div>

                          <strong>
                            {profile?.name?.trim() ||
                              "Sin nombre"}
                          </strong>

                          <div
                            className="muted"
                            style={{
                              marginTop: 3,
                              fontSize: 13,
                            }}
                          >
                            {profile?.email ??
                              "Sin email"}
                          </div>
                        </div>

                        {/* SERVICIO */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize: 13,
                              marginBottom: 4,
                            }}
                          >
                            Servicio
                          </div>

                          <strong>
                            {service?.name ??
                              "Sin servicio"}
                          </strong>
                        </div>

                        {/* FECHA CITA */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize: 13,
                              marginBottom: 4,
                            }}
                          >
                            Fecha de la cita
                          </div>

                          <strong>
                            {formatDateTime(
                              slot?.start_at ??
                                null
                            )}
                          </strong>
                        </div>

                        {/* PUBLICACIÓN */}

                        <div>
                          <div
                            className="muted"
                            style={{
                              fontSize: 13,
                              marginBottom: 4,
                            }}
                          >
                            Publicada
                          </div>

                          <strong>
                            {formatDateTime(
                              review.created_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* ========================================
                          ACTUALIZACIÓN
                          ======================================== */}

                      {review.updated_at !==
                        review.created_at && (
                        <div
                          className="muted"
                          style={{
                            marginTop: 16,
                            fontSize: 13,
                          }}
                        >
                          Última modificación:{" "}
                          <strong>
                            {formatDateTime(
                              review.updated_at
                            )}
                          </strong>
                        </div>
                      )}

                      {/* ========================================
                          ACCIONES
                          ======================================== */}

                      <div
                        style={{
                          marginTop: 20,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {business?.slug && (
                          <Link
                            href={`/business/${business.slug}`}
                            className="btn primary"
                          >
                            Ver negocio
                          </Link>
                        )}

                        <AdminReviewVisibilityButton
                          reviewId={
                            review.id
                          }
                          visible={
                            review.visible
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* ====================================================
              SIN RESEÑAS
              ==================================================== */}

          {(reviews ?? []).length ===
            0 && (
            <div
              className="panel"
              style={{
                marginTop: 20,
              }}
            >
              <p className="muted">
                Todavía no hay reseñas publicadas.
              </p>
            </div>
          )}

          <ServerPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pathname="/admin/reviews"
          />
        </section>

        {/* ======================================================
            NAVEGACIÓN
            ====================================================== */}

        <section
          style={{
            marginTop: 20,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
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
        </AdminContent>
      </AdminShell>
    </>
  );
}
