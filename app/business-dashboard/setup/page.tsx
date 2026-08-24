import type {
    ReactNode,
  } from "react";
  
  import Link from "next/link";

  import type {
    LucideIcon,
  } from "lucide-react";

  import {
    ArrowRight,
    Building2,
    CalendarPlus,
    CalendarSync,
    Camera,
    Check,
    ClipboardCheck,
    Clock3,
    Sparkles,
    Wrench,
  } from "lucide-react";
  
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
    icon: LucideIcon;
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
    const Icon =
      icon;

    return (
      <article
        className={
          completed
            ? "setup11-card is-complete"
            : "setup11-card"
        }
      >
        <div className="setup11-card-icon" aria-hidden="true">
          {completed ? (
            <Check size={22} strokeWidth={2.6} />
          ) : (
            <Icon size={22} strokeWidth={2} />
          )}
        </div>

        <div className="setup11-card-content">
          <div className="setup11-card-heading">
            <div>
              <span className="setup11-step-label">
                Paso {number}
                {optional ? " · Opcional" : ""}
              </span>

              <h2>{title}</h2>
            </div>

            <span className="setup11-status">
              {completed ? "Completado" : "Pendiente"}
            </span>
          </div>

          <p>{description}</p>

          <div className="setup11-card-actions">
            {href && !disabled ? (
              <Link
                href={href}
                className={completed ? "btn" : "btn primary"}
              >
                {actionLabel}
                <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            ) : (
              <button type="button" className="btn" disabled>
                {actionLabel}
              </button>
            )}

            {secondary}
          </div>
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
  
        <main className="setup11">
          <div className="setup11-shell">
          <section className="setup11-hero">
            <div className="setup11-hero-copy">
              <span className="setup11-eyebrow">
                <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
                Configuración inicial
              </span>

              <h1>Prepara {business.name}</h1>

              <p>
              Vamos a ayudarte a dejar tu negocio preparado para recibir reservas. Ninguno de los pasos pendientes es obligatorio ahora: puedes configurarlos, omitirlos y volver más adelante desde el menú de Gestión.
              </p>
            </div>

            <div className="setup11-progress-card">
              <div className="setup11-progress-value">
                <strong>{progress}%</strong>
                <span>completado</span>
              </div>

              <div className="setup11-progress-details">
                <div>
                <span>
                    Progreso de configuración
                </span>
                  <strong>{completedSteps} de {totalSteps} pasos</strong>
                </div>

                <div
                  className="setup11-progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label={`Configuración completada al ${progress}%`}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </section>

          <div className="setup11-section-heading">
            <div>
              <span>Tu lista de preparación</span>
              <h2>Configura lo esencial</h2>
            </div>

            <p>Puedes completar los pasos en el orden que prefieras.</p>
          </div>

          <section className="setup11-list">
            <SetupCard
              number={1}
              icon={Building2}
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
            />
  
  <SetupCard
  number={
    2
  }
  icon={Camera}
  title="Imágenes"
  description="Añade fotografías de tu negocio para que los clientes puedan conocer el espacio, las instalaciones y el ambiente antes de reservar."
  completed={
    imagesConfigured
  }
  href="/business-dashboard/edit?setup=1#imagenes"
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
  icon={ClipboardCheck}
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
              icon={Wrench}
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
              icon={Clock3}
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
              icon={CalendarPlus}
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
  icon={CalendarSync}
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
  
          <section className="setup11-finish">
            <div>
              <span className="setup11-finish-icon" aria-hidden="true">
                <Check size={20} strokeWidth={2.4} />
              </span>

              <div>
              <h2>
                Puedes continuar cuando quieras
              </h2>

              <p>
                Finalizar no obliga a completar los pasos pendientes. Todas estas opciones seguirán disponibles desde el panel y el menú de Gestión.
              </p>
              </div>
            </div>

            <form action={completeBusinessOnboarding}>
              <button type="submit" className="btn primary">
                Finalizar configuración
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </form>
          </section>
          </div>

          <style>{`
            .setup11 {
              min-height: 100vh;
              padding: 22px 20px 58px;
              background: #f8f8fb;
            }

            .setup11-shell {
              width: min(1180px, 100%);
              margin: 0 auto;
            }

            .setup11-hero {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 300px;
              align-items: center;
              gap: 34px;
              padding: 28px 30px;
              border: 1px solid var(--border);
              border-radius: 22px;
              background: radial-gradient(circle at 88% 12%, rgba(112, 87, 245, .12), transparent 34%), #fff;
              box-shadow: 0 16px 42px rgba(31, 27, 48, .04);
            }

            .setup11-eyebrow {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: var(--accent-dark);
              font-size: 12px;
              font-weight: 850;
            }

            .setup11-hero h1 {
              margin: 7px 0 8px;
              font-size: clamp(31px, 4vw, 43px);
              line-height: 1.06;
              letter-spacing: -.045em;
            }

            .setup11-hero-copy > p {
              max-width: 650px;
              margin: 0;
              color: var(--muted);
              font-size: 14px;
              line-height: 1.65;
            }

            .setup11-progress-card {
              padding: 18px;
              border: 1px solid #ded8fa;
              border-radius: 17px;
              background: rgba(255, 255, 255, .82);
              box-shadow: 0 10px 28px rgba(71, 52, 160, .06);
            }

            .setup11-progress-value {
              display: flex;
              align-items: baseline;
              gap: 7px;
            }

            .setup11-progress-value strong {
              font-size: 32px;
              letter-spacing: -.04em;
            }

            .setup11-progress-value span,
            .setup11-progress-details span {
              color: var(--muted);
              font-size: 12px;
            }

            .setup11-progress-details { margin-top: 12px; }

            .setup11-progress-details > div:first-child {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 8px;
            }

            .setup11-progress-details strong { font-size: 12px; }

            .setup11-progress-track {
              height: 9px;
              overflow: hidden;
              border-radius: 999px;
              background: #e9e6f2;
            }

            .setup11-progress-track span {
              display: block;
              height: 100%;
              border-radius: inherit;
              background: linear-gradient(90deg, var(--accent), #8c78ff);
            }

            .setup11-section-heading {
              display: flex;
              align-items: end;
              justify-content: space-between;
              gap: 20px;
              margin: 27px 3px 13px;
            }

            .setup11-section-heading span {
              color: var(--accent-dark);
              font-size: 11px;
              font-weight: 850;
            }

            .setup11-section-heading h2 { margin: 4px 0 0; font-size: 23px; }
            .setup11-section-heading p { margin: 0; color: var(--muted); font-size: 13px; }

            .setup11-list { display: grid; gap: 12px; }

            .setup11-card {
              display: grid;
              grid-template-columns: 52px minmax(0, 1fr);
              gap: 16px;
              padding: 19px 20px;
              border: 1px solid var(--border);
              border-radius: 18px;
              background: #fff;
              box-shadow: 0 8px 24px rgba(31, 27, 48, .025);
              transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
            }

            .setup11-card:hover {
              transform: translateY(-1px);
              border-color: #d8d2e7;
              box-shadow: 0 13px 32px rgba(31, 27, 48, .05);
            }

            .setup11-card.is-complete { border-color: #ccebd8; background: linear-gradient(90deg, #fbfffc, #fff 45%); }

            .setup11-card-icon {
              width: 52px;
              height: 52px;
              display: grid;
              place-items: center;
              border-radius: 15px;
              background: #f0edff;
              color: var(--accent-dark);
            }

            .setup11-card.is-complete .setup11-card-icon { background: #e4f8eb; color: #17834a; }
            .setup11-card-content { min-width: 0; }

            .setup11-card-heading {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 14px;
            }

            .setup11-step-label {
              color: var(--muted);
              font-size: 10.5px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: .055em;
            }

            .setup11-card h2 { margin: 4px 0 0; font-size: 19px; }

            .setup11-status {
              flex: 0 0 auto;
              padding: 5px 9px;
              border-radius: 999px;
              background: #f1f1f5;
              color: #696575;
              font-size: 10.5px;
              font-weight: 850;
            }

            .setup11-card.is-complete .setup11-status { background: #dcf6e5; color: #167442; }

            .setup11-card-content > p {
              max-width: 790px;
              margin: 9px 0 0;
              color: var(--muted);
              font-size: 13px;
              line-height: 1.55;
            }

            .setup11-card-actions {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
              margin-top: 14px;
            }

            .setup11-card-actions .btn,
            .setup11-finish .btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }

            .setup11-finish {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              margin-top: 16px;
              padding: 22px 23px;
              border: 1px solid #dcd5fa;
              border-radius: 19px;
              background: linear-gradient(135deg, #f5f2ff, #fff 72%);
            }

            .setup11-finish > div { display: flex; align-items: flex-start; gap: 13px; }

            .setup11-finish-icon {
              width: 39px;
              height: 39px;
              display: grid;
              place-items: center;
              flex: 0 0 39px;
              border-radius: 12px;
              background: #e8e2ff;
              color: var(--accent-dark);
            }

            .setup11-finish h2 { margin: 0; font-size: 19px; }
            .setup11-finish p { max-width: 610px; margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.55; }

            @media (max-width: 760px) {
              .setup11 { padding: 16px 11px 44px; }
              .setup11-hero { grid-template-columns: 1fr; gap: 20px; padding: 21px 19px; }
              .setup11-hero h1 { font-size: 31px; }
              .setup11-section-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
              .setup11-card { grid-template-columns: 44px minmax(0, 1fr); gap: 12px; padding: 16px; }
              .setup11-card-icon { width: 44px; height: 44px; border-radius: 13px; }
              .setup11-card-heading { align-items: stretch; flex-direction: column; gap: 8px; }
              .setup11-status { width: fit-content; }
              .setup11-card-actions { display: grid; grid-template-columns: 1fr; }
              .setup11-card-actions .btn { width: 100%; }
              .setup11-finish { align-items: stretch; flex-direction: column; padding: 18px; }
              .setup11-finish form, .setup11-finish .btn { width: 100%; }
            }
          `}</style>
        </main>
      </>
    );
  }
