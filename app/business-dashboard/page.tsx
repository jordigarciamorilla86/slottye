import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

export default async function BusinessDashboardPage() {
  const {
    supabase,
    user,
    profile,
  } =
    await requireActiveUser();

  

  if (profile?.role !== "business") {
    redirect("/account");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(`
  id,
  name,
  slug,
  description,
  address,
  city,
  phone,
  email,
  active,
  onboarding_completed_at
`)
    .eq("owner_id", user.id)
    .maybeSingle();

  /*
   * ============================================================
   * SIN NEGOCIO
   * ============================================================
   */

  if (!business) {
    return (
      <>
        <Header />

        <main
          className="shell detail"
          style={{
            maxWidth: 900,
          }}
        >
          <section className="panel">
            <div className="kicker">
              Slottye Business
            </div>

            <h1 className="business-title">
              Configura tu negocio
            </h1>

            <p className="muted">
              Todavía no has creado la ficha de tu negocio.
            </p>

            <div
              style={{
                marginTop: 24,
              }}
            >
              <Link
                href="/business-dashboard/create"
                className="btn primary"
              >
                Crear mi negocio
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  /*
 * ============================================================
 * CONFIGURACIÓN INICIAL PENDIENTE
 * ============================================================
 */

if (
  !business.onboarding_completed_at
) {
  redirect(
    "/business-dashboard/setup"
  );
}

  /*
   * ============================================================
   * FECHAS
   * ============================================================
   */

  const now = new Date();

  const startOfToday =
    new Date(now);

  startOfToday.setHours(
    0,
    0,
    0,
    0
  );

  const endOfToday =
    new Date(now);

  endOfToday.setHours(
    23,
    59,
    59,
    999
  );

  /*
   * Semana actual:
   * lunes → domingo
   */

  const day =
    now.getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  const startOfWeek =
    new Date(now);

  startOfWeek.setDate(
    now.getDate() +
      diffToMonday
  );

  startOfWeek.setHours(
    0,
    0,
    0,
    0
  );

  const endOfWeek =
    new Date(startOfWeek);

  endOfWeek.setDate(
    startOfWeek.getDate() +
      6
  );

  endOfWeek.setHours(
    23,
    59,
    59,
    999
  );

  /*
   * Mes actual
   */

  const startOfMonth =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

  const endOfMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

  /*
   * Últimos 7 días incluyendo hoy
   */

  const sevenDaysAgo =
    new Date(startOfToday);

  sevenDaysAgo.setDate(
    startOfToday.getDate() -
      6
  );

  /*
   * ============================================================
   * RESERVAS
   * ============================================================
   */

  const {
    data: bookings,
    error: bookingsError,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      user_id,
      status,
      created_at,
      slot_id,

      slots (
        id,
        start_at,
        end_at,
        status
      ),

      services (
        id,
        name
      ),

      profiles (
        name
      )
    `)
    .eq(
      "business_id",
      business.id
    );

  if (bookingsError) {
    console.error(
      "Error loading dashboard bookings:",
      bookingsError
    );
  }

  /*
   * ============================================================
   * SLOTS DEL MES
   * ============================================================
   */

  const {
    data: monthlySlots,
    error: slotsError,
  } = await supabase
    .from("slots")
    .select(`
      id,
      status,
      start_at,
      end_at
    `)
    .eq(
      "business_id",
      business.id
    )
    .gte(
      "start_at",
      startOfMonth.toISOString()
    )
    .lte(
      "start_at",
      endOfMonth.toISOString()
    );

  if (slotsError) {
    console.error(
      "Error loading dashboard slots:",
      slotsError
    );
  }

  /*
   * ============================================================
   * NORMALIZAR RESERVAS
   * ============================================================
   */

  const normalizedBookings =
    (bookings ?? []).map(
      (booking) => {
        const slot =
          Array.isArray(
            booking.slots
          )
            ? booking.slots[0] ??
              null
            : booking.slots;

        const service =
          Array.isArray(
            booking.services
          )
            ? booking.services[0] ??
              null
            : booking.services;

        const profileData =
          Array.isArray(
            booking.profiles
          )
            ? booking.profiles[0] ??
              null
            : booking.profiles;

        return {
          ...booking,
          slot,
          service,
          profile:
            profileData,
        };
      }
    );

  /*
   * ============================================================
   * MÉTRICAS GENERALES
   * ============================================================
   */

  const confirmedBookings =
    normalizedBookings.filter(
      (booking) =>
        booking.status ===
        "CONFIRMED"
    );

  const bookingsToday =
    confirmedBookings.filter(
      (booking) => {
        if (!booking.slot) {
          return false;
        }

        const date =
          new Date(
            booking.slot.start_at
          );

        return (
          date >=
            startOfToday &&
          date <=
            endOfToday
        );
      }
    );

  const bookingsThisWeek =
    confirmedBookings.filter(
      (booking) => {
        if (!booking.slot) {
          return false;
        }

        const date =
          new Date(
            booking.slot.start_at
          );

        return (
          date >=
            startOfWeek &&
          date <=
            endOfWeek
        );
      }
    );

  const bookingsThisMonth =
    confirmedBookings.filter(
      (booking) => {
        if (!booking.slot) {
          return false;
        }

        const date =
          new Date(
            booking.slot.start_at
          );

        return (
          date >=
            startOfMonth &&
          date <=
            endOfMonth
        );
      }
    );

  /*
   * ============================================================
   * CANCELACIONES
   * ============================================================
   */

  const cancelledThisMonth =
    normalizedBookings.filter(
      (booking) => {
        if (
          booking.status !==
            "CANCELLED_BY_USER" &&
          booking.status !==
            "CANCELLED_BY_BUSINESS"
        ) {
          return false;
        }

        if (!booking.slot) {
          return false;
        }

        const date =
          new Date(
            booking.slot.start_at
          );

        return (
          date >=
            startOfMonth &&
          date <=
            endOfMonth
        );
      }
    );

  /*
   * Total de reservas del mes:
   * confirmadas + canceladas.
   */

  const totalBookingsThisMonth =
    bookingsThisMonth.length +
    cancelledThisMonth.length;

  const cancellationRate =
    totalBookingsThisMonth > 0
      ? Math.round(
          (cancelledThisMonth.length /
            totalBookingsThisMonth) *
            100
        )
      : 0;

  /*
   * ============================================================
   * CLIENTES ÚNICOS
   * ============================================================
   */

  const uniqueClients =
    new Set(
      bookingsThisMonth.map(
        (booking) =>
          booking.user_id
      )
    ).size;

  /*
   * ============================================================
   * SERVICIOS
   * ============================================================
   */

  const serviceCounter =
    new Map<
      string,
      {
        name: string;
        count: number;
      }
    >();

  for (
    const booking of
    bookingsThisMonth
  ) {
    if (
      !booking.service
    ) {
      continue;
    }

    const current =
      serviceCounter.get(
        booking.service.id
      );

    if (current) {
      current.count += 1;
    } else {
      serviceCounter.set(
        booking.service.id,
        {
          name:
            booking.service
              .name,

          count: 1,
        }
      );
    }
  }

  const serviceRanking =
    [...serviceCounter.values()]
      .sort(
        (a, b) =>
          b.count -
          a.count
      )
      .slice(
        0,
        5
      );

  const topService =
    serviceRanking[0] ??
    null;

  /*
   * ============================================================
   * OCUPACIÓN
   * ============================================================
   */

  const totalMonthlySlots =
    monthlySlots?.length ??
    0;

  const bookedMonthlySlots =
    (monthlySlots ?? []).filter(
      (slot) =>
        slot.status ===
        "BOOKED"
    ).length;

  const occupancyRate =
    totalMonthlySlots >
    0
      ? Math.round(
          (bookedMonthlySlots /
            totalMonthlySlots) *
            100
        )
      : 0;

  /*
   * ============================================================
   * ÚLTIMOS 7 DÍAS
   * ============================================================
   */

  const lastSevenDays =
    Array.from({
      length: 7,
    }).map(
      (_, index) => {
        const date =
          new Date(
            sevenDaysAgo
          );

        date.setDate(
          sevenDaysAgo.getDate() +
            index
        );

        const start =
          new Date(date);

        start.setHours(
          0,
          0,
          0,
          0
        );

        const end =
          new Date(date);

        end.setHours(
          23,
          59,
          59,
          999
        );

        const count =
          confirmedBookings.filter(
            (booking) => {
              if (
                !booking.slot
              ) {
                return false;
              }

              const bookingDate =
                new Date(
                  booking.slot.start_at
                );

              return (
                bookingDate >=
                  start &&
                bookingDate <=
                  end
              );
            }
          ).length;

        const label =
          new Intl.DateTimeFormat(
            "es-ES",
            {
              weekday:
                "short",
            }
          )
            .format(date)
            .replace(".", "");

        return {
          date,
          label,
          count,
        };
      }
    );

  const maxDailyBookings =
    Math.max(
      1,
      ...lastSevenDays.map(
        (dayItem) =>
          dayItem.count
      )
    );

  /*
   * ============================================================
   * PRÓXIMAS CITAS
   * ============================================================
   */

  const upcomingBookings =
    confirmedBookings
      .filter(
        (booking) =>
          booking.slot &&
          new Date(
            booking.slot.start_at
          ) > now
      )
      .sort(
        (a, b) =>
          new Date(
            a.slot!.start_at
          ).getTime() -
          new Date(
            b.slot!.start_at
          ).getTime()
      )
      .slice(
        0,
        5
      );

  function formatDateTime(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday:
          "short",

        day:
          "numeric",

        month:
          "short",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(value)
    );
  }

  /*
   * ============================================================
   * ESTILO DE LAS MINI CARDS
   * ============================================================
   */

  const statCardStyle = {
    padding: 14,
    minHeight: 92,
  };

  const statNumberStyle = {
    fontSize: 26,
    fontWeight: 800,
    marginTop: 4,
    lineHeight: 1.1,
  };

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
          maxWidth: 1000,
        }}
      >
        {/* CABECERA */}
        <section className="section">
          <Link
            href="/"
            className="btn"
          >
            ← Volver a Slottye
          </Link>
        </section>
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            {business.name}
          </h1>

          <p className="muted">
            {business.address}

            {business.city
              ? ` · ${business.city}`
              : ""}
          </p>
        </section>

        {/* ======================================================
            ANALÍTICA PLEGABLE
            ====================================================== */}

        <section className="section">
          <details open>
            <summary
              style={{
                cursor:
                  "pointer",

                fontSize: 20,

                fontWeight:
                  800,

                padding:
                  "14px 0",

                userSelect:
                  "none",
              }}
            >
              📊 Estadísticas del negocio
            </summary>

            <div
              className="muted"
              style={{
                marginTop: -5,
                marginBottom: 16,
              }}
            >
              Pulsa en el título para
              ocultar o mostrar las
              estadísticas.
            </div>

            {/* MINI CARDS */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(135px,1fr))",

                gap: 10,
              }}
            >
              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Citas hoy
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    bookingsToday.length
                  }
                </div>
              </div>

              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Esta semana
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    bookingsThisWeek.length
                  }
                </div>
              </div>

              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Este mes
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    bookingsThisMonth.length
                  }
                </div>
              </div>

              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Canceladas
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    cancelledThisMonth.length
                  }
                </div>
              </div>

              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Clientes
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    uniqueClients
                  }
                </div>
              </div>

              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Ocupación
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    occupancyRate
                  }
                  %
                </div>
              </div>

              <div
                className="panel"
                style={
                  statCardStyle
                }
              >
                <div className="muted">
                  Cancelación
                </div>

                <div
                  style={
                    statNumberStyle
                  }
                >
                  {
                    cancellationRate
                  }
                  %
                </div>
              </div>
            </div>

            {/* ==================================================
                ACTIVIDAD 7 DÍAS
                ================================================== */}

            <div
              className="panel"
              style={{
                marginTop: 16,
              }}
            >
              <div className="section-head">
                <div>
                  <h3>
                    Reservas · últimos 7 días
                  </h3>

                  <p className="muted">
                    Número de citas confirmadas por día.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "repeat(7,minmax(0,1fr))",

                  gap: 8,

                  alignItems:
                    "end",

                  height: 190,

                  marginTop: 20,
                }}
              >
                {lastSevenDays.map(
                  (item) => {
                    const barHeight =
                      item.count ===
                      0
                        ? 4
                        : Math.max(
                            12,

                            Math.round(
                              (item.count /
                                maxDailyBookings) *
                                120
                            )
                          );

                    return (
                      <div
                        key={
                          item.date.toISOString()
                        }
                        style={{
                          display:
                            "flex",

                          flexDirection:
                            "column",

                          alignItems:
                            "center",

                          justifyContent:
                            "flex-end",

                          height:
                            "100%",
                        }}
                      >
                        <strong
                          style={{
                            fontSize:
                              13,

                            marginBottom:
                              6,
                          }}
                        >
                          {
                            item.count
                          }
                        </strong>

                        <div
                          style={{
                            width:
                              "70%",

                            maxWidth:
                              42,

                            height:
                              barHeight,

                            borderRadius:
                              "8px 8px 3px 3px",

                            background:
                              "var(--accent, currentColor)",

                            opacity:
                              item.count ===
                              0
                                ? 0.15
                                : 0.75,
                          }}
                        />

                        <span
                          className="muted"
                          style={{
                            marginTop:
                              7,

                            fontSize:
                              12,

                            textTransform:
                              "capitalize",
                          }}
                        >
                          {
                            item.label
                          }
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* ==================================================
                SERVICIOS
                ================================================== */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(280px,1fr))",

                gap: 14,

                marginTop: 16,
              }}
            >
              {/* TOP SERVICE */}

              <div className="panel">
                <div className="kicker">
                  Servicio más reservado
                </div>

                {topService ? (
                  <>
                    <h3
                      style={{
                        marginTop: 8,
                        marginBottom: 4,
                      }}
                    >
                      {
                        topService.name
                      }
                    </h3>

                    <div className="muted">
                      {
                        topService.count
                      }{" "}
                      {topService.count ===
                      1
                        ? "reserva"
                        : "reservas"}{" "}
                      este mes
                    </div>
                  </>
                ) : (
                  <p className="muted">
                    Todavía no hay reservas este mes.
                  </p>
                )}
              </div>

              {/* TOP 5 */}

              <div className="panel">
                <h3>
                  Top servicios
                </h3>

                {serviceRanking.length >
                0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    {serviceRanking.map(
                      (
                        service,
                        index
                      ) => (
                        <div
                          key={
                            service.name
                          }
                          style={{
                            display:
                              "grid",

                            gridTemplateColumns:
                              "28px minmax(0,1fr) auto",

                            alignItems:
                              "center",

                            gap: 8,
                          }}
                        >
                          <strong>
                            {index +
                              1}
                          </strong>

                          <span>
                            {
                              service.name
                            }
                          </span>

                          <span className="muted">
                            {
                              service.count
                            }
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="muted">
                    Sin datos todavía.
                  </p>
                )}
              </div>
            </div>
          </details>
        </section>

        {/* ======================================================
            PRÓXIMAS CITAS
            ====================================================== */}

        <section className="section">
          <div className="section-head">
            <div>
              <h2>
                Próximas citas
              </h2>

              <p className="muted">
                Las siguientes reservas confirmadas.
              </p>
            </div>

            <Link
              href="/business-dashboard/bookings"
              className="btn"
            >
              Ver todas
            </Link>
          </div>

          {upcomingBookings.length >
          0 ? (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {upcomingBookings.map(
                (booking) => (
                  <div
                    className="card"
                    key={
                      booking.id
                    }
                  >
                    <div
                      className="card-body"
                      style={{
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap: 12,

                          alignItems:
                            "center",

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <strong>
                            {
                              booking.profile
                                ?.name ??
                              "Cliente"
                            }
                          </strong>

                          {booking.service && (
                            <div
                              className="muted"
                              style={{
                                marginTop:
                                  4,
                              }}
                            >
                              {
                                booking.service
                                  .name
                              }
                            </div>
                          )}
                        </div>

                        {booking.slot && (
                          <strong>
                            📅{" "}
                            {formatDateTime(
                              booking.slot
                                .start_at
                            )}
                          </strong>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="panel">
              <p className="muted">
                No hay próximas citas confirmadas.
              </p>
            </div>
          )}
        </section>

        {/* ======================================================
            GESTIÓN
            ====================================================== */}

        <section className="section">
          <div className="section-head">
            <div>
              <h2>
                Gestionar negocio
              </h2>

              <p className="muted">
                Configuración y herramientas de tu negocio.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit,minmax(210px,1fr))",

              gap: 10,
            }}
          >
            <Link
              href="/business-dashboard/edit"
              className="btn"
            >
              ✏️ Editar mi negocio
            </Link>

            <Link
              href="/business-dashboard/images"
              className="btn"
            >
              📷 Imágenes
            </Link>

            <Link
              href="/business-dashboard/hours"
              className="btn"
            >
              🕒 Horarios
            </Link>

            <Link
              href="/business-dashboard/services"
              className="btn"
            >
              🛠️ Servicios
            </Link>

            <Link
              href="/business-dashboard/calendar"
              className="btn"
            >
              📅 Calendario y citas
            </Link>

            <Link
              href="/business-dashboard/bookings"
              className="btn"
            >
              📋 Reservas
            </Link>
            <Link
  href="/business-dashboard/agenda"
  className="btn"
>
  📅 Agenda
</Link>
            <Link
              href="/business-dashboard/subscribers"
              className="btn"
            >
              🔔 Suscriptores
            </Link>

            <Link
              href={`/business/${business.slug}`}
              className="btn primary"
            >
              Ver ficha pública
            </Link>
          </div>
        </section>

        <section
          className="section"
          style={{
            marginTop: 20,
          }}
        >
          <Link
            href="/"
            className="btn"
          >
            ← Volver a Slottye
          </Link>
        </section>
                {/* ======================================================
            ZONA DE PELIGRO
            ====================================================== */}

<section className="section">
          <div
            style={{
              marginTop: 16,
              paddingTop: 24,
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#b91c1c",
                marginBottom: 6,
              }}
            >
              Zona de peligro
            </div>

            <p
              className="muted"
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                marginBottom: 14,
                maxWidth: 650,
              }}
            >
              Elimina permanentemente tu cuenta de Slottye,
              tu negocio y todos los datos asociados. Las
              reservas futuras de tus clientes serán canceladas
              y recibirán un aviso por correo electrónico.
            </p>

            <Link
              href="/account/delete"
              className="btn"
              style={{
                color: "#b91c1c",
                borderColor: "#fecaca",
                background: "#fff",
              }}
            >
              Eliminar cuenta y negocio
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}