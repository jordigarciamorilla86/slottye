import type {
    ReactNode,
  } from "react";
  
  import Link from "next/link";
  
  import {
    redirect,
  } from "next/navigation";
  
  import {
    revalidatePath,
  } from "next/cache";
  
  import {
    Header,
  } from "@/components/Header";
  
  import {
    requireActiveUser,
  } from "@/lib/auth/requireActiveUser";

  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  async function completeBusinessOnboarding() {
    "use server";
  
    const {
      user,
      profile,
    } =
      await requireActiveUser();
  
    if (
      profile?.role !==
      "business"
    ) {
      redirect(
        "/account"
      );
    }
  
    /*
     * ============================================================
     * FINALIZAR ONBOARDING
     * ============================================================
     *
     * La escritura se realiza exclusivamente en servidor
     * mediante service_role.
     *
     * El usuario autenticado no necesita permiso UPDATE
     * directo sobre businesses para esta operación.
     */
  
    const admin =
      createAdminClient();
  
    const {
      error,
    } =
      await admin
        .from(
          "businesses"
        )
        .update({
          onboarding_completed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "owner_id",
          user.id
        );
  
    if (
      error
    ) {
      console.error(
        "Error completing business onboarding:",
        error
      );
  
      throw new Error(
        "No se ha podido finalizar la configuración inicial."
      );
    }
  
    revalidatePath(
      "/business-dashboard"
    );
  
    revalidatePath(
      "/business-dashboard/setup"
    );
  
    redirect(
      "/business-dashboard"
    );
  }
  
  type SetupCardProps = {
    number: number;
    icon: string;
    title: string;
    description: string;
    completed: boolean;
    optional?: boolean;
    href?: string;
    actionLabel: string;
    secondary?: ReactNode;
    disabled?: boolean;
  };
  
  function SetupCard({
    number,
    icon,
    title,
    description,
    completed,
    optional = true,
    href,
    actionLabel,
    secondary,
    disabled = false,
  }: SetupCardProps) {
    return (
      <article
        className="panel"
        style={{
          display:
            "grid",
  
          gap:
            14,
  
          borderColor:
            completed
              ? "#bbf7d0"
              : "var(--border)",
  
          background:
            completed
              ? "#f8fff9"
              : "#ffffff",
        }}
      >
        <div
          style={{
            display:
              "flex",
  
            alignItems:
              "flex-start",
  
            justifyContent:
              "space-between",
  
            gap:
              14,
          }}
        >
          <div
            style={{
              display:
                "flex",
  
              alignItems:
                "flex-start",
  
              gap:
                12,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width:
                  42,
  
                height:
                  42,
  
                flexShrink:
                  0,
  
                display:
                  "flex",
  
                alignItems:
                  "center",
  
                justifyContent:
                  "center",
  
                borderRadius:
                  12,
  
                background:
                  completed
                    ? "#dcfce7"
                    : "#f0edff",
  
                fontSize:
                  20,
              }}
            >
              {icon}
            </div>
  
            <div>
              <div
                className="muted"
                style={{
                  fontSize:
                    12,
  
                  fontWeight:
                    800,
  
                  textTransform:
                    "uppercase",
  
                  letterSpacing:
                    "0.04em",
                }}
              >
                Paso {number}
  
                {optional
                  ? " · Opcional"
                  : ""}
              </div>
  
              <h2
                style={{
                  margin:
                    "5px 0 0",
  
                  fontSize:
                    19,
                }}
              >
                {title}
              </h2>
            </div>
          </div>
  
          <div
            style={{
              flexShrink:
                0,
  
              padding:
                "5px 9px",
  
              borderRadius:
                999,
  
              background:
                completed
                  ? "#dcfce7"
                  : "#f3f4f6",
  
              color:
                completed
                  ? "#166534"
                  : "#64748b",
  
              fontSize:
                12,
  
              fontWeight:
                800,
            }}
          >
            {completed
              ? "✓ Completado"
              : "Pendiente"}
          </div>
        </div>
  
        <p
          className="muted"
          style={{
            margin:
              0,
  
            lineHeight:
              1.65,
          }}
        >
          {description}
        </p>
  
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
          {href &&
          !disabled ? (
            <Link
              href={
                href
              }
              className={
                completed
                  ? "btn"
                  : "btn primary"
              }
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="btn"
              disabled
              title="Esta sección se añadirá en el siguiente paso"
            >
              {actionLabel}
            </button>
          )}
  
          {secondary}
        </div>
      </article>
    );
  }
  
  export default async function BusinessSetupPage() {
    const {
      supabase,
      user,
      profile,
    } =
      await requireActiveUser();

      const admin =
  createAdminClient();
  
    if (
      profile?.role !==
      "business"
    ) {
      redirect(
        "/account"
      );
    }
  
    const {
      data:
        business,
      error:
        businessError,
    } =
      await supabase
        .from(
          "businesses"
        )
        .select(`
          id,
          name,
          slug,
          description,
          address,
          city,
          postal_code,
          phone,
          email,
          website,
          google_place_id,
          show_google_reviews,
min_booking_notice_hours,
max_booking_advance_days,
allow_cancellations,
min_cancellation_notice_hours,
booking_policies_reviewed_at,
onboarding_completed_at
        `)
        .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();
  
    if (
      businessError
    ) {
      console.error(
        "Error loading onboarding business:",
        businessError
      );
    }
  
    if (
      !business
    ) {
      redirect(
        "/business-dashboard/create"
      );
    }
  
    if (
      business.onboarding_completed_at
    ) {
      redirect(
        "/business-dashboard"
      );
    }
  
    const [
      imagesResult,
      servicesResult,
      hoursResult,
      slotsResult,
      googleCalendarResult,
    ] =
      await Promise.all([
            supabase
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
        supabase
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
          )
          .eq(
            "active",
            true
          ),
  
        supabase
          .from(
            "business_hours"
          )
          .select(`
            day_of_week,
            open_time,
            close_time,
            open_time_2,
            close_time_2,
            closed
          `)
          .eq(
            "business_id",
            business.id
          ),
  
        supabase
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
            new Date().toISOString()
          ),
          admin
  .from(
    "business_google_calendar_connections"
  )
  .select(
    "business_id",
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
      ]);
      if (
        imagesResult.error
      ) {
        console.error(
          "Error loading onboarding images:",
          imagesResult.error
        );
      }
    if (
      servicesResult.error
    ) {
      console.error(
        "Error loading onboarding services:",
        servicesResult.error
      );
    }
  
    if (
      hoursResult.error
    ) {
      console.error(
        "Error loading onboarding hours:",
        hoursResult.error
      );
    }
  
    if (
      slotsResult.error
    ) {
      console.error(
        "Error loading onboarding slots:",
        slotsResult.error
      );
    }

    if (
      googleCalendarResult.error
    ) {
      console.error(
        "Error loading onboarding Google Calendar:",
        googleCalendarResult.error
      );
    }
  
    const businessConfigured =
      Boolean(
        business.name?.trim() &&
        business.address?.trim() &&
        business.city?.trim()
      );

      const imagesConfigured =
      (
        imagesResult.count ??
        0
      ) >
      0;


    const servicesConfigured =
      (
        servicesResult.count ??
        0
      ) >
      0;
  
    const hoursConfigured =
      (
        hoursResult.data ??
        []
      ).some(
        (
          hour
        ) =>
          !hour.closed &&
          Boolean(
            hour.open_time &&
            hour.close_time
          )
      );
  
    const availabilityConfigured =
      (
        slotsResult.count ??
        0
      ) >
      0;

      const googleCalendarConfigured =
  (
    googleCalendarResult.count ??
    0
  ) >
  0;
  
      const policiesConfigured =
  Boolean(
    business.booking_policies_reviewed_at
  );
  
  const completedSteps =
  [
    businessConfigured,
    imagesConfigured,
    policiesConfigured,
    servicesConfigured,
    hoursConfigured,
    availabilityConfigured,
    googleCalendarConfigured,
  ].filter(
    Boolean
  ).length;

const totalSteps =
  7;
  
    const progress =
      Math.round(
        (
          completedSteps /
          totalSteps
        ) *
        100
      );
  
    return (
      <>
        <Header />
  
        <main
          className="shell detail"
          style={{
            maxWidth:
              920,
          }}
        >
          <section
            className="panel"
            style={{
              background:
                "linear-gradient(135deg, #f8f7ff 0%, #ffffff 65%)",
            }}
          >
            <div className="kicker">
              Configuración inicial
            </div>
  
            <h1
              className="business-title"
              style={{
                marginBottom:
                  8,
              }}
            >
              👋 Prepara {business.name}
            </h1>
  
            <p
              className="muted"
              style={{
                maxWidth:
                  720,
  
                lineHeight:
                  1.7,
              }}
            >
              Vamos a ayudarte a dejar tu negocio preparado para recibir reservas. Ninguno de los pasos pendientes es obligatorio ahora: puedes configurarlos, omitirlos y volver más adelante desde el menú de Gestión.
            </p>
  
            <div
              style={{
                marginTop:
                  22,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
  
                  justifyContent:
                    "space-between",
  
                  gap:
                    12,
  
                  marginBottom:
                    8,
  
                  fontSize:
                    13,
  
                  fontWeight:
                    800,
                }}
              >
                <span>
                  Progreso de configuración
                </span>
  
                <span>
                  {completedSteps} de{" "}
                  {totalSteps}
                  {" · "}
                  {progress}%
                </span>
              </div>
  
              <div
                aria-label={`Configuración completada al ${progress}%`}
                style={{
                  height:
                    10,
  
                  overflow:
                    "hidden",
  
                  borderRadius:
                    999,
  
                  background:
                    "#e5e7eb",
                }}
              >
                <div
                  style={{
                    width:
                      `${progress}%`,
  
                    height:
                      "100%",
  
                    borderRadius:
                      999,
  
                    background:
                      "var(--accent)",
                  }}
                />
              </div>
            </div>
          </section>
  
          <section
            className="section"
            style={{
              display:
                "grid",
  
              gap:
                14,
            }}
          >
            <SetupCard
              number={1}
              icon="🏢"
              title="Ficha del negocio"
              description="Tu ficha ya está creada. Revisa el nombre, la descripción, los datos de contacto y la información importada desde Google. También puedes decidir si quieres mostrar la valoración de Google en la ficha pública."
              completed={
                businessConfigured
              }
              optional={
                false
              }
              href="/business-dashboard/edit?setup=1&review=policies#booking-policies"
              actionLabel="Revisar ficha"
              secondary={
                <Link
                  href={`/business/${business.slug}`}
                  className="btn"
                >
                  Ver ficha pública
                </Link>
              }
            />
  
  <SetupCard
  number={
    2
  }
  icon="📷"
  title="Imágenes"
  description="Añade fotografías de tu negocio para que los clientes puedan conocer el espacio, las instalaciones y el ambiente antes de reservar."
  completed={
    imagesConfigured
  }
  href="/business-dashboard/images?setup=1"
  actionLabel={
    imagesConfigured
      ? "Revisar imágenes"
      : "Añadir imágenes"
  }
/>

  <SetupCard
  number={
    3
  }
  icon="📋"
  title="Políticas de reserva"
  description="Define con cuánta antelación pueden reservar tus clientes, hasta cuándo pueden cancelar y qué comportamiento quieres aplicar a las reservas. Podrás dejar los valores recomendados o personalizarlos."
  completed={
    policiesConfigured
  }
  href="/business-dashboard/edit?setup=1#booking-policies"
  actionLabel={
    policiesConfigured
      ? "Revisar políticas"
      : "Configurar políticas"
  }
/>
  
            <SetupCard
              number={4}
              icon="🛠️"
              title="Servicios"
              description="Crea los servicios que ofrece tu negocio. Indica el nombre y la duración habitual; después podrás crear disponibilidades con una duración distinta cuando lo necesites."
              completed={
                servicesConfigured
              }
              href="/business-dashboard/services?setup=1"
              actionLabel={
                servicesConfigured
                  ? "Revisar servicios"
                  : "Añadir servicios"
              }
            />
  
            <SetupCard
              number={5}
              icon="🕒"
              title="Horarios"
              description="Configura los días y tramos en los que tu negocio abre habitualmente. La agenda seguirá permitiéndote crear excepciones, bloqueos y disponibilidades fuera de ese horario."
              completed={
                hoursConfigured
              }
              href="/business-dashboard/hours?setup=1"
              actionLabel={
                hoursConfigured
                  ? "Revisar horarios"
                  : "Configurar horarios"
              }
            />
  
            <SetupCard
              number={6}
              icon="📅"
              title="Primera disponibilidad"
              description="Publica una primera cita disponible para comprobar cómo funciona la agenda y permitir que un cliente pueda reservarla desde la ficha pública."
              completed={
                availabilityConfigured
              }
              href="/business-dashboard/agenda?setup=1"
              actionLabel={
                availabilityConfigured
                  ? "Abrir agenda"
                  : "Añadir una cita"
              }
              secondary={
                <Link
                href="/business-dashboard/calendar?setup=1"
                  className="btn"
                >
                  Generar varias citas
                </Link>
              }
            />

<SetupCard
  number={
    7
  }
  icon="📅"
  title="Google Calendar"
  description="Conecta opcionalmente Google Calendar para mantener sincronizadas las reservas, bloqueos y horarios ocupados de tu negocio. Los cambios realizados en Google Calendar podrán reflejarse automáticamente en la agenda de Slottye."
  completed={
    googleCalendarConfigured
  }
  href={
    googleCalendarConfigured
      ? undefined
      : `/api/google-calendar/connect?businessId=${encodeURIComponent(
          business.id
        )}&returnTo=${encodeURIComponent(
          "/business-dashboard/setup"
        )}`
  }
  actionLabel={
    googleCalendarConfigured
      ? "Google Calendar conectado"
      : "Conectar Google Calendar"
  }
  disabled={
    googleCalendarConfigured
  }
/>
          </section>
  
          <section
            className="panel section"
            style={{
              display:
                "flex",
  
              alignItems:
                "center",
  
              justifyContent:
                "space-between",
  
              gap:
                18,
  
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                maxWidth:
                  610,
              }}
            >
              <h2
                style={{
                  margin:
                    0,
                }}
              >
                Puedes continuar cuando quieras
              </h2>
  
              <p
                className="muted"
                style={{
                  margin:
                    "7px 0 0",
  
                  lineHeight:
                    1.6,
                }}
              >
                Finalizar no obliga a completar los pasos pendientes. Todas estas opciones seguirán disponibles desde el panel y el menú de Gestión.
              </p>
            </div>
  
            <form
              action={
                completeBusinessOnboarding
              }
            >
              <button
                type="submit"
                className="btn primary"
              >
                Finalizar configuración
              </button>
            </form>
          </section>
        </main>
      </>
    );
  }