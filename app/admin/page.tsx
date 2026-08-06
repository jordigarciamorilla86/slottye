import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  Header,
} from "@/components/Header";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type Tone =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "purple";

export default async function AdminPage() {
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  /*
   * ============================================================
   * USUARIO AUTENTICADO
   * ============================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * COMPROBAR SUPER ADMINISTRADOR
   * ============================================================
   */

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await admin
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
      .maybeSingle();

  if (profileError) {
    console.error(
      "Error loading admin profile:",
      profileError
    );
  }

  if (!profile?.is_admin) {
    redirect("/");
  }

  /*
   * ============================================================
   * PERIODOS DE ACTIVIDAD
   *
   * Usamos periodos móviles para no depender de la zona horaria
   * del servidor de Vercel:
   *
   * - últimas 24 horas;
   * - últimos 7 días;
   * - últimos 30 días.
   * ============================================================
   */

  const now =
    new Date();

  const last24Hours =
    new Date(
      now.getTime() -
        24 * 60 * 60 * 1000
    ).toISOString();

  const last7Days =
    new Date(
      now.getTime() -
        7 * 24 * 60 * 60 * 1000
    ).toISOString();

  const last30Days =
    new Date(
      now.getTime() -
        30 * 24 * 60 * 60 * 1000
    ).toISOString();

  /*
   * ============================================================
   * ESTADÍSTICAS GLOBALES
   * ============================================================
   */

  const [
    usersResult,
    blockedUsersResult,

    businessesResult,
    activeBusinessesResult,
    inactiveBusinessesResult,

    bookingsResult,
    confirmedBookingsResult,
    completedBookingsResult,
    noShowBookingsResult,
    cancelledBookingsResult,

    bookings24HoursResult,
    bookings7DaysResult,
    bookings30DaysResult,

    reviewsResult,
    visibleReviewsResult,
    hiddenReviewsResult,

    notificationsResult,
    sentNotificationsResult,
    pendingNotificationsResult,
    failedNotificationsResult,
  ] =
    await Promise.all([
      /*
       * USUARIOS
       */

      admin
        .from("profiles")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        ),

      admin
        .from("profiles")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "is_blocked",
          true
        ),

      /*
       * NEGOCIOS
       */

      admin
        .from("businesses")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        ),

      admin
        .from("businesses")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "active",
          true
        ),

      admin
        .from("businesses")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "active",
          false
        ),

      /*
       * RESERVAS
       */

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        ),

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "CONFIRMED"
        ),

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "COMPLETED"
        ),

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "NO_SHOW"
        ),

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .in(
          "status",
          [
            "CANCELLED_BY_USER",
            "CANCELLED_BY_BUSINESS",
            "CANCELLED_ACCOUNT_DELETED",
          ]
        ),

      /*
       * ACTIVIDAD DE RESERVAS
       */

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .gte(
          "created_at",
          last24Hours
        ),

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .gte(
          "created_at",
          last7Days
        ),

      admin
        .from("bookings")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .gte(
          "created_at",
          last30Days
        ),

      /*
       * RESEÑAS
       */

      admin
        .from("reviews")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        ),

      admin
        .from("reviews")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "visible",
          true
        ),

      admin
        .from("reviews")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "visible",
          false
        ),

      /*
       * NOTIFICACIONES
       */

      admin
        .from("notifications")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        ),

      admin
        .from("notifications")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "SENT"
        ),

      admin
        .from("notifications")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "PENDING"
        ),

      admin
        .from("notifications")
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "FAILED"
        ),
    ]);

  /*
   * ============================================================
   * MOSTRAR ERRORES DE CONSULTA
   * ============================================================
   */

  const statisticErrors = [
    usersResult.error,
    blockedUsersResult.error,

    businessesResult.error,
    activeBusinessesResult.error,
    inactiveBusinessesResult.error,

    bookingsResult.error,
    confirmedBookingsResult.error,
    completedBookingsResult.error,
    noShowBookingsResult.error,
    cancelledBookingsResult.error,

    bookings24HoursResult.error,
    bookings7DaysResult.error,
    bookings30DaysResult.error,

    reviewsResult.error,
    visibleReviewsResult.error,
    hiddenReviewsResult.error,

    notificationsResult.error,
    sentNotificationsResult.error,
    pendingNotificationsResult.error,
    failedNotificationsResult.error,
  ].filter(
    Boolean
  );

  if (
    statisticErrors.length >
    0
  ) {
    console.error(
      "Errors loading admin dashboard statistics:",
      statisticErrors
    );
  }

  /*
   * ============================================================
   * VALORES CALCULADOS
   * ============================================================
   */

  const totalBookings =
    bookingsResult.count ??
    0;

  const cancelledBookings =
    cancelledBookingsResult.count ??
    0;

  const cancellationRate =
    totalBookings >
    0
      ? (
          cancelledBookings /
          totalBookings
        ) *
        100
      : 0;

  const sentNotifications =
    sentNotificationsResult.count ??
    0;

  const failedNotifications =
    failedNotificationsResult.count ??
    0;

  const processedNotifications =
    sentNotifications +
    failedNotifications;

  const emailSuccessRate =
    processedNotifications >
    0
      ? (
          sentNotifications /
          processedNotifications
        ) *
        100
      : 0;

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            1200,
        }}
      >
        <section
          className="panel"
          style={{
            borderColor:
              "#c4b5fd",

            background:
              "linear-gradient(135deg, #f8f7ff 0%, #ffffff 72%)",
          }}
        >
          <div className="kicker">
            Slottye Super Admin
          </div>

          <h1 className="business-title">
            Panel de administración
          </h1>

          <p className="muted">
            Hola
            {profile.name
              ? `, ${profile.name}`
              : ""}
            . Aquí tienes una visión global del estado de Slottye.
          </p>

          {statisticErrors.length >
            0 && (
            <div
              style={{
                marginTop:
                  18,

                padding:
                  "12px 14px",

                border:
                  "1px solid #fde68a",

                borderRadius:
                  12,

                background:
                  "#fffbeb",

                color:
                  "#92400e",

                fontSize:
                  13,

                fontWeight:
                  700,
              }}
            >
              Algunas métricas no se han podido cargar. Revisa la terminal del servidor.
            </div>
          )}
        </section>

        {/* ======================================================
            RESUMEN GENERAL
            ====================================================== */}

        <section
          className="section"
        >
          <SectionHeader
            title="Resumen general"
            description="Volumen actual de usuarios, negocios, reservas y reseñas."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",

              gap:
                14,
            }}
          >
            <StatCard
              label="Usuarios"
              value={
                usersResult.count ??
                0
              }
              tone="purple"
            />

            <StatCard
              label="Negocios"
              value={
                businessesResult.count ??
                0
              }
              tone="purple"
            />

            <StatCard
              label="Reservas"
              value={
                totalBookings
              }
              tone="purple"
            />

            <StatCard
              label="Reseñas"
              value={
                reviewsResult.count ??
                0
              }
              tone="purple"
            />

            <StatCard
              label="Notificaciones"
              value={
                notificationsResult.count ??
                0
              }
              tone="purple"
            />
          </div>
        </section>

        {/* ======================================================
            USUARIOS Y NEGOCIOS
            ====================================================== */}

        <section
          className="section"
        >
          <SectionHeader
            title="Usuarios y negocios"
            description="Estado de las cuentas y fichas públicas de Slottye."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",

              gap:
                14,
            }}
          >
            <StatCard
              label="Usuarios activos"
              value={
                Math.max(
                  (
                    usersResult.count ??
                    0
                  ) -
                    (
                      blockedUsersResult.count ??
                      0
                    ),
                  0
                )
              }
              tone="success"
            />

            <StatCard
              label="Usuarios bloqueados"
              value={
                blockedUsersResult.count ??
                0
              }
              tone="error"
            />

            <StatCard
              label="Negocios activos"
              value={
                activeBusinessesResult.count ??
                0
              }
              tone="success"
            />

            <StatCard
              label="Negocios inactivos"
              value={
                inactiveBusinessesResult.count ??
                0
              }
              tone="warning"
            />
          </div>
        </section>

        {/* ======================================================
            ACTIVIDAD RECIENTE
            ====================================================== */}

        <section
          className="section"
        >
          <SectionHeader
            title="Actividad reciente"
            description="Reservas creadas durante los periodos más recientes."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",

              gap:
                14,
            }}
          >
            <StatCard
              label="Últimas 24 horas"
              value={
                bookings24HoursResult.count ??
                0
              }
            />

            <StatCard
              label="Últimos 7 días"
              value={
                bookings7DaysResult.count ??
                0
              }
            />

            <StatCard
              label="Últimos 30 días"
              value={
                bookings30DaysResult.count ??
                0
              }
            />
          </div>
        </section>

        {/* ======================================================
            ESTADO DE RESERVAS
            ====================================================== */}

        <section
          className="section"
        >
          <SectionHeader
            title="Estado de las reservas"
            description="Distribución histórica por estado."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",

              gap:
                14,
            }}
          >
            <StatCard
              label="Confirmadas"
              value={
                confirmedBookingsResult.count ??
                0
              }
              tone="purple"
            />

            <StatCard
              label="Completadas"
              value={
                completedBookingsResult.count ??
                0
              }
              tone="success"
            />

            <StatCard
              label="No presentados"
              value={
                noShowBookingsResult.count ??
                0
              }
              tone="warning"
            />

            <StatCard
              label="Canceladas"
              value={
                cancelledBookings
              }
              tone="error"
            />

            <StatCard
              label="Tasa de cancelación"
              value={`${cancellationRate.toFixed(
                1
              )}%`}
              tone={
                cancellationRate >=
                30
                  ? "error"
                  : cancellationRate >=
                      15
                    ? "warning"
                    : "success"
              }
            />
          </div>
        </section>

        {/* ======================================================
            RESEÑAS
            ====================================================== */}

        <section
          className="section"
        >
          <SectionHeader
            title="Moderación de reseñas"
            description="Estado de las opiniones publicadas por los clientes."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",

              gap:
                14,
            }}
          >
            <StatCard
              label="Reseñas visibles"
              value={
                visibleReviewsResult.count ??
                0
              }
              tone="success"
            />

            <StatCard
              label="Reseñas ocultas"
              value={
                hiddenReviewsResult.count ??
                0
              }
              tone="error"
            />
          </div>
        </section>

        {/* ======================================================
            NOTIFICACIONES
            ====================================================== */}

        <section
          className="section"
        >
          <SectionHeader
            title="Notificaciones"
            description="Estado de los correos registrados por Slottye."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",

              gap:
                14,
            }}
          >
            <StatCard
              label="Enviadas"
              value={
                sentNotifications
              }
              tone="success"
            />

            <StatCard
              label="Pendientes"
              value={
                pendingNotificationsResult.count ??
                0
              }
              tone="warning"
            />

            <StatCard
              label="Fallidas"
              value={
                failedNotifications
              }
              tone="error"
            />

            <StatCard
              label="Tasa de entrega"
              value={`${emailSuccessRate.toFixed(
                1
              )}%`}
              tone={
                emailSuccessRate >=
                95
                  ? "success"
                  : emailSuccessRate >=
                      80
                    ? "warning"
                    : "error"
              }
            />
          </div>
        </section>

        {/* ======================================================
            GESTIÓN
            ====================================================== */}

        <section
          className="panel section"
        >
          <SectionHeader
            title="Gestión"
            description="Accede a los módulos administrativos de Slottye."
          />

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(245px, 1fr))",

              gap:
                12,
            }}
          >
            <AdminLink
              href="/admin/users"
              icon="👤"
              title="Gestionar usuarios"
              description="Bloquear, desbloquear o eliminar cuentas."
            />

            <AdminLink
              href="/admin/businesses"
              icon="🏢"
              title="Gestionar negocios"
              description="Administrar fichas, agendas y configuración."
            />

            <AdminLink
              href="/admin/bookings"
              icon="📅"
              title="Gestionar reservas"
              description="Consultar el historial global de reservas."
            />

            <AdminLink
              href="/admin/reviews"
              icon="⭐"
              title="Gestionar reseñas"
              description="Consultar, ocultar o restaurar opiniones."
            />

            <AdminLink
              href="/admin/notifications"
              icon="📨"
              title="Centro de notificaciones"
              description="Revisar correos enviados, pendientes y fallidos."
            />
            <AdminLink
  href="/admin/audit"
  icon="📜"
  title="Auditoría administrativa"
  description="Consultar acciones, cambios y entidades afectadas."
/>
          </div>
        </section>

        <section
          style={{
            marginTop:
              20,
          }}
        >
          <Link
            href="/"
            className="btn"
          >
            ← Volver a Slottye
          </Link>
        </section>
      </main>
    </>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title:
    string;

  description:
    string;
}) {
  return (
    <div
      style={{
        marginBottom:
          14,
      }}
    >
      <h2
        style={{
          margin:
            0,
        }}
      >
        {title}
      </h2>

      <p
        className="muted"
        style={{
          margin:
            "6px 0 0",
        }}
      >
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label:
    string;

  value:
    number |
    string;

  tone?:
    Tone;
}) {
  const tones: Record<
    Tone,
    {
      background:
        string;

      borderColor:
        string;

      color:
        string;
    }
  > = {
    default: {
      background:
        "var(--card)",

      borderColor:
        "var(--border)",

      color:
        "var(--text)",
    },

    success: {
      background:
        "#f0fdf4",

      borderColor:
        "#bbf7d0",

      color:
        "#166534",
    },

    warning: {
      background:
        "#fffbeb",

      borderColor:
        "#fde68a",

      color:
        "#92400e",
    },

    error: {
      background:
        "#fef2f2",

      borderColor:
        "#fecaca",

      color:
        "#b91c1c",
    },

    purple: {
      background:
        "#f5f3ff",

      borderColor:
        "#ddd6fe",

      color:
        "#5b21b6",
    },
  };

  const selectedTone =
    tones[tone];

  return (
    <div
      className="panel"
      style={{
        background:
          selectedTone.background,

        borderColor:
          selectedTone.borderColor,

        color:
          selectedTone.color,
      }}
    >
      <div
        style={{
          opacity:
            0.82,

          fontSize:
            14,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            7,

          fontSize:
            30,

          fontWeight:
            800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AdminLink({
  href,
  icon,
  title,
  description,
}: {
  href:
    string;

  icon:
    string;

  title:
    string;

  description:
    string;
}) {
  return (
    <Link
      href={
        href
      }
      className="card"
      style={{
        display:
          "block",

        color:
          "inherit",

        textDecoration:
          "none",
      }}
    >
      <div className="card-body">
        <div
          style={{
            fontSize:
              25,
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin:
              "10px 0 5px",
          }}
        >
          {title}
        </h3>

        <p
          className="muted"
          style={{
            margin:
              0,

            fontSize:
              13,

            lineHeight:
              1.55,
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}