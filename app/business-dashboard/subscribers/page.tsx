import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function SubscribersPage() {
  const supabase =
    await createClient();

  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * PERFIL
   * ============================================================
   */

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        role
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Error loading profile:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !==
      "business"
  ) {
    redirect("/account");
  }

  /*
   * ============================================================
   * NEGOCIO DEL PROPIETARIO
   * ============================================================
   */

  const {
    data: business,
    error: businessError,
  } =
    await supabase
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
   * SUSCRIPCIONES
   * ============================================================
   *
   * Primero cargamos SOLO business_subscriptions.
   * No hacemos join con profiles para evitar
   * problemas de relaciones/FK.
   */

  const {
    data: subscriptions,
    error: subscriptionsError,
  } =
    await supabase
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
      );

  if (subscriptionsError) {
    console.error(
      "Error loading subscribers:",
      subscriptionsError
    );
  }

  /*
   * ============================================================
   * PERFILES DE LOS SUSCRIPTORES
   * ============================================================
   */

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
    } =
      await supabase
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

  /*
   * ============================================================
   * MAPA ID → NOMBRE
   * ============================================================
   */

  const profileMap =
    new Map<
      string,
      string | null
    >(
      (
        subscriberProfiles ??
        []
      ).map(
        (profile) => [
          profile.id,
          profile.name,
        ]
      )
    );

  /*
   * ============================================================
   * NORMALIZAR
   * ============================================================
   */

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

  /*
   * ============================================================
   * MÉTRICAS
   * ============================================================
   */

  const totalSubscribers =
    normalizedSubscribers.length;

  const emailSubscribers =
    normalizedSubscribers.filter(
      (subscriber) =>
        subscriber.emailEnabled
    ).length;

  const withoutEmail =
    totalSubscribers -
    emailSubscribers;

  /*
   * ============================================================
   * FORMATO FECHA
   * ============================================================
   */

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
          maxWidth: 900,
        }}
      >
        {/* CABECERA */}

        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Suscriptores
          </h1>

          <p className="muted">
            Personas que siguen a{" "}
            <strong>
              {business.name}
            </strong>{" "}
            para recibir avisos de
            disponibilidad.
          </p>
        </section>

        {/* ======================================================
            RESUMEN
            ====================================================== */}

        <section className="section">
          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",

              gap: 10,
            }}
          >
            <div
              className="panel"
              style={{
                padding: 14,
              }}
            >
              <div className="muted">
                Suscriptores
              </div>

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {
                  totalSubscribers
                }
              </div>
            </div>

            <div
              className="panel"
              style={{
                padding: 14,
              }}
            >
              <div className="muted">
                Avisos por email
              </div>

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {
                  emailSubscribers
                }
              </div>
            </div>

            <div
              className="panel"
              style={{
                padding: 14,
              }}
            >
              <div className="muted">
                Sin email
              </div>

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {
                  withoutEmail
                }
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            LISTA
            ====================================================== */}

        <section className="section">
          <div className="section-head">
            <div>
              <h2>
                Seguidores
              </h2>

              <p className="muted">
                Los más recientes
                aparecen primero.
              </p>
            </div>
          </div>

          {normalizedSubscribers.length >
          0 ? (
            <div
              style={{
                display:
                  "grid",

                gap: 10,
              }}
            >
              {normalizedSubscribers.map(
                (
                  subscriber
                ) => (
                  <div
                    className="card"

                    key={
                      subscriber.id
                    }
                  >
                    <div
                      className="card-body"

                      style={{
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "center",

                          gap: 12,

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              fontSize:
                                17,
                            }}
                          >
                            {
                              subscriber.name
                            }
                          </strong>

                          <div
                            className="muted"

                            style={{
                              marginTop:
                                5,
                            }}
                          >
                            Suscrito el{" "}
                            {formatDate(
                              subscriber.createdAt
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            padding:
                              "7px 10px",

                            borderRadius:
                              999,

                            border:
                              "1px solid var(--border)",

                            fontSize:
                              13,

                            fontWeight:
                              700,
                          }}
                        >
                          {subscriber.emailEnabled
                            ? "✉️ Avisos activados"
                            : "🔕 Avisos desactivados"}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="panel">
              <h3>
                Aún no tienes
                suscriptores
              </h3>

              <p className="muted">
                Cuando alguien siga
                tu negocio desde la
                ficha pública
                aparecerá aquí.
              </p>
            </div>
          )}
        </section>

        {/* ======================================================
            VOLVER
            ====================================================== */}

        <section className="section">
          <Link
            href="/business-dashboard"
            className="btn"
          >
            ← Volver al panel
          </Link>
        </section>
      </main>
    </>
  );
}