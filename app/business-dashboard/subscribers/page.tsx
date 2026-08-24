import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  UserRound,
  Users,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

type Props = {
  searchParams: Promise<{
    page?: string;
  }>;
};

const SUBSCRIBERS_PER_PAGE =
  12;

export default async function SubscribersPage({
  searchParams,
}: Props) {
  const {
    page,
  } =
    await searchParams;

  const parsedPage =
    Number.parseInt(
      page ?? "1",
      10
    );

  const currentPage =
    Number.isFinite(
      parsedPage
    ) &&
    parsedPage >
      0
      ? parsedPage
      : 1;

  const {
    supabase,
    user,
    profile,
  } = await requireActiveUser();

  if (profile.role !== "business") {
    redirect("/account");
  }

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug
    `)
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (businessError) {
    console.error(
      "Error loading business:",
      businessError
    );
  }

  if (!business) {
    redirect(
      "/business-dashboard/create"
    );
  }

  /*
   * ============================================================
   * MÉTRICAS
   * ============================================================
   */

  const [
    {
      count:
        totalSubscribersCount,
      error:
        totalSubscribersError,
    },
    {
      count:
        emailSubscribersCount,
      error:
        emailSubscribersError,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "business_subscriptions"
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
          "business_subscriptions"
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
          "email_enabled",
          true
        ),
    ]);

  if (
    totalSubscribersError
  ) {
    console.error(
      "Error counting subscribers:",
      totalSubscribersError
    );
  }

  if (
    emailSubscribersError
  ) {
    console.error(
      "Error counting email subscribers:",
      emailSubscribersError
    );
  }

  const totalSubscribers =
    totalSubscribersCount ??
    0;

  const emailSubscribers =
    emailSubscribersCount ??
    0;

  const withoutEmail =
    Math.max(
      0,
      totalSubscribers -
        emailSubscribers
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalSubscribers /
          SUBSCRIBERS_PER_PAGE
      )
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages
    );

  if (
    currentPage !==
      safePage &&
    totalSubscribers >
      0
  ) {
    redirect(
      `/business-dashboard/subscribers?page=${safePage}`
    );
  }

  /*
   * ============================================================
   * SUSCRIPTORES DE LA PÁGINA ACTUAL
   * ============================================================
   */

  const from =
    (
      safePage -
      1
    ) *
    SUBSCRIBERS_PER_PAGE;

  const to =
    from +
    SUBSCRIBERS_PER_PAGE -
    1;

  const {
    data: subscriptions,
    error: subscriptionsError,
  } = await supabase
    .from(
      "business_subscriptions"
    )
    .select(`
      id,
      user_id,
      business_id,
      email_enabled,
      created_at
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
    )
    .range(
      from,
      to
    );

  if (subscriptionsError) {
    console.error(
      "Error loading subscribers:",
      subscriptionsError
    );
  }

  const subscriberUserIds =
    (subscriptions ?? [])
      .map(
        (subscription) =>
          subscription.user_id
      )
      .filter(Boolean);

  let subscriberProfiles:
    | {
        id: string;
        name: string | null;
      }[]
    | null = [];

  if (
    subscriberUserIds.length >
    0
  ) {
    const {
      data:
        profilesData,
      error:
        subscribersProfilesError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        name
      `)
      .in(
        "id",
        subscriberUserIds
      );

    if (
      subscribersProfilesError
    ) {
      console.error(
        "Error loading subscriber profiles:",
        subscribersProfilesError
      );
    }

    subscriberProfiles =
      profilesData ?? [];
  }

  const profileMap =
    new Map<
      string,
      string | null
    >(
      (
        subscriberProfiles ??
        []
      ).map(
        (subscriberProfile) => [
          subscriberProfile.id,
          subscriberProfile.name,
        ]
      )
    );

  const normalizedSubscribers =
    (
      subscriptions ??
      []
    ).map(
      (subscription) => ({
        id:
          subscription.id,

        userId:
          subscription.user_id,

        name:
          profileMap.get(
            subscription.user_id
          ) ??
          "Usuario de Slottye",

        emailEnabled:
          subscription.email_enabled,

        createdAt:
          subscription.created_at,
      })
    );

  function formatDate(
    value: string
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
      new Date(value)
    );
  }

  return (
    <>
      <Header />

      <main className="subscribers10">
        <div className="subscribers10-shell">
          <section className="subscribers10-hero">
            <div>
              <span className="subscribers10-kicker">
                Comunidad
              </span>

              <h1>
                Suscriptores
              </h1>

              <p>
                Personas que siguen a {business.name} para recibir
                avisos cuando publiques nueva disponibilidad.
              </p>
            </div>

            <div className="subscribers10-hero-actions">
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
            </div>
          </section>

          <section
            className="subscribers10-summary"
            aria-label="Resumen de suscriptores"
          >
            <article>
              <span className="subscribers10-summary-icon">
                <Users
                  size={17}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>

              <div>
                <span>
                  Suscriptores
                </span>

                <strong>
                  {totalSubscribers}
                </strong>
              </div>
            </article>

            <article>
              <span className="subscribers10-summary-icon is-green">
                <Mail
                  size={17}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>

              <div>
                <span>
                  Avisos por email
                </span>

                <strong>
                  {emailSubscribers}
                </strong>
              </div>
            </article>

            <article>
              <span className="subscribers10-summary-icon is-muted">
                <BellOff
                  size={17}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>

              <div>
                <span>
                  Sin email
                </span>

                <strong>
                  {withoutEmail}
                </strong>
              </div>
            </article>
          </section>

          <section className="subscribers10-card">
            <header className="subscribers10-section-head">
              <div>
                <span className="subscribers10-section-label">
                  Seguidores
                </span>

                <h2>
                  Personas suscritas
                </h2>

                <p>
                  Los seguidores más recientes aparecen primero.
                </p>
              </div>

              {totalSubscribers > 0 && (
                <span className="subscribers10-count">
                  {totalSubscribers}{" "}
                  {totalSubscribers === 1
                    ? "suscriptor"
                    : "suscriptores"}
                </span>
              )}
            </header>

            {normalizedSubscribers.length >
            0 ? (
              <>
                <div className="subscribers10-list">
                  <div
                    className="subscribers10-list-head"
                    aria-hidden="true"
                  >
                    <span>
                      Suscriptor
                    </span>

                    <span>
                      Fecha de suscripción
                    </span>

                    <span>
                      Avisos
                    </span>
                  </div>

                  {normalizedSubscribers.map(
                    (
                      subscriber
                    ) => (
                      <article
                        className="subscribers10-row"
                        key={
                          subscriber.id
                        }
                      >
                        <div className="subscribers10-person">
                          <span className="subscribers10-avatar">
                            <UserRound
                              size={17}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </span>

                          <div>
                            <strong>
                              {subscriber.name}
                            </strong>

                            <span>
                              Usuario de Slottye
                            </span>
                          </div>
                        </div>

                        <div className="subscribers10-date">
                          <strong>
                            {formatDate(
                              subscriber.createdAt
                            )}
                          </strong>
                        </div>

                        <div className="subscribers10-status-wrap">
                          <span
                            className={
                              subscriber.emailEnabled
                                ? "subscribers10-status is-enabled"
                                : "subscribers10-status is-disabled"
                            }
                          >
                            {subscriber.emailEnabled ? (
                              <Bell
                                size={13}
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                            ) : (
                              <BellOff
                                size={13}
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                            )}

                            {subscriber.emailEnabled
                              ? "Avisos activados"
                              : "Avisos desactivados"}
                          </span>
                        </div>
                      </article>
                    )
                  )}
                </div>

                {totalPages >
                1 && (
                  <nav
                    className="subscribers10-pagination"
                    aria-label="Paginación de suscriptores"
                  >
                    {safePage >
                    1 ? (
                      <Link
                        href={`/business-dashboard/subscribers?page=${safePage - 1}`}
                        className="btn"
                      >
                        <ChevronLeft
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        Anterior
                      </Link>
                    ) : (
                      <span className="btn is-disabled">
                        <ChevronLeft
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        Anterior
                      </span>
                    )}

                    <span className="subscribers10-page-info">
                      Página {safePage} de {totalPages}
                    </span>

                    {safePage <
                    totalPages ? (
                      <Link
                        href={`/business-dashboard/subscribers?page=${safePage + 1}`}
                        className="btn"
                      >
                        Siguiente

                        <ChevronRight
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </Link>
                    ) : (
                      <span className="btn is-disabled">
                        Siguiente

                        <ChevronRight
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="subscribers10-empty">
                <span className="subscribers10-empty-icon">
                  <Users
                    size={22}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <h3>
                    Aún no tienes suscriptores
                  </h3>

                  <p>
                    Cuando alguien siga tu negocio desde la ficha
                    pública aparecerá aquí.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <style>{`
          .subscribers10 {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .subscribers10-shell {
            width: min(1180px, 100%);
            margin: 0 auto;
          }

          .subscribers10-hero {
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

          .subscribers10-kicker,
          .subscribers10-section-label {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .subscribers10-hero h1 {
            margin: 6px 0 5px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .subscribers10-hero p {
            max-width: 700px;
            margin: 0;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.5;
          }

          .subscribers10-hero-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: wrap;
          }

          .subscribers10-hero-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          .subscribers10-summary {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 14px;
          }

          .subscribers10-summary article {
            min-height: 86px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px 17px;
            border: 1px solid var(--border);
            border-radius: 15px;
            background: #fff;
            box-shadow:
              0 10px 28px
              rgba(31,27,48,.02);
          }

          .subscribers10-summary-icon,
          .subscribers10-avatar,
          .subscribers10-empty-icon {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .subscribers10-summary-icon {
            width: 36px;
            height: 36px;
            flex: 0 0 36px;
            border-radius: 11px;
            background: #f0ecff;
            color: var(--accent);
          }

          .subscribers10-summary-icon.is-green {
            background: #eaf8ef;
            color: #2f8b55;
          }

          .subscribers10-summary-icon.is-muted {
            background: #f1f1f4;
            color: #74717d;
          }

          .subscribers10-summary article > div > span {
            display: block;
            color: var(--muted);
            font-size: 10.5px;
            font-weight: 700;
          }

          .subscribers10-summary strong {
            display: block;
            margin-top: 3px;
            font-size: 22px;
            line-height: 1;
          }

          .subscribers10-card {
            margin-top: 18px;
            overflow: hidden;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: #fff;
            box-shadow:
              0 14px 34px
              rgba(31,27,48,.025);
          }

          .subscribers10-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 18px 20px 16px;
            border-bottom: 1px solid #efedf2;
          }

          .subscribers10-section-head h2 {
            margin: 4px 0 4px;
            font-size: 20px;
            letter-spacing: -.025em;
          }

          .subscribers10-section-head p {
            margin: 0;
            color: var(--muted);
            font-size: 11.5px;
          }

          .subscribers10-count {
            flex: 0 0 auto;
            padding: 6px 9px;
            border: 1px solid #e2ddef;
            border-radius: 999px;
            background: #faf8ff;
            color: var(--accent-dark);
            font-size: 10.5px;
            font-weight: 800;
          }

          .subscribers10-list {
            display: grid;
          }

          .subscribers10-list-head,
          .subscribers10-row {
            display: grid;
            grid-template-columns:
              minmax(220px, 1.2fr)
              minmax(260px, 1fr)
              minmax(190px, auto);
            align-items: center;
            gap: 18px;
          }

          .subscribers10-list-head {
            padding: 9px 18px;
            border-bottom: 1px solid #e9e7ed;
            background: #faf9fc;
          }

          .subscribers10-list-head span {
            color: var(--muted);
            font-size: 9.5px;
            font-weight: 800;
          }

          .subscribers10-list-head span:last-child {
            text-align: right;
          }

          .subscribers10-row {
            min-height: 68px;
            padding: 12px 18px;
            border-bottom: 1px solid #efedf2;
          }

          .subscribers10-row:last-child {
            border-bottom: 0;
          }

          .subscribers10-person {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 11px;
          }

          .subscribers10-avatar {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            border-radius: 10px;
            background: #f0ecff;
            color: var(--accent);
          }

          .subscribers10-avatar svg,
          .subscribers10-summary-icon svg,
          .subscribers10-empty-icon svg {
            display: block;
            margin: 0;
            flex: 0 0 auto;
          }

          .subscribers10-person strong,
          .subscribers10-person > div > span {
            display: block;
          }

          .subscribers10-person strong {
            overflow: hidden;
            font-size: 12px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .subscribers10-person > div > span {
            margin-top: 3px;
            color: var(--muted);
            font-size: 10.5px;
          }

          .subscribers10-date strong {
            font-size: 11.5px;
            font-weight: 700;
          }

          .subscribers10-status-wrap {
            display: flex;
            justify-content: flex-end;
          }

          .subscribers10-status {
            width: fit-content;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            padding: 5px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
          }

          .subscribers10-status.is-enabled {
            border: 1px solid #bfe7cb;
            background: #edf9f1;
            color: #267746;
          }

          .subscribers10-status.is-disabled {
            border: 1px solid #dedde2;
            background: #f5f5f7;
            color: #706d78;
          }

          .subscribers10-pagination {
            display: grid;
            grid-template-columns:
              minmax(112px, auto)
              auto
              minmax(112px, auto);
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 14px 18px;
            border-top: 1px solid #efedf2;
            background: #fff;
          }

          .subscribers10-pagination .btn {
            min-width: 112px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            margin: 0;
            padding: 8px 12px;
            font-size: 11px;
            line-height: 1.2;
          }

          .subscribers10-pagination .btn.is-disabled {
            opacity: .42;
            cursor: default;
            pointer-events: none;
          }

          .subscribers10-page-info {
            min-width: 96px;
            color: var(--muted);
            font-size: 11px;
            font-weight: 750;
            text-align: center;
            white-space: nowrap;
          }

          .subscribers10-empty {
            display: flex;
            align-items: center;
            gap: 13px;
            padding: 22px 20px;
          }

          .subscribers10-empty-icon {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            border-radius: 12px;
            background: #f0ecff;
            color: var(--accent);
          }

          .subscribers10-empty h3 {
            margin: 0 0 4px;
            font-size: 14px;
          }

          .subscribers10-empty p {
            margin: 0;
            color: var(--muted);
            font-size: 11.5px;
          }

          @media (max-width: 760px) {
            .subscribers10 {
              padding: 18px 12px 46px;
            }

            .subscribers10-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .subscribers10-hero h1 {
              font-size: 30px;
            }

            .subscribers10-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .subscribers10-hero-actions .btn {
              width: 100%;
            }

            .subscribers10-summary {
              grid-template-columns: 1fr;
            }

            .subscribers10-section-head {
              align-items: flex-start;
              padding: 16px;
            }

            .subscribers10-list-head {
              display: none;
            }

            .subscribers10-row {
              grid-template-columns: 1fr;
              gap: 10px;
              padding: 14px 16px;
            }

            .subscribers10-status-wrap {
              justify-content: flex-start;
            }

            .subscribers10-date::before {
              content: "Suscrito el ";
              color: var(--muted);
              font-size: 10.5px;
              font-weight: 600;
            }

            .subscribers10-pagination {
              grid-template-columns:
                minmax(0, 1fr)
                auto
                minmax(0, 1fr);
              gap: 8px;
              padding: 12px 14px;
            }

            .subscribers10-pagination .btn {
              width: 100%;
              min-width: 0;
              padding: 8px 9px;
            }

            .subscribers10-page-info {
              min-width: 0;
            }
          }
        `}</style>
      </main>
    </>
  );
}