import Link from "next/link";

import {
  notFound,
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

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessDetailPage({
  params,
}: Props) {
  const {
    businessId,
  } =
    await params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  /*
   * ============================================================
   * COMPROBAR SUPER ADMIN
   * ============================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      adminProfile,
  } =
    await admin
      .from(
        "profiles"
      )
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

  if (
    !adminProfile?.is_admin
  ) {
    redirect(
      "/"
    );
  }

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        owner_id,
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
        onboarding_completed_at,

        profiles (
          id,
          name,
          email,
          is_blocked
        ),

        categories (
          id,
          name,
          slug
        )
      `)
      .eq(
        "id",
        businessId
      )
      .maybeSingle();

  if (
    businessError
  ) {
    console.error(
      "Error loading admin business detail:",
      businessError
    );
  }

  if (
    !business
  ) {
    notFound();
  }

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

  /*
   * ============================================================
   * ESTADÍSTICAS
   * ============================================================
   */

  const now =
    new Date()
      .toISOString();

  const [
    servicesResult,
    imagesResult,
    subscribersResult,
    reviewsResult,
    futureSlotsResult,
    confirmedBookingsResult,
    manualBookingsResult,
    blocksResult,
  ] =
    await Promise.all([
      admin
        .from(
          "services"
        )
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
          "business_id",
          business.id
        ),

      admin
        .from(
          "business_images"
        )
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
          "business_id",
          business.id
        ),

      admin
        .from(
          "business_subscriptions"
        )
        .select(
          "user_id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "business_id",
          business.id
        ),

      admin
        .from(
          "reviews"
        )
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
          "business_id",
          business.id
        ),

      admin
        .from(
          "slots"
        )
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
          "business_id",
          business.id
        )
        .eq(
          "status",
          "AVAILABLE"
        )
        .gt(
          "end_at",
          now
        ),

      admin
        .from(
          "bookings"
        )
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
          "business_id",
          business.id
        )
        .eq(
          "status",
          "CONFIRMED"
        ),

      admin
        .from(
          "manual_bookings"
        )
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
          "business_id",
          business.id
        ),

      admin
        .from(
          "business_blocks"
        )
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
          "business_id",
          business.id
        )
        .gt(
          "end_at",
          now
        ),
    ]);

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

  function formatDate(
    value:
      string
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
      new Date(
        value
      )
    );
  }

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
        <section
          className="panel"
          style={{
            borderColor:
              "#c4b5fd",

            background:
              "linear-gradient(135deg, #f8f7ff 0%, #ffffff 70%)",
          }}
        >
          <div className="kicker">
            Slottye Super Admin
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "flex-start",

              justifyContent:
                "space-between",

              gap:
                18,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h1
                className="business-title"
                style={{
                  marginBottom:
                    8,
                }}
              >
                {business.name}
              </h1>

              <p
                className="muted"
                style={{
                  margin:
                    0,
                }}
              >
                Estás administrando este negocio como super administrador.
              </p>
            </div>

            <span
              style={{
                padding:
                  "6px 11px",

                borderRadius:
                  999,

                background:
                  business.active
                    ? "#dcfce7"
                    : "#fee2e2",

                color:
                  business.active
                    ? "#166534"
                    : "#b91c1c",

                fontSize:
                  12,

                fontWeight:
                  800,
              }}
            >
              {business.active
                ? "ACTIVO"
                : "INACTIVO"}
            </span>
          </div>

          <div
            style={{
              display:
                "flex",

              gap:
                10,

              flexWrap:
                "wrap",

              marginTop:
                22,
            }}
          >
            <Link
              href={`/admin/businesses/${business.id}/agenda`}
              className="btn primary"
            >
              📅 Gestionar agenda
            </Link>

            <Link
              href={`/business/${business.slug}`}
              className="btn"
            >
              🌐 Ver ficha pública
            </Link>

            <Link
              href={`/admin/users?user=${business.owner_id}`}
              className="btn"
            >
              👤 Ver propietario
            </Link>
          </div>
        </section>

        <section
          className="section"
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",

            gap:
              14,
          }}
        >
          <StatCard
            label="Servicios"
            value={
              servicesResult.count ??
              0
            }
          />

          <StatCard
            label="Imágenes"
            value={
              imagesResult.count ??
              0
            }
          />

          <StatCard
            label="Suscriptores"
            value={
              subscribersResult.count ??
              0
            }
          />

          <StatCard
            label="Reseñas"
            value={
              reviewsResult.count ??
              0
            }
          />

          <StatCard
            label="Disponibilidades futuras"
            value={
              futureSlotsResult.count ??
              0
            }
          />

          <StatCard
            label="Reservas confirmadas"
            value={
              confirmedBookingsResult.count ??
              0
            }
          />

          <StatCard
            label="Reservas manuales"
            value={
              manualBookingsResult.count ??
              0
            }
          />

          <StatCard
            label="Bloqueos futuros"
            value={
              blocksResult.count ??
              0
            }
          />
        </section>

        <section
          className="panel section"
        >
          <h2>
            Información del negocio
          </h2>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",

              gap:
                20,

              marginTop:
                18,
            }}
          >
            <Detail
              label="Categoría"
              value={
                category?.name ??
                "Sin categoría"
              }
            />

            <Detail
              label="Dirección"
              value={
                fullAddress ||
                "Sin dirección"
              }
            />

            <Detail
              label="Teléfono"
              value={
                business.phone ??
                "Sin teléfono"
              }
            />

            <Detail
              label="Email"
              value={
                business.email ??
                "Sin email"
              }
            />

            <Detail
              label="Página web"
              value={
                business.website ??
                "Sin web"
              }
            />

            <Detail
              label="Google Maps"
              value={
                business.google_place_id
                  ? "Vinculado"
                  : "No vinculado"
              }
            />

            <Detail
              label="Reseñas de Google"
              value={
                business.show_google_reviews
                  ? "Visibles"
                  : "Ocultas"
              }
            />

            <Detail
              label="Onboarding"
              value={
                business.onboarding_completed_at
                  ? `Finalizado el ${formatDate(
                      business.onboarding_completed_at
                    )}`
                  : "Pendiente"
              }
            />

            <Detail
              label="Fecha de alta"
              value={
                formatDate(
                  business.created_at
                )
              }
            />

            <Detail
              label="Última actualización"
              value={
                formatDate(
                  business.updated_at
                )
              }
            />
          </div>

          {business.description && (
            <div
              style={{
                marginTop:
                  22,

                paddingTop:
                  18,

                borderTop:
                  "1px solid var(--border)",
              }}
            >
              <div
                className="muted"
                style={{
                  marginBottom:
                    6,

                  fontSize:
                    13,
                }}
              >
                Descripción
              </div>

              <p
                style={{
                  margin:
                    0,

                  lineHeight:
                    1.7,
                }}
              >
                {business.description}
              </p>
            </div>
          )}
        </section>

        <section
          className="panel section"
        >
          <h2>
            Propietario
          </h2>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",

              gap:
                18,

              marginTop:
                16,
            }}
          >
            <Detail
              label="Nombre"
              value={
                owner?.name?.trim() ||
                "Sin nombre"
              }
            />

            <Detail
              label="Email"
              value={
                owner?.email ??
                "Sin email"
              }
            />

            <Detail
              label="Estado de la cuenta"
              value={
                owner?.is_blocked
                  ? "Bloqueada"
                  : "Activa"
              }
            />

            <Detail
              label="ID"
              value={
                business.owner_id
              }
            />
          </div>
        </section>

        <section
          className="panel section"
        >
          <h2>
            Políticas de reserva
          </h2>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",

              gap:
                18,

              marginTop:
                16,
            }}
          >
            <Detail
              label="Aviso mínimo"
              value={`${business.min_booking_notice_hours} horas`}
            />

            <Detail
              label="Antelación máxima"
              value={`${business.max_booking_advance_days} días`}
            />

            <Detail
              label="Cancelaciones"
              value={
                business.allow_cancellations
                  ? "Permitidas"
                  : "No permitidas"
              }
            />

            <Detail
              label="Aviso para cancelar"
              value={`${business.min_cancellation_notice_hours} horas`}
            />
          </div>
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
            href="/admin/businesses"
            className="btn"
          >
            ← Volver a negocios
          </Link>

          <Link
            href="/admin"
            className="btn"
          >
            Panel de administración
          </Link>
        </section>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="panel">
      <div className="muted">
        {label}
      </div>

      <div
        style={{
          marginTop:
            6,

          fontSize:
            29,

          fontWeight:
            800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <div
        className="muted"
        style={{
          marginBottom:
            5,

          fontSize:
            13,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}