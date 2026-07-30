import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { NearbyBusinesses } from "@/components/NearbyBusinesses";

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

        const hasAvailableSlots =
          slots.some(
            (
              slot
            ) =>
              slot.status ===
                "AVAILABLE" &&
              new Date(
                slot.start_at
              ) >
                now
          );

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
      {/* ======================================================
          SEO JSON-LD
          ====================================================== */}

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

      <main>
        {/* ======================================================
            HERO
            ====================================================== */}

        <section className="shell hero">
          <span className="kicker">
            Reservas fáciles,
            negocios cerca
          </span>

          <h1>
            Tu próxima cita, en segundos.
          </h1>

          <p className="lead">
            Busca negocios cerca de ti,
            encuentra un hueco disponible
            y reserva sin llamadas ni
            esperas.
          </p>

          <form
            className="search"
            action="/category/todos"
          >
            <input
              name="q"
              placeholder="Buscar dentista, peluquería, psicólogo..."
            />

            <button>
              Buscar
            </button>
          </form>
        </section>

        {/* ======================================================
            CATEGORÍAS
            ====================================================== */}

        <section className="shell section">
          <div className="section-head">
            <div>
              <h2>
                Explora por categoría
              </h2>

              <div className="muted">
                Encuentra justo lo que
                necesitas.
              </div>
            </div>
          </div>

          <div className="category-grid">
            {(categories ?? []).map(
              (
                category
              ) => (
                <Link
                  className="category"
                  href={`/category/${category.slug}`}
                  key={
                    category.id
                  }
                >
                  <div className="category-icon">
                    {
                      category.icon
                    }
                  </div>

                  <strong>
                    {
                      category.name
                    }
                  </strong>
                </Link>
              )
            )}
          </div>
        </section>

        {/* ======================================================
            NEGOCIOS
            ====================================================== */}

        <section className="shell section">
          <div className="section-head">
            <div>
              <h2>
                Negocios cerca de ti
              </h2>

              <div className="muted">
                Descubre negocios
                disponibles en Slottye.
              </div>
            </div>

            <Link
              className="muted"
              href="/category/todos"
            >
              Ver todos →
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
            <div className="panel">
              <p className="muted">
                Todavía no hay negocios
                publicados.
              </p>
            </div>
          )}
        </section>

        {/* ======================================================
            INFORMACIÓN DE SLOTTYE
            ====================================================== */}

        <section
          className="shell"
          style={{
            marginTop:
              40,

            paddingTop:
              28,

            paddingBottom:
              28,

            borderTop:
              "1px solid var(--border)",

            borderBottom:
              "1px solid var(--border)",
          }}
        >
          <div
            style={{
              maxWidth:
                900,

              margin:
                "0 auto",
            }}
          >
            <h2
              style={{
                fontSize:
                  18,

                margin:
                  "0 0 10px",

                letterSpacing:
                  "-0.02em",
              }}
            >
              Slottye — plataforma de reservas online
            </h2>

            <p
              className="muted"
              style={{
                fontSize:
                  14,

                lineHeight:
                  1.65,

                margin:
                  "0 0 12px",
              }}
            >
              Slottye es una plataforma online para encontrar negocios y
              profesionales, consultar sus citas disponibles y reservar
              directamente por Internet.
            </p>

            <p
              className="muted"
              style={{
                fontSize:
                  14,

                lineHeight:
                  1.65,

                margin:
                  0,
              }}
            >
              Puedes crear una cuenta o iniciar sesión con Google para
              identificarte de forma segura y gestionar tus reservas,
              negocios favoritos y citas desde tu cuenta de Slottye. Al
              iniciar sesión con Google, Slottye utiliza la información
              básica de tu cuenta necesaria para identificarte, como tu
              dirección de correo electrónico y los datos básicos de tu
              perfil proporcionados durante el inicio de sesión.
            </p>

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  10,

                marginTop:
                  14,

                fontSize:
                  13,
              }}
            >
              <Link href="/privacy">
                Política de privacidad
              </Link>

              <span className="muted">
                ·
              </span>

              <Link href="/terms">
                Términos y condiciones
              </Link>
            </div>
          </div>
        </section>
      </main>

    </>
  );
}