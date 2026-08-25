import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import { ArrowLeft } from "lucide-react";

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

        <main className="business-empty12">
          <section className="business-empty12-card">
            <div className="business-empty12-kicker">
              Slottye Business
            </div>

            <h1>
              Configura tu negocio
            </h1>

            <p>
              Todavía no has creado la ficha de tu negocio.
            </p>

            <div className="business-empty12-actions">
              <Link
                href="/business-dashboard/create"
                className="btn primary"
              >
                Crear mi negocio
              </Link>
            </div>
          </section>

          <style>{`
            .business-empty12 {
              min-height: calc(100vh - 72px);
              display: grid;
              place-items: center;
              padding: 28px 20px 64px;
              background: #f8f8fb;
            }
            .business-empty12-card {
              width: min(760px, 100%);
              padding: clamp(28px, 5vw, 52px);
              border: 1px solid var(--border);
              border-radius: 24px;
              background: radial-gradient(circle at 88% 8%, rgba(112,87,245,.12), transparent 34%), #fff;
              box-shadow: 0 22px 56px rgba(31,27,48,.07);
              text-align: center;
            }
            .business-empty12-kicker {
              color: var(--accent-dark);
              font-size: 11px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: .06em;
            }
            .business-empty12-card h1 {
              margin: 9px 0 8px;
              font-size: clamp(30px, 5vw, 46px);
              line-height: 1.05;
              letter-spacing: -.045em;
            }
            .business-empty12-card p {
              margin: 0;
              color: var(--muted);
              font-size: 14px;
              line-height: 1.6;
            }
            .business-empty12-actions {
              display: flex;
              justify-content: center;
              margin-top: 24px;
            }
            @media (max-width: 520px) {
              .business-empty12 { padding: 18px 12px 46px; }
              .business-empty12-card { padding: 28px 18px; border-radius: 20px; }
              .business-empty12-actions .btn { width: 100%; }
            }
          `}</style>
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

  const startOfPreviousMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

  const endOfPreviousMonth =
    new Date(
      now.getFullYear(),
      now.getMonth(),
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

        return {
          ...booking,
          slot,
          service,
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

  const bookingsPreviousMonth =
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
            startOfPreviousMonth &&
          date <=
            endOfPreviousMonth
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

  const uniqueClientsPreviousMonth =
    new Set(
      bookingsPreviousMonth.map(
        (booking) =>
          booking.user_id
      )
    ).size;

  const bookingsMonthDifference =
    bookingsThisMonth.length -
    bookingsPreviousMonth.length;

  const bookingsMonthChangeRate =
    bookingsPreviousMonth.length > 0
      ? Math.round(
          (bookingsMonthDifference /
            bookingsPreviousMonth.length) *
            100
        )
      : null;

  const clientsMonthDifference =
    uniqueClients -
    uniqueClientsPreviousMonth;

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

        const dayNumber =
          new Intl.DateTimeFormat(
            "es-ES",
            {
              day:
                "numeric",
            }
          ).format(date);

        return {
          date,
          label,
          dayNumber,
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
   * UI
   * ============================================================
   */


  return (
    <>
      <Header />

      <main className="stats8">
        <div className="stats8-shell">
          {/* ====================================================
              CABECERA
              ==================================================== */}

          <section className="stats8-hero">
            <div>
              <span className="stats8-eyebrow">
                Estadísticas
              </span>

              <h1>
                {business.name}
              </h1>

              <p>
                Resumen del rendimiento de tu negocio.
              </p>
            </div>

            <Link
              href="/account"
              className="btn stats8-public-link"
            >
              <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
              Volver a mi panel
            </Link>
          </section>

          {/* ====================================================
              MÉTRICAS
              ==================================================== */}

          <section
            className="stats8-kpis"
            aria-label="Resumen de estadísticas"
          >
            <article>
              <span>Citas hoy</span>
              <strong>
                {bookingsToday.length}
              </strong>
              <small>
                Confirmadas para hoy
              </small>
            </article>

            <article>
              <span>Esta semana</span>
              <strong>
                {bookingsThisWeek.length}
              </strong>
              <small>
                Lunes a domingo
              </small>
            </article>

            <article>
              <span>Este mes</span>
              <strong>
                {bookingsThisMonth.length}
              </strong>
              <small>
                Reservas confirmadas
              </small>
            </article>

            <article>
              <span>Clientes</span>
              <strong>
                {uniqueClients}
              </strong>
              <small>
                Clientes únicos este mes
              </small>
            </article>

            <article>
              <span>Ocupación</span>
              <strong>
                {occupancyRate}%
              </strong>
              <small>
                Huecos reservados del mes
              </small>
            </article>

            <article
              className={
                cancellationRate >= 40
                  ? "is-warning"
                  : undefined
              }
            >
              <span>Cancelación</span>
              <strong>
                {cancellationRate}%
              </strong>
              <small>
                Sobre reservas del mes
              </small>
            </article>
          </section>

          {/* ====================================================
              RENDIMIENTO
              ==================================================== */}

          <section className="stats8-grid">
            <article className="stats8-card stats8-chart-card">
              <div className="stats8-card-head">
                <div>
                  <span className="stats8-section-label">
                    Actividad
                  </span>

                  <h2>
                    Reservas confirmadas · últimos 7 días
                  </h2>

                  <p>
                    Cada barra representa cuántas citas confirmadas
                    estaban programadas para ese día.
                  </p>
                </div>
              </div>

              <div
                className="stats8-chart"
                aria-label="Reservas confirmadas por día"
              >
                {lastSevenDays.map(
                  (item) => {
                    const height =
                      item.count === 0
                        ? 4
                        : Math.max(
                            18,
                            Math.round(
                              (item.count /
                                maxDailyBookings) *
                                112
                            )
                          );

                    return (
                      <div
                        key={
                          item.date.toISOString()
                        }
                        className="stats8-chart-day"
                      >
                        <strong>
                          {item.count}
                        </strong>

                        <div className="stats8-chart-track">
                          <span
                            style={{
                              height,
                              opacity:
                                item.count === 0
                                  ? 0.12
                                  : 0.88,
                            }}
                          />
                        </div>

                        <small>
                          {item.label} {item.dayNumber}
                        </small>
                      </div>
                    );
                  }
                )}
              </div>
            </article>

            <article className="stats8-card stats8-services-card">
              <div className="stats8-card-head">
                <div>
                  <span className="stats8-section-label">
                    Servicios
                  </span>

                  <h2>
                    Más reservados
                  </h2>

                  <p>
                    Reservas confirmadas durante este mes.
                  </p>
                </div>
              </div>

              {topService ? (
                <>
                  <div className="stats8-top-service">
                    <span>
                      Más reservado
                    </span>

                    <strong>
                      {topService.name}
                    </strong>

                    <small>
                      {topService.count}{" "}
                      {topService.count === 1
                        ? "reserva"
                        : "reservas"}
                    </small>
                  </div>

                  <div className="stats8-ranking">
                    {serviceRanking.map(
                      (
                        service,
                        index
                      ) => {
                        const percentage =
                          bookingsThisMonth.length >
                          0
                            ? Math.round(
                                (service.count /
                                  bookingsThisMonth.length) *
                                  100
                              )
                            : 0;

                        return (
                          <div
                            key={
                              service.name
                            }
                            className="stats8-ranking-row"
                          >
                            <div className="stats8-ranking-main">
                              <span>
                                {index + 1}
                              </span>

                              <strong>
                                {
                                  service.name
                                }
                              </strong>

                              <small>
                                {
                                  service.count
                                }
                              </small>
                            </div>

                            <div className="stats8-ranking-track">
                              <span
                                style={{
                                  width:
                                    `${Math.max(
                                      percentage,
                                      4
                                    )}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              ) : (
                <div className="stats8-empty">
                  Todavía no hay reservas confirmadas este mes.
                </div>
              )}
            </article>
          </section>

          {/* ====================================================
              EVOLUCIÓN MENSUAL
              ==================================================== */}

          <section className="stats8-month">
            <div className="stats8-month-copy">
              <span className="stats8-section-label">
                Comparativa
              </span>

              <h2>
                Evolución mensual
              </h2>

              <p>
                Compara las reservas y los clientes del mes actual
                con el mes anterior.
              </p>
            </div>

            <div className="stats8-month-values">
              <div>
                <span>
                  Este mes
                </span>

                <strong>
                  {bookingsThisMonth.length}
                </strong>

                <small>
                  reservas confirmadas
                </small>
              </div>

              <div>
                <span>
                  Mes anterior
                </span>

                <strong>
                  {bookingsPreviousMonth.length}
                </strong>

                <small>
                  reservas confirmadas
                </small>
              </div>

              <div
                className={
                  bookingsMonthDifference > 0
                    ? "is-positive"
                    : bookingsMonthDifference < 0
                      ? "is-negative"
                      : undefined
                }
              >
                <span>
                  Variación
                </span>

                <strong>
                  {bookingsMonthChangeRate === null
                    ? "—"
                    : `${
                        bookingsMonthDifference > 0
                          ? "+"
                          : ""
                      }${bookingsMonthChangeRate}%`}
                </strong>

                <small>
                  {bookingsMonthDifference === 0
                    ? "sin cambios"
                    : `${Math.abs(
                        bookingsMonthDifference
                      )} ${
                        Math.abs(
                          bookingsMonthDifference
                        ) === 1
                          ? "reserva"
                          : "reservas"
                      } ${
                        bookingsMonthDifference > 0
                          ? "más"
                          : "menos"
                      }`}
                </small>
              </div>

              <div
                className={
                  clientsMonthDifference > 0
                    ? "is-positive"
                    : clientsMonthDifference < 0
                      ? "is-negative"
                      : undefined
                }
              >
                <span>
                  Clientes
                </span>

                <strong>
                  {uniqueClients}
                </strong>

                <small>
                  {clientsMonthDifference === 0
                    ? "igual que el mes anterior"
                    : `${clientsMonthDifference > 0 ? "+" : ""}${
                        clientsMonthDifference
                      } vs. mes anterior`}
                </small>
              </div>
            </div>
          </section>
        </div>

        <style>{`
          .stats8 {
            min-height: 100vh;
            padding: 30px 20px 64px;
            background: #f8f8fb;
          }

          .stats8-shell {
            width: min(1180px, 100%);
            margin: 0 auto;
          }

          .stats8-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 22px;
            padding: 24px 26px;
            border: 1px solid var(--border);
            border-radius: 20px;
            background:
              radial-gradient(
                circle at 88% 12%,
                rgba(112,87,245,.09),
                transparent 30%
              ),
              #fff;
            box-shadow:
              0 16px 42px
              rgba(31,27,48,.035);
          }

          .stats8-eyebrow,
          .stats8-section-label {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
            letter-spacing: .01em;
          }

          .stats8-hero h1 {
            max-width: 850px;
            margin: 6px 0 5px;
            font-size: clamp(
              27px,
              3vw,
              37px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .stats8-hero p,
          .stats8-card-head p,
          .stats8-month-copy p {
            margin: 0;
            color: var(--muted);
            line-height: 1.5;
          }

          .stats8-public-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex-shrink: 0;
            font-weight: 800;
          }

          .stats8-kpis {
            display: grid;
            grid-template-columns:
              repeat(
                6,
                minmax(0,1fr)
              );
            gap: 10px;
            margin-top: 14px;
          }

          .stats8-kpis article {
            min-width: 0;
            padding: 14px 15px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: #fff;
          }

          .stats8-kpis article > span,
          .stats8-kpis article > small {
            display: block;
          }

          .stats8-kpis article > span {
            color: var(--muted);
            font-size: 11px;
          }

          .stats8-kpis article > strong {
            display: block;
            margin-top: 4px;
            font-size: 22px;
            line-height: 1;
            letter-spacing: -.025em;
          }

          .stats8-kpis article > small {
            margin-top: 5px;
            color: #8b8896;
            font-size: 9.5px;
            line-height: 1.25;
          }

          .stats8-kpis article.is-warning strong {
            color: #b42318;
          }

          .stats8-grid {
            display: grid;
            grid-template-columns:
              minmax(0,1.62fr)
              minmax(320px,.72fr);
            gap: 16px;
            margin-top: 24px;
            align-items: stretch;
          }

          .stats8-card {
            min-width: 0;
            padding: 19px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: #fff;
            box-shadow:
              0 14px 34px
              rgba(31,27,48,.03);
          }

          .stats8-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }

          .stats8-card-head h2,
          .stats8-month h2 {
            margin: 4px 0 5px;
            font-size: 21px;
            letter-spacing: -.025em;
          }

          .stats8-card-head p,
          .stats8-month-copy p {
            font-size: 12px;
          }

          .stats8-total strong {
            color: var(--accent-dark);
            font-size: 20px;
          }

          .stats8-total span {
            margin-top: 1px;
            color: var(--muted);
            font-size: 9.5px;
          }

          .stats8-chart {
            height: 170px;
            display: grid;
            grid-template-columns:
              repeat(
                7,
                minmax(0,1fr)
              );
            gap: 8px;
            align-items: end;
            margin-top: 14px;
          }

          .stats8-chart-day {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
          }

          .stats8-chart-day > strong {
            margin-bottom: 5px;
            font-size: 11px;
          }

          .stats8-chart-track {
            width: min(
              42px,
              68%
            );
            height: 116px;
            display: flex;
            align-items: flex-end;
            overflow: hidden;
            border-radius: 9px;
            background: #f0edff;
          }

          .stats8-chart-track span {
            width: 100%;
            display: block;
            border-radius:
              8px 8px 2px 2px;
            background:
              var(--accent);
          }

          .stats8-chart-day small {
            margin-top: 6px;
            color: var(--muted);
            font-size: 10px;
            text-transform: capitalize;
          }

          .stats8-top-service {
            margin-top: 14px;
            padding: 13px;
            border-radius: 12px;
            background: #f7f5ff;
          }

          .stats8-top-service span,
          .stats8-top-service strong,
          .stats8-top-service small {
            display: block;
          }

          .stats8-top-service span {
            color: var(--accent-dark);
            font-size: 9.5px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .stats8-top-service strong {
            margin-top: 4px;
            font-size: 18px;
          }

          .stats8-top-service small {
            margin-top: 2px;
            color: var(--muted);
            font-size: 11px;
          }

          .stats8-ranking {
            display: grid;
            gap: 11px;
            margin-top: 15px;
          }

          .stats8-ranking-main {
            display: grid;
            grid-template-columns:
              24px
              minmax(0,1fr)
              auto;
            align-items: center;
            gap: 8px;
          }

          .stats8-ranking-main > span {
            width: 24px;
            height: 24px;
            display: grid;
            place-items: center;
            border-radius: 7px;
            background: #f0ecff;
            color: var(--accent-dark);
            font-size: 10px;
            font-weight: 850;
          }

          .stats8-ranking-main strong {
            font-size: 12px;
          }

          .stats8-ranking-main small {
            color: var(--muted);
            font-size: 11px;
            font-weight: 800;
          }

          .stats8-ranking-track {
            height: 5px;
            margin: 5px 0 0 32px;
            overflow: hidden;
            border-radius: 999px;
            background: #f0edf5;
          }

          .stats8-ranking-track span {
            height: 100%;
            display: block;
            border-radius: inherit;
            background: var(--accent);
          }

          .stats8-empty {
            margin-top: 14px;
            padding: 16px;
            border-radius: 12px;
            background: #f8f7fb;
            color: var(--muted);
            font-size: 12px;
          }

          .stats8-month {
            display: grid;
            grid-template-columns:
              minmax(220px,.72fr)
              minmax(0,1.7fr);
            gap: 24px;
            align-items: center;
            margin-top: 16px;
            padding: 18px 20px;
            border: 1px solid var(--border);
            border-radius: 17px;
            background: #fff;
          }

          .stats8-month-values {
            display: grid;
            grid-template-columns:
              repeat(
                4,
                minmax(0,1fr)
              );
            gap: 8px;
          }

          .stats8-month-values > div {
            padding: 10px 11px;
            border-radius: 11px;
            background: #f8f7fb;
          }

          .stats8-month-values span,
          .stats8-month-values strong {
            display: block;
          }

          .stats8-month-values small {
            display: block;
            margin-top: 3px;
            color: #8b8896;
            font-size: 9.5px;
            line-height: 1.25;
          }

          .stats8-month-values .is-positive strong {
            color: #15803d;
          }

          .stats8-month-values .is-negative strong {
            color: #b42318;
          }

          .stats8-month-values span {
            color: var(--muted);
            font-size: 10px;
          }

          .stats8-month-values strong {
            margin-top: 3px;
            font-size: 18px;
          }

          @media (
            max-width: 1050px
          ) {
            .stats8-kpis {
              grid-template-columns:
                repeat(
                  3,
                  minmax(0,1fr)
                );
            }

            .stats8-grid {
              grid-template-columns:
                minmax(0,1.35fr)
                minmax(280px,.72fr);
            }
          }

          @media (
            max-width: 820px
          ) {
            .stats8-grid {
              grid-template-columns:
                1fr;
            }

            .stats8-month {
              grid-template-columns:
                1fr;
            }
          }

          @media (
            max-width: 620px
          ) {
            .stats8 {
              padding:
                18px 12px
                46px;
            }

            .stats8-hero {
              flex-direction:
                column;
              align-items:
                stretch;
              padding: 19px;
            }

            .stats8-hero h1 {
              font-size: 29px;
            }

            .stats8-public-link {
              width: 100%;
              justify-content:
                center;
            }

            .stats8-kpis {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );
            }

            .stats8-card-head {
              flex-direction:
                column;
            }

            .stats8-chart {
              height: 150px;
            }

            .stats8-chart-track {
              width: min(
                30px,
                64%
              );
              height: 100px;
            }

            .stats8-month-values {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );
            }
          }

          @media (
            max-width: 400px
          ) {
            .stats8-kpis {
              grid-template-columns:
                1fr 1fr;
            }

            .stats8-kpis article {
              padding: 12px;
            }

            .stats8-card {
              padding: 15px;
            }
          }
        `}</style>
      </main>
    </>
  );
}
