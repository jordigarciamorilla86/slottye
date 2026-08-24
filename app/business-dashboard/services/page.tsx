import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

import ServicesManager from "./ServicesManager";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function ServicesPage({
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
    data: services,
  } =
    await supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        duration_minutes,
        active
      `)
      .eq(
        "business_id",
        business.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  return (
    <>
      <Header />

      <main className="services-page">
        <div className="services-page-shell">
          <section className="services-page-hero">
            <div>
              <span className="services-page-kicker">
                Configuración
              </span>

              <h1>
                Servicios
              </h1>

              <p>
                Gestiona los servicios que ofrece {business.name}.
              </p>
            </div>

            <div className="services-page-actions">
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

          <ServicesManager
            businessId={
              business.id
            }
            initialServices={
              services ??
              []
            }
          />
        </div>

        <style>{`
          .services-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .services-page-shell {
            width: min(1180px,100%);
            margin: 0 auto;
          }

          .services-page-hero {
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

          .services-page-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .services-page-hero h1 {
            margin: 6px 0 5px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .services-page-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .services-page-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: wrap;
          }

          .services-page-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          @media (max-width: 640px) {
            .services-page {
              padding: 18px 12px 46px;
            }

            .services-page-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .services-page-hero h1 {
              font-size: 30px;
            }

            .services-page-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .services-page-actions .btn {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </>
  );
}