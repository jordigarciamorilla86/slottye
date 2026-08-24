import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

import BusinessHoursManager from "./BusinessHoursManager";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function BusinessHoursPage({
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
  } =
    await requireActiveUser();

  const {
    data: business,
  } =
    await supabase
      .from("businesses")
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
    data: hours,
  } =
    await supabase
      .from("business_hours")
      .select(`
        id,
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

  return (
    <>
      <Header />

      <main className="hours-page">
        <div className="hours-page-shell">
          <section className="hours-page-hero">
            <div>
              <span className="hours-page-kicker">
                Configuración
              </span>

              <h1>
                Horarios
              </h1>

              <p>
                Configura el horario habitual de {business.name}.
              </p>
            </div>

            <div className="hours-page-hero-actions">
              {fromSetup ? (
                <Link
                  href="/business-dashboard/setup"
                  className="btn primary"
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

          <BusinessHoursManager
            businessId={
              business.id
            }
            initialHours={
              hours ??
              []
            }
          />
        </div>

        <style>{`
          .hours-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .hours-page-shell {
            width: min(1180px,100%);
            margin: 0 auto;
          }

          .hours-page-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 24px 26px;
            border: 1px solid var(--border);
            border-radius: 19px;
            background:
              radial-gradient(
                circle at 88% 12%,
                rgba(112,87,245,.09),
                transparent 30%
              ),
              #fff;
            box-shadow:
              0 14px 36px
              rgba(31,27,48,.03);
          }

          .hours-page-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .hours-page-hero h1 {
            margin: 5px 0 4px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .hours-page-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .hours-page-hero-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
          }

          .hours-page-hero-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          @media (max-width: 640px) {
            .hours-page {
              padding: 18px 12px 46px;
            }

            .hours-page-hero {
              padding: 19px;
              flex-direction: column;
              align-items: stretch;
            }

            .hours-page-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
              width: 100%;
            }

            .hours-page-hero h1 {
              font-size: 30px;
            }

            .hours-page-hero-actions .btn {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </>
  );
}