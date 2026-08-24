import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

import {
  Header,
} from "@/components/Header";

import {
  requireActiveUser,
} from "@/lib/auth/requireActiveUser";

import CalendarManager from "./CalendarManager";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function CalendarPage({
  searchParams,
}: Props) {
  const {
    setup,
  } =
    await searchParams;

  const fromSetup =
    setup === "1";

  const {
    supabase,
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

  const {
    data:
      business,
  } =
    await supabase
      .from(
        "businesses"
      )
      .select(
        "id,name,slug"
      )
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();

  if (
    !business
  ) {
    redirect(
      "/business-dashboard/create"
    );
  }

  const {
    data:
      services,
  } =
    await supabase
      .from(
        "services"
      )
      .select(
        "id,name,duration_minutes"
      )
      .eq(
        "business_id",
        business.id
      )
      .eq(
        "active",
        true
      )
      .order(
        "name"
      );

  const {
    data:
      slots,
  } =
    await supabase
      .from(
        "slots"
      )
      .select(`
        id,
        service_id,
        start_at,
        end_at,
        status
      `)
      .eq(
        "business_id",
        business.id
      )
      .gte(
        "start_at",
        new Date().toISOString()
      )
      .order(
        "start_at"
      );

  const {
    data:
      businessHours,
  } =
    await supabase
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
      )
      .order(
        "day_of_week"
      );

  const {
    data:
      businessBlocks,
  } =
    await supabase
      .from(
        "business_blocks"
      )
      .select(`
        id,
        start_at,
        end_at,
        reason
      `)
      .eq(
        "business_id",
        business.id
      )
      .gte(
        "end_at",
        new Date().toISOString()
      )
      .order(
        "start_at"
      );

  return (
    <>
      <Header />

      <main className="calendar-page">
        <div className="calendar-page-shell">
          <section className="calendar-page-hero">
            <div>
              <span className="calendar-page-kicker">
                Configuración
              </span>

              <h1>
                Calendario y citas
              </h1>

              <p>
                Crea y gestiona la disponibilidad de {business.name}.
              </p>
            </div>

            <div className="calendar-page-actions">
              <Link
                href={
                  fromSetup
                    ? "/business-dashboard/agenda?setup=1"
                    : "/business-dashboard/agenda"
                }
                className="btn primary"
              >
                <CalendarDays
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                Abrir agenda
              </Link>

              {fromSetup ? (
                <Link
                  href="/business-dashboard/setup"
                  className="btn"
                >
                  <ArrowLeft
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  Volver a configuración inicial
                </Link>
              ) : (
                <Link
                  href={`/business/${business.slug}`}
                  className="btn"
                >
                  Ver ficha pública

                  <ExternalLink
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          </section>

          <CalendarManager
            businessId={
              business.id
            }
            services={
              services ??
              []
            }
            initialSlots={
              slots ??
              []
            }
            businessHours={
              businessHours ??
              []
            }
            initialBlocks={
              businessBlocks ??
              []
            }
          />
        </div>

        <style>{`
          .calendar-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .calendar-page-shell {
            width: min(1180px,100%);
            margin: 0 auto;
          }

          .calendar-page-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
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

          .calendar-page-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .calendar-page-hero h1 {
            margin: 6px 0 5px;
            font-size: clamp(30px,3vw,38px);
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .calendar-page-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .calendar-page-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: wrap;
          }

          .calendar-page-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          @media (max-width: 700px) {
            .calendar-page {
              padding: 18px 12px 46px;
            }

            .calendar-page-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .calendar-page-hero h1 {
              font-size: 30px;
            }

            .calendar-page-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .calendar-page-actions .btn {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </>
  );
}