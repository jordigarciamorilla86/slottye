import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { BusinessBookingSection } from "@/components/BusinessBookingSection";
import { BusinessSubscriptionButton } from "@/components/BusinessSubscriptionButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import PublicBusinessMap from "@/components/PublicBusinessMap";

type Props = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    slot?: string;
  }>;
};



/*
 * ============================================================
 * BASE URL
 * ============================================================
 */

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://slottye.com";

/*
 * ============================================================
 * METADATA
 * ============================================================
 */

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const supabase =
    await createClient();

  const {
    data: business,
    error,
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      description,
      address,
      city,
      postal_code,
      slug,
      category_id,

      business_images (
        image_url,
        position
      )
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Error loading business metadata:",
      error
    );
  }

  if (!business) {
    return {
      title:
        "Negocio no encontrado",

      description:
        "El negocio que buscas no está disponible en Slottye.",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  /*
   * ============================================================
   * CATEGORÍA
   * ============================================================
   */

  let categoryName:
    | string
    | null = null;

  if (
    business.category_id
  ) {
    const {
      data: category,
    } = await supabase
      .from("categories")
      .select("name")
      .eq(
        "id",
        business.category_id
      )
      .maybeSingle();

    categoryName =
      category?.name ??
      null;
  }

  /*
   * ============================================================
   * TÍTULO SEO
   * ============================================================
   */

  const titleParts = [
    business.name,
    categoryName,
    business.city,
  ].filter(Boolean);

  const seoTitle =
    titleParts.join(
      " · "
    );

  /*
   * ============================================================
   * DESCRIPCIÓN SEO
   * ============================================================
   */

  const description =
    business.description
      ?.trim()
      ? business.description
          .trim()
          .slice(
            0,
            160
          )
      : business.city
        ? `Consulta los servicios y citas disponibles de ${business.name} en ${business.city} y reserva online con Slottye.`
        : `Consulta los servicios y citas disponibles de ${business.name} y reserva online con Slottye.`;

  /*
   * ============================================================
   * IMAGEN PRINCIPAL
   * ============================================================
   */

  const images =
    Array.isArray(
      business.business_images
    )
      ? business.business_images
      : [];

  const mainImage =
    [...images]
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
   * ============================================================
   * URL CANÓNICA
   * ============================================================
   */

  const businessUrl =
    `${baseUrl}/business/${business.slug}`;

  /*
   * ============================================================
   * METADATA FINAL
   * ============================================================
   */

  return {
    title:
      seoTitle,

    description,

    alternates: {
      canonical:
        businessUrl,
    },

    openGraph: {
      type:
        "website",

      locale:
        "es_ES",

      siteName:
        "Slottye",

      title:
        `${seoTitle} | Slottye`,

      description,

      url:
        businessUrl,

      ...(mainImage
        ? {
            images: [
              {
                url:
                  mainImage,

                alt:
                  business.name,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card:
        "summary_large_image",

      title:
        `${seoTitle} | Slottye`,

      description,

      ...(mainImage
        ? {
            images: [
              mainImage,
            ],
          }
        : {}),
    },

    robots: {
      index:
        true,

      follow:
        true,

      googleBot: {
        index:
          true,

        follow:
          true,

        "max-image-preview":
          "large",

        "max-snippet":
          -1,

        "max-video-preview":
          -1,
      },
    },
  };
}

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

export default async function BusinessPage({
  params,
  searchParams,
}: Props) {
  const {
    slug,
  } =
    await params;

  const {
    slot:
      requestedSlotId,
  } =
    await searchParams;

  const supabase =
    await createClient();

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data: business,
    error,
  } = await supabase
    .from("businesses")
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
      latitude,
      longitude,
      category_id,
      google_place_id,
      show_google_reviews
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Error loading business:",
      error
    );
  }

  if (!business) {
    notFound();
  }

  /*
   * ============================================================
   * GOOGLE MAPS
   * ============================================================
   */

  let googleRating:
    | number
    | null = null;

  let googleReviewCount =
    0;

  let googleMapsUrl:
    | string
    | null = null;

  if (
    business.google_place_id &&
    business.show_google_reviews
  ) {
    try {
      const apiKey =
        process.env
          .GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.error(
          "GOOGLE_MAPS_API_KEY no está configurada"
        );
      } else {
        const googleResponse =
          await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(
              business.google_place_id
            )}`,
            {
              method:
                "GET",

              headers: {
                "X-Goog-Api-Key":
                  apiKey,

                "X-Goog-FieldMask":
                  [
                    "rating",
                    "userRatingCount",
                    "googleMapsUri",
                  ].join(
                    ","
                  ),
              },

              next: {
                revalidate:
                  3600,
              },
            }
          );

        if (
          googleResponse.ok
        ) {
          const place =
            await googleResponse.json();

          googleRating =
            place.rating ??
            null;

          googleReviewCount =
            place.userRatingCount ??
            0;

          googleMapsUrl =
            place.googleMapsUri ??
            null;
        } else {
          console.error(
            "Error loading Google rating:",
            await googleResponse.text()
          );
        }
      }
    } catch (
      googleError
    ) {
      console.error(
        "Error loading Google rating:",
        googleError
      );
    }
  }

  /*
   * ============================================================
   * IMÁGENES
   * ============================================================
   */

  const {
    data: images,
  } =
    await supabase
      .from(
        "business_images"
      )
      .select(`
        id,
        image_url,
        position
      `)
      .eq(
        "business_id",
        business.id
      )
      .order(
        "position",
        {
          ascending:
            true,
        }
      );

  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  /*
   * ============================================================
   * FAVORITO
   * ============================================================
   */

  let isFavorite =
    false;

  if (user) {
    const {
      data: favorite,
    } =
      await supabase
        .from(
          "favorites"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

    isFavorite =
      !!favorite;
  }

  /*
   * ============================================================
   * SUSCRIPCIÓN
   * ============================================================
   */

  let subscribed =
    false;

  if (user) {
    const {
      data:
        subscription,
    } =
      await supabase
        .from(
          "business_subscriptions"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

    subscribed =
      !!subscription;
  }

  /*
   * ============================================================
   * CATEGORÍA
   * ============================================================
   */

  const {
    data: category,
  } =
    business.category_id
      ? await supabase
          .from(
            "categories"
          )
          .select(
            "name"
          )
          .eq(
            "id",
            business.category_id
          )
          .maybeSingle()
      : {
          data:
            null,
        };

  /*
   * ============================================================
   * SERVICIOS
   * ============================================================
   */

  const {
    data: services,
  } =
    await supabase
      .from(
        "services"
      )
      .select(`
        id,
        name,
        description,
        duration_minutes
      `)
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
/*
 * ============================================================
 * CITA SOLICITADA DESDE EL BUSCADOR DE DISPONIBILIDAD
 * ============================================================
 */

let requestedSlot:
  | {
      id: string;
      service_id: string | null;
      start_at: string;
      end_at: string;
      status: string;
    }
  | null =
  null;

if (
  typeof requestedSlotId ===
    "string" &&
  requestedSlotId
) {
  const {
    data:
      requestedSlotData,
    error:
      requestedSlotError,
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
        "id",
        requestedSlotId
      )
      .eq(
        "business_id",
        business.id
      )
      .eq(
        "status",
        "AVAILABLE"
      )
      .gte(
        "start_at",
        new Date()
          .toISOString()
      )
      .maybeSingle();

  if (
    requestedSlotError
  ) {
    console.error(
      "Error loading requested slot:",
      requestedSlotError
    );
  }

  requestedSlot =
    requestedSlotData ??
    null;
}
  /*
   * ============================================================
   * HORARIOS
   * ============================================================
   */

  const {
    data: hours,
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

  
  /*
   * ============================================================
   * RESEÑAS SLOTTYE
   * ============================================================
   */

  const {
    data: reviews,
    error: reviewsError,
  } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      profiles (
        name
      )
    `)
    .eq("business_id", business.id)
    .eq("visible", true)
    .order("created_at", {
      ascending: false,
    });

  if (
    reviewsError
  ) {
    console.error(
      "Error loading reviews:",
      reviewsError
    );
  }

  const reviewCount =
    reviews?.length ??
    0;

  const averageRating =
    reviewCount >
    0
      ? (
          reviews ??
          []
        ).reduce(
          (
            total,
            review
          ) =>
            total +
            review.rating,
          0
        ) /
        reviewCount
      : 0;

  /*
   * ============================================================
   * DIRECCIÓN
   * ============================================================
   */

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

  /*
   * ============================================================
   * HORARIO / ABIERTO AHORA
   * ============================================================
   */

  const DAY_NAMES =
    [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];

  const SCHEMA_DAY_NAMES =
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

  function formatTime(
    value:
      | string
      | null
  ) {
    return (
      value?.slice(
        0,
        5
      ) ??
      ""
    );
  }

  function getMadridDayIndex() {
    const dayName =
      new Intl.DateTimeFormat(
        "en-US",
        {
          weekday:
            "long",

          timeZone:
            "Europe/Madrid",
        }
      ).format(
        new Date()
      );

    const map:
      Record<
        string,
        number
      > = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };

    return map[
      dayName
    ];
  }

  function getMadridTime() {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date()
    );
  }

  function getOpenStatus() {
    if (
      !hours?.length
    ) {
      return null;
    }

    const todayIndex =
      getMadridDayIndex();

    const today =
      hours.find(
        (
          hour
        ) =>
          hour.day_of_week ===
          todayIndex
      );

    if (
      !today ||
      today.closed
    ) {
      return {
        open:
          false,

        text:
          "Cerrado hoy",
      };
    }

    const now =
      getMadridTime();

    const firstOpen =
      formatTime(
        today.open_time
      );

    const firstClose =
      formatTime(
        today.close_time
      );

    const secondOpen =
      formatTime(
        today.open_time_2
      );

    const secondClose =
      formatTime(
        today.close_time_2
      );

    if (
      firstOpen &&
      firstClose &&
      now >=
        firstOpen &&
      now <
        firstClose
    ) {
      return {
        open:
          true,

        text:
          `Abierto ahora · Cierra a las ${firstClose}`,
      };
    }

    if (
      secondOpen &&
      secondClose &&
      now >=
        secondOpen &&
      now <
        secondClose
    ) {
      return {
        open:
          true,

        text:
          `Abierto ahora · Cierra a las ${secondClose}`,
      };
    }

    if (
      secondOpen &&
      now <
        secondOpen &&
      now >=
        firstClose
    ) {
      return {
        open:
          false,

        text:
          `Cerrado ahora · Abre a las ${secondOpen}`,
      };
    }

    if (
      firstOpen &&
      now <
        firstOpen
    ) {
      return {
        open:
          false,

        text:
          `Cerrado ahora · Abre a las ${firstOpen}`,
      };
    }

    return {
      open:
        false,

      text:
        "Cerrado ahora",
    };
  }

  const openStatus =
    getOpenStatus();

  /*
   * ============================================================
   * SEO - URL NEGOCIO
   * ============================================================
   */

  const businessUrl =
    `${baseUrl}/business/${business.slug}`;

  /*
   * ============================================================
   * SEO - HORARIOS SCHEMA.ORG
   * ============================================================
   */

  const openingHoursSpecification =
    (hours ?? [])
      .filter(
        (
          hour
        ) =>
          !hour.closed &&
          hour.open_time &&
          hour.close_time
      )
      .flatMap(
        (
          hour
        ) => {
          const dayOfWeek =
            SCHEMA_DAY_NAMES[
              hour.day_of_week
            ];

          const result:
            {
              "@type":
                string;

              dayOfWeek:
                string;

              opens:
                string;

              closes:
                string;
            }[] = [];

          if (
            hour.open_time &&
            hour.close_time
          ) {
            result.push(
              {
                "@type":
                  "OpeningHoursSpecification",

                dayOfWeek,

                opens:
                  formatTime(
                    hour.open_time
                  ),

                closes:
                  formatTime(
                    hour.close_time
                  ),
              }
            );
          }

          if (
            hour.open_time_2 &&
            hour.close_time_2
          ) {
            result.push(
              {
                "@type":
                  "OpeningHoursSpecification",

                dayOfWeek,

                opens:
                  formatTime(
                    hour.open_time_2
                  ),

                closes:
                  formatTime(
                    hour.close_time_2
                  ),
              }
            );
          }

          return result;
        }
      );

  /*
   * ============================================================
   * SEO - SERVICIOS SCHEMA.ORG
   * ============================================================
   */

  const serviceJsonLd =
    (
      services ??
      []
    ).map(
      (
        service
      ) => ({
        "@type":
          "Service",

        name:
          service.name,

        ...(service.description
          ? {
              description:
                service.description,
            }
          : {}),

        provider: {
          "@id":
            `${businessUrl}#business`,
        },

        areaServed:
          business.city
            ? {
                "@type":
                  "City",

                name:
                  business.city,
              }
            : undefined,

        url:
          businessUrl,
      })
    );

  /*
   * ============================================================
   * SEO - LOCALBUSINESS JSON-LD
   * ============================================================
   */

  const jsonLd = {
    "@context":
      "https://schema.org",

    "@type":
      "LocalBusiness",

    "@id":
      `${businessUrl}#business`,

    name:
      business.name,

    url:
      businessUrl,

    ...(category?.name
      ? {
          category:
            category.name,
        }
      : {}),

    ...(business.description
      ? {
          description:
            business.description,
        }
      : {}),

    ...(business.phone
      ? {
          telephone:
            business.phone,
        }
      : {}),

    ...(business.email
      ? {
          email:
            business.email,
        }
      : {}),

    ...(business.website
      ? {
          sameAs: [
            business.website,
          ],
        }
      : {}),

    address: {
      "@type":
        "PostalAddress",

      ...(business.address
        ? {
            streetAddress:
              business.address,
          }
        : {}),

      ...(business.city
        ? {
            addressLocality:
              business.city,
          }
        : {}),

      ...(business.postal_code
        ? {
            postalCode:
              business.postal_code,
          }
        : {}),

      addressCountry:
        "ES",
    },

    ...(business.latitude !==
      null &&
    business.longitude !==
      null
      ? {
          geo: {
            "@type":
              "GeoCoordinates",

            latitude:
              business.latitude,

            longitude:
              business.longitude,
          },
        }
      : {}),

    ...(images &&
    images.length >
      0
      ? {
          image:
            images.map(
              (
                image
              ) =>
                image.image_url
            ),
        }
      : {}),

    ...(openingHoursSpecification.length >
      0
      ? {
          openingHoursSpecification,
        }
      : {}),

    ...(serviceJsonLd.length >
      0
      ? {
          makesOffer:
            serviceJsonLd.map(
              (
                service
              ) => ({
                "@type":
                  "Offer",

                itemOffered:
                  service,
              })
            ),
        }
      : {}),

    /*
     * Solo utilizamos las reseñas
     * verificadas de Slottye.
     */
    ...(reviewCount >
      0
      ? {
          aggregateRating: {
            "@type":
              "AggregateRating",

            ratingValue:
              Number(
                averageRating.toFixed(
                  1
                )
              ),

            reviewCount,

            bestRating:
              5,

            worstRating:
              1,
          },
        }
      : {}),
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
              jsonLd
            ).replace(
              /</g,
              "\\u003c"
            ),
        }}
      />

      <Header />

      <main className="business6-page">
        <div className="business6-shell">
          <nav
            className="business6-breadcrumb"
            aria-label="Migas de pan"
          >
            <Link href="/">
              Explorar
            </Link>

            <span>
              /
            </span>

            {category?.name && (
              <>
                <span>
                  {category.name}
                </span>

                <span>
                  /
                </span>
              </>
            )}

            <strong>
              {business.name}
            </strong>
          </nav>

          <section
            id="resumen"
            className="business6-hero"
          >
            <div
              className="business6-photo"
              style={{ position: "relative" }}
            >
              {images &&
              images.length >
                0 ? (
                <Image
                  src={
                    images[0]
                      .image_url
                  }
                  alt={
                    business.name
                  }
                  fill
                  sizes="(max-width: 900px) 100vw, 42vw"
                  priority
                  unoptimized
                />
              ) : (
                <div className="business6-photo-placeholder">
                  <span>
                    S
                  </span>
                </div>
              )}
            </div>

            <div className="business6-hero-info">
              {category?.name && (
                <span className="business6-category">
                  {category.name}
                </span>
              )}

              <h1>
                {business.name}
              </h1>

              {business.description && (
                <p className="business6-description">
                  {business.description}
                </p>
              )}

              <div className="business6-rating-row">
                {reviewCount >
                0 && (
                  <div className="business6-rating">
                    <span>
                      ★
                    </span>

                    <strong>
                      {averageRating.toFixed(
                        1
                      )}
                    </strong>

                    <small>
                      ({reviewCount} {reviewCount === 1 ? "opinión" : "opiniones"})
                    </small>
                  </div>
                )}

                {openStatus && (
                  <span
                    className={
                      openStatus.open
                        ? "business6-open is-open"
                        : "business6-open is-closed"
                    }
                  >
                    {openStatus.text}
                  </span>
                )}
              </div>

              {business.show_google_reviews &&
                googleRating !==
                  null && (
                <div className="business6-google-rating">
                  <span>
                    Google
                  </span>

                  <strong>
                    ★ {googleRating.toFixed(
                      1
                    )}
                  </strong>

                  <small>
                    {googleReviewCount} {googleReviewCount === 1 ? "reseña" : "reseñas"}
                  </small>

                  {googleMapsUrl && (
                    <a
                      href={
                        googleMapsUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en Google Maps ↗
                    </a>
                  )}
                </div>
              )}

              <div className="business6-hero-actions">
                <a
                  href="#citas"
                  className="business6-primary-cta"
                >
                  Reservar cita
                </a>

                <FavoriteButton
                  businessId={
                    business.id
                  }
                  loggedIn={
                    !!user
                  }
                  initialFavorite={
                    isFavorite
                  }
                />

                <BusinessSubscriptionButton
                  businessId={
                    business.id
                  }
                  userId={
                    user?.id ??
                    null
                  }
                  initialSubscribed={
                    subscribed
                  }
                />
              </div>
            </div>
          </section>

          <div className="business6-contact-strip">
            {fullAddress && (
              <div>
                <span className="business6-contact-icon">
                  ⌖
                </span>

                <div>
                  <strong>
                    {fullAddress}
                  </strong>

                  <a href="#informacion">
                    Ver ubicación
                  </a>
                </div>
              </div>
            )}

            {business.phone && (
              <div>
                <span className="business6-contact-icon">
                  ☎
                </span>

                <div>
                  <strong>
                    {business.phone}
                  </strong>

                  <a
                    href={`tel:${business.phone}`}
                  >
                    Llamar
                  </a>
                </div>
              </div>
            )}

            {business.website && (
              <div>
                <span className="business6-contact-icon">
                  ◎
                </span>

                <div>
                  <strong>
                    Web del negocio
                  </strong>

                  <a
                    href={
                      business.website
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visitar web ↗
                  </a>
                </div>
              </div>
            )}
          </div>



          <div className="business6-content-grid">
            <div className="business6-main-column">
              <BusinessBookingSection
                businessId={
                  business.id
                }
                services={
                  services ??
                  []
                }
                loggedIn={
                  !!user
                }
                requestedSlot={
                  requestedSlot
                }
              />
            </div>

            <aside className="business6-sidebar">
              <div className="business6-practical-card">
                <h2>
                  Horario
                </h2>

                {openStatus && (
                  <div className="business6-practical-status">
                    <span
                      className={
                        openStatus.open
                          ? "is-open"
                          : "is-closed"
                      }
                    />
                    <div>
                      <strong>
                        {openStatus.text}
                      </strong>

                      <p>
                        Horario habitual del negocio
                      </p>
                    </div>
                  </div>
                )}

                {hours &&
                  hours.length >
                    0 && (
                  <div className="business6-practical-hours">
                    {hours.map(
                      (
                        hour
                      ) => (
                        <div
                          key={
                            hour.day_of_week
                          }
                        >
                          <strong>
                            {DAY_NAMES[
                              hour.day_of_week
                            ]}
                          </strong>

                          {hour.closed ? (
                            <span>
                              Cerrado
                            </span>
                          ) : (
                            <span>
                              {formatTime(
                                hour.open_time
                              )}
                              {" – "}
                              {formatTime(
                                hour.close_time
                              )}

                              {hour.open_time_2 &&
                                hour.close_time_2 && (
                                  <>
                                    {" · "}
                                    {formatTime(
                                      hour.open_time_2
                                    )}
                                    {" – "}
                                    {formatTime(
                                      hour.close_time_2
                                    )}
                                  </>
                                )}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                <a
                  href="#informacion"
                  className="business6-info-link"
                >
                  Ver ubicación y cómo llegar →
                </a>
              </div>

              <div
                id="informacion"
                className="business6-sidebar-map-card"
              >
                <div className="business6-sidebar-map-head">
                  <h2>
                    Ubicación
                  </h2>

                  <p>
                    Consulta dónde está el negocio y abre la ruta en Google Maps.
                  </p>
                </div>

                {business.latitude !==
                  null &&
                  business.longitude !==
                    null ? (
                  <PublicBusinessMap
                    latitude={
                      business.latitude
                    }
                    longitude={
                      business.longitude
                    }
                    businessName={
                      business.name
                    }
                  />
                ) : (
                  <div className="business6-empty">
                    Este negocio todavía no ha publicado su ubicación en el mapa.
                  </div>
                )}
              </div>
            </aside>
          </div>

          <section
            id="opiniones"
            className="business6-reviews"
          >
            <div className="business6-section-heading">
              <div>
                <h2>
                  Opiniones de clientes
                </h2>

                {reviewCount >
                0 && (
                  <p>
                    ★ {averageRating.toFixed(
                      1
                    )} de 5 · {reviewCount} {reviewCount === 1 ? "opinión verificada" : "opiniones verificadas"} en Slottye
                  </p>
                )}
              </div>
            </div>

            {reviewCount >
              0 ? (
              <div className="business6-review-grid">
                {(reviews ?? []).map(
                  (
                    review
                  ) => {
                    const profile =
                      Array.isArray(
                        review.profiles
                      )
                        ? review
                            .profiles[0] ??
                          null
                        : review.profiles;

                    return (
                      <article
                        className="business6-review-card"
                        key={
                          review.id
                        }
                      >
                        <div className="business6-review-head">
                          <div>
                            <strong>
                              {profile?.name ??
                                "Usuario de Slottye"}
                            </strong>

                            <span className="business6-stars">
                              {[1, 2, 3, 4, 5].map(
                                (
                                  star
                                ) => (
                                  <span
                                    key={
                                      star
                                    }
                                    className={
                                      star <=
                                      review.rating
                                        ? "is-on"
                                        : ""
                                    }
                                  >
                                    ★
                                  </span>
                                )
                              )}
                            </span>
                          </div>

                          <time>
                            {new Intl.DateTimeFormat(
                              "es-ES",
                              {
                                day:
                                  "numeric",

                                month:
                                  "long",

                                year:
                                  "numeric",

                                timeZone:
                                  "Europe/Madrid",
                              }
                            ).format(
                              new Date(
                                review.created_at
                              )
                            )}
                          </time>
                        </div>

                        {review.comment && (
                          <p>
                            {review.comment}
                          </p>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="business6-empty">
                Este negocio todavía no tiene opiniones verificadas en Slottye.
              </div>
            )}

            {business.show_google_reviews &&
              googleRating !==
                null && (
              <div className="business6-google-card">
                <div>
                  <span>
                    Google Maps
                  </span>

                  <strong>
                    ★ {googleRating.toFixed(
                      1
                    )}
                  </strong>

                  <small>
                    {googleReviewCount} reseñas en Google
                  </small>
                </div>

                {googleMapsUrl && (
                  <a
                    href={
                      googleMapsUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver reseñas en Google Maps ↗
                  </a>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
