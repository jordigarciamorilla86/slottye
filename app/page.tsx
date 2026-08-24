import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { NearbyBusinesses } from "@/components/NearbyBusinesses";
import { HomeSearch } from "@/components/HomeSearch";

import {
  Bone,
  Brain,
  Eye,
  Footprints,
  HeartPulse,
  LayoutGrid,
  Scissors,
  Sparkles,
  Stethoscope,
  UserRound,
  Utensils,
} from "lucide-react";

/*
 * ============================================================
 * SEO
 * ============================================================
 */

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://slottye.com";

export const metadata: Metadata = {
  title:
    "Slottye — Encuentra y reserva tu próxima cita",

  description:
    "Encuentra negocios y profesionales cerca de ti, consulta citas disponibles y reserva online de forma rápida y sencilla con Slottye.",

  alternates: {
    canonical: baseUrl,
  },

  openGraph: {
    type: "website",

    locale: "es_ES",

    siteName: "Slottye",

    title:
      "Slottye — Encuentra y reserva tu próxima cita",

    description:
      "Encuentra negocios y profesionales cerca de ti, consulta citas disponibles y reserva online en segundos.",

    url: baseUrl,
  },

  twitter: {
    card: "summary_large_image",

    title:
      "Slottye — Encuentra y reserva tu próxima cita",

    description:
      "Encuentra negocios y profesionales cerca de ti y reserva citas disponibles online.",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/*
 * ============================================================
 * HOME
 * ============================================================
 */


function CategoryIcon({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const value =
    `${slug} ${name}`
      .toLocaleLowerCase(
        "es-ES"
      );

  const props = {
    size: 24,
    strokeWidth: 1.8,
    "aria-hidden": true,
  } as const;

  if (
    value.includes(
      "dent"
    )
  ) {
    return (
      <Stethoscope {...props} />
    );
  }

  if (
    value.includes(
      "estét"
    ) ||
    value.includes(
      "estet"
    )
  ) {
    return (
      <Sparkles {...props} />
    );
  }

  if (
    value.includes(
      "fisio"
    )
  ) {
    return (
      <HeartPulse {...props} />
    );
  }

  if (
    value.includes(
      "masaj"
    )
  ) {
    return (
      <UserRound {...props} />
    );
  }

  if (
    value.includes(
      "nutri"
    )
  ) {
    return (
      <Utensils {...props} />
    );
  }

  if (
    value.includes(
      "oftal"
    ) ||
    value.includes(
      "ojo"
    )
  ) {
    return (
      <Eye {...props} />
    );
  }

  if (
    value.includes(
      "pelu"
    )
  ) {
    return (
      <Scissors {...props} />
    );
  }

  if (
    value.includes(
      "podol"
    )
  ) {
    return (
      <Footprints {...props} />
    );
  }

  if (
    value.includes(
      "psic"
    )
  ) {
    return (
      <Brain {...props} />
    );
  }

  if (
    value.includes(
      "veter"
    )
  ) {
    return (
      <Bone {...props} />
    );
  }

  if (
    value.includes(
      "medic"
    ) ||
    value.includes(
      "salud"
    )
  ) {
    return (
      <Stethoscope {...props} />
    );
  }

  return (
    <LayoutGrid
      {...props}
    />
  );
}

export default async function Home() {
  const supabase =
    await createClient();

  /*
   * ============================================================
   * CATEGORÍAS
   * ============================================================
   */

  const {
    data: categories,
    error: categoriesError,
  } =
    await supabase
      .from("categories")
      .select(
        "id, name, slug, icon"
      )
      .eq("active", true)
      .order("name");

  /*
   * ============================================================
   * NEGOCIOS
   * ============================================================
   */

  const {
    data: businesses,
    error: businessesError,
  } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        description,
        address,
        city,
        phone,
        website,
        latitude,
        longitude,
        category_id,

        business_images (
          image_url,
          position
        ),

        reviews (
          rating
        ),

        slots (
          id,
          status,
          start_at
        )
      `)
      .eq(
        "active",
        true
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(20);

  if (
    categoriesError
  ) {
    console.error(
      "Error loading categories:",
      categoriesError
    );
  }

  if (
    businessesError
  ) {
    console.error(
      "Error loading businesses:",
      businessesError
    );
  }

  const sortedCategories =
    [...(categories ?? [])].sort(
      (a, b) => {
        const aIsOther =
          a.name
            .trim()
            .toLocaleLowerCase("es-ES") ===
          "otros";

        const bIsOther =
          b.name
            .trim()
            .toLocaleLowerCase("es-ES") ===
          "otros";

        if (aIsOther && !bIsOther) {
          return 1;
        }

        if (!aIsOther && bIsOther) {
          return -1;
        }

        return a.name.localeCompare(
          b.name,
          "es-ES"
        );
      }
    );

  const now =
    new Date();

  /*
   * ============================================================
   * NORMALIZAR NEGOCIOS
   * ============================================================
   */

  const normalizedBusinesses =
    (
      businesses ??
      []
    ).map(
      (
        business
      ) => {
        /*
         * ========================================================
         * IMAGEN DE PORTADA
         * ========================================================
         */

        const images =
          Array.isArray(
            business.business_images
          )
            ? business.business_images
            : [];

        const imageUrl =
          [
            ...images,
          ]
            .sort(
              (
                a,
                b
              ) =>
                (
                  a.position ??
                  0
                ) -
                (
                  b.position ??
                  0
                )
            )[0]
            ?.image_url ??
          null;

        /*
         * ========================================================
         * RESEÑAS
         * ========================================================
         */

        const reviews =
          Array.isArray(
            business.reviews
          )
            ? business.reviews
            : [];

        const reviewCount =
          reviews.length;

        const averageRating =
          reviewCount >
          0
            ? reviews.reduce(
                (
                  total,
                  review
                ) =>
                  total +
                  review.rating,
                0
              ) /
              reviewCount
            : null;

        /*
         * ========================================================
         * CITAS DISPONIBLES
         * ========================================================
         */

        const slots =
          Array.isArray(
            business.slots
          )
            ? business.slots
            : [];

        const availableSlots =
          slots
            .filter(
              (
                slot
              ) =>
                slot.status ===
                  "AVAILABLE" &&
                new Date(
                  slot.start_at
                ) >
                  now
            )
            .sort(
              (
                a,
                b
              ) =>
                new Date(
                  a.start_at
                ).getTime() -
                new Date(
                  b.start_at
                ).getTime()
            );

        const hasAvailableSlots =
          availableSlots.length >
          0;

        const nextAvailableAt =
          availableSlots[0]
            ?.start_at ??
          null;

        /*
         * ========================================================
         * OBJETO NORMALIZADO
         * ========================================================
         */

        return {
          id:
            business.id,

          slug:
            business.slug,

          name:
            business.name,

          description:
            business.description ??
            "",

          address:
            business.address ??
            "",

          city:
            business.city ??
            "",

          phone:
            business.phone ??
            "",

          website:
            business.website ??
            "",

          latitude:
            business.latitude,

          longitude:
            business.longitude,

          imageUrl,

          averageRating,

          reviewCount,

          hasAvailableSlots,

          nextAvailableAt,
        };
      }
    );

  /*
   * ============================================================
   * SEO - JSON-LD WEBSITE
   * ============================================================
   */

  const websiteJsonLd =
    {
      "@context":
        "https://schema.org",

      "@type":
        "WebSite",

      "@id":
        `${baseUrl}/#website`,

      url:
        baseUrl,

      name:
        "Slottye",

      alternateName:
        "Slottye Reservas",

      description:
        "Plataforma para encontrar negocios y profesionales, consultar citas disponibles y reservar online.",

      inLanguage:
        "es-ES",

      publisher: {
        "@id":
          `${baseUrl}/#organization`,
      },

      potentialAction: {
        "@type":
          "SearchAction",

        target: {
          "@type":
            "EntryPoint",

          urlTemplate:
            `${baseUrl}/category/todos?q={search_term_string}`,
        },

        "query-input":
          "required name=search_term_string",
      },
    };

  /*
   * ============================================================
   * SEO - JSON-LD ORGANIZATION
   * ============================================================
   */

  const organizationJsonLd =
    {
      "@context":
        "https://schema.org",

      "@type":
        "Organization",

      "@id":
        `${baseUrl}/#organization`,

      name:
        "Slottye",

      url:
        baseUrl,

      email:
        "contacto@slottye.com",

      contactPoint: {
        "@type":
          "ContactPoint",

        email:
          "contacto@slottye.com",

        contactType:
          "customer support",

        availableLanguage: [
          "Spanish",
          "Catalan",
        ],
      },
    };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              websiteJsonLd
            ).replace(
              /</g,
              "\\u003c"
            ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              organizationJsonLd
            ).replace(
              /</g,
              "\\u003c"
            ),
        }}
      />

      <Header />

      <main className="home4">
        <section className="home4-hero">
          <div className="shell home4-hero-grid">
            <div className="home4-hero-copy">
              <span className="home4-kicker">
                Reservas fáciles,
                negocios cerca
              </span>

              <h1>
                Tu próxima cita,
                <span>
                  {" "}en segundos.
                </span>
              </h1>

              <p className="home4-lead">
                Descubre negocios cerca de ti
                y reserva tu cita sin llamadas
                ni esperas.
              </p>

              <HomeSearch
                categories={
                  sortedCategories
                }
                availabilityInCategory
              />

              <div className="home4-benefits">
                <div>
                  <span className="home4-benefit-icon">
                    ✓
                  </span>

                  <span>
                    <strong>
                      Reserva online
                    </strong>

                    <small>
                      Sin llamadas
                    </small>
                  </span>
                </div>

                <div>
                  <span className="home4-benefit-icon">
                    ✓
                  </span>

                  <span>
                    <strong>
                      Confirmación inmediata
                    </strong>

                    <small>
                      Todo queda registrado
                    </small>
                  </span>
                </div>

                <div>
                  <span className="home4-benefit-icon">
                    ✓
                  </span>

                  <span>
                    <strong>
                      Gestiona tus citas
                    </strong>

                    <small>
                      Desde tu cuenta
                    </small>
                  </span>
                </div>
              </div>
            </div>

            <div
              className="home4-hero-visual"
              aria-hidden="true"
            >
              <div className="home4-visual-blob" />

              <div className="home4-visual-card">
                <div className="home4-visual-card-head">
                  <span className="home4-visual-calendar">
                    <span />
                    <span />
                  </span>

                  <div>
                    <strong>
                      Próximas citas
                    </strong>

                    <small>
                      Reserva en segundos
                    </small>
                  </div>
                </div>

                <div className="home4-visual-slots">
                  <div>
                    <span>
                      Hoy
                    </span>

                    <strong>
                      18:30
                    </strong>
                  </div>

                  <div>
                    <span>
                      Mañana
                    </span>

                    <strong>
                      10:00
                    </strong>
                  </div>

                  <div>
                    <span>
                      Mañana
                    </span>

                    <strong>
                      12:00
                    </strong>
                  </div>

                  <div>
                    <span>
                      Próximamente
                    </span>

                    <strong>
                      Ver citas
                    </strong>
                  </div>
                </div>
              </div>

              <span className="home4-visual-bell">
                !
              </span>

              <span className="home4-visual-check">
                ✓
              </span>
            </div>
          </div>
        </section>

        <section className="home4-categories">
          <div className="shell">
            <div className="home4-section-row">
              <h2>
                Explora por categoría
              </h2>

              <Link
                href="/category/todos"
                className="home4-section-link"
              >
                Ver todas las categorías
                <span aria-hidden="true">
                  →
                </span>
              </Link>
            </div>

            <div className="home4-category-grid">
              {sortedCategories.map(
                (
                  category
                ) => (
                  <Link
                    className="home4-category-card"
                    href={`/category/${category.slug}`}
                    key={
                      category.id
                    }
                  >
                    <span className="home4-category-icon">
                      <CategoryIcon
                        slug={
                          category.slug
                        }
                        name={
                          category.name
                        }
                      />
                    </span>

                    <strong>
                      {
                        category.name
                      }
                    </strong>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>

        <section className="home4-market">
          <div className="shell">
            <div className="home4-market-head">
              <div className="home4-market-title">
                <h2>
                  Negocios cerca de ti
                </h2>

                <span>
                  {
                    normalizedBusinesses.length
                  }{" "}
                  {normalizedBusinesses.length ===
                  1
                    ? "resultado"
                    : "resultados"}
                </span>
              </div>

              <Link
                className="home4-section-link"
                href="/category/todos"
              >
                Ver todos
                <span aria-hidden="true">
                  →
                </span>
              </Link>
            </div>

            {normalizedBusinesses.length >
            0 ? (
              <NearbyBusinesses
                businesses={
                  normalizedBusinesses
                }
              />
            ) : (
              <div className="panel home4-empty">
                <p className="muted">
                  Todavía no hay negocios
                  publicados.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}