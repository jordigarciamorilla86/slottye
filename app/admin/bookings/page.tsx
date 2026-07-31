import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBookingsPage() {
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
   * RESERVAS
   * ============================================================
   */

  const {
    data: bookings,
    error,
  } =
    await supabase
      .from("bookings")
      .select(`
        id,
        slot_id,
        user_id,
        business_id,
        service_id,
        status,
        created_at,
        cancelled_at,

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

        services (
          id,
          name,
          duration_minutes
        ),

        slots (
          id,
          start_at,
          end_at,
          status
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
      "Error loading admin bookings:",
      error
    );
  }

  /*
   * ============================================================
   * FORMATO DE FECHA
   * ============================================================
   */

  function formatDateTime(
    value:
      string |
      null
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday:
          "short",

        day:
          "numeric",

        month:
          "short",

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
   * TEXTO ESTADO
   * ============================================================
   */

  function getStatusLabel(
    status: string
  ) {
    switch (status) {
      case "CONFIRMED":
        return "Confirmada";

      case "CANCELLED_BY_USER":
        return "Cancelada por cliente";

      case "CANCELLED_BY_BUSINESS":
        return "Cancelada por negocio";

      case "COMPLETED":
        return "Completada";

      case "NO_SHOW":
        return "No presentado";

      default:
        return status;
    }
  }

  /*
   * ============================================================
   * COLOR ESTADO
   * ============================================================
   */

  function getStatusStyle(
    status: string
  ) {
    if (
      status ===
      "CONFIRMED"
    ) {
      return {
        background:
          "#dcfce7",

        color:
          "#166534",
      };
    }

    if (
      status ===
        "CANCELLED_BY_USER" ||
      status ===
        "CANCELLED_BY_BUSINESS"
    ) {
      return {
        background:
          "#fee2e2",

        color:
          "#b91c1c",
      };
    }

    if (
      status ===
      "COMPLETED"
    ) {
      return {
        background:
          "#e0e7ff",

        color:
          "#3730a3",
      };
    }

    if (
      status ===
      "NO_SHOW"
    ) {
      return {
        background:
          "#fef3c7",

        color:
          "#92400e",
      };
    }

    return {
      background:
        "#f3f4f6",

      color:
        "#374151",
    };
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
            1150,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Admin
          </div>

          <h1 className="business-title">
            Reservas
          </h1>

          <p className="muted">
            Consulta todas las reservas realizadas en Slottye.
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
            {(bookings ?? []).map(
              (
                booking
              ) => {
                const profile =
                  Array.isArray(
                    booking.profiles
                  )
                    ? booking
                        .profiles[0] ??
                      null
                    : booking.profiles;

                const business =
                  Array.isArray(
                    booking.businesses
                  )
                    ? booking
                        .businesses[0] ??
                      null
                    : booking.businesses;

                const service =
                  Array.isArray(
                    booking.services
                  )
                    ? booking
                        .services[0] ??
                      null
                    : booking.services;

                const slot =
                  Array.isArray(
                    booking.slots
                  )
                    ? booking
                        .slots[0] ??
                      null
                    : booking.slots;

                const statusStyle =
                  getStatusStyle(
                    booking.status
                  );

                return (
                  <div
                    className="card"
                    key={
                      booking.id
                    }
                  >
                    <div className="card-body">
                      {/* CABECERA */}

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
                                  19,
                              }}
                            >
                              {business?.name ??
                                "Negocio"}
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

                                ...statusStyle,
                              }}
                            >
                              {getStatusLabel(
                                booking.status
                              )}
                            </span>
                          </div>

                          {business?.city && (
                            <div
                              className="muted"
                              style={{
                                marginTop:
                                  5,
                              }}
                            >
                              {
                                business.city
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
                            booking.id
                          }
                        </div>
                      </div>

                      {/* DATOS */}

                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",

                          gap:
                            18,

                          marginTop:
                            20,
                        }}
                      >
                        {/* CLIENTE */}

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
                            Cliente
                          </div>

                          <strong>
                            {profile?.name?.trim() ||
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
                            {profile?.email ??
                              "Sin email"}
                          </div>
                        </div>

                        {/* SERVICIO */}

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
                            Servicio
                          </div>

                          <strong>
                            {service?.name ??
                              "Sin servicio"}
                          </strong>

                          {service?.duration_minutes && (
                            <div
                              className="muted"
                              style={{
                                marginTop:
                                  3,

                                fontSize:
                                  13,
                              }}
                            >
                              {
                                service.duration_minutes
                              }{" "}
                              min
                            </div>
                          )}
                        </div>

                        {/* CITA */}

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
                            Fecha de la cita
                          </div>

                          <strong>
                            {formatDateTime(
                              slot?.start_at ??
                                null
                            )}
                          </strong>
                        </div>

                        {/* CREADA */}

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
                            Reserva creada
                          </div>

                          <strong>
                            {formatDateTime(
                              booking.created_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* CANCELACIÓN */}

                      {booking.cancelled_at && (
                        <div
                          style={{
                            marginTop:
                              18,

                            paddingTop:
                              16,

                            borderTop:
                              "1px solid var(--border)",
                          }}
                        >
                          <span className="muted">
                            Cancelada el{" "}
                          </span>

                          <strong>
                            {formatDateTime(
                              booking.cancelled_at
                            )}
                          </strong>
                        </div>
                      )}

                      {/* ACCIONES */}

                      {business?.slug && (
                        <div
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
                            href={`/business/${business.slug}`}
                            className="btn primary"
                          >
                            Ver negocio
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {(bookings ?? [])
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
                No hay reservas registradas.
              </p>
            </div>
          )}
        </section>

        {/* NAVEGACIÓN */}

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