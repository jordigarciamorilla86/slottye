import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import CategoryAvailabilityResults from "./CategoryAvailabilityResults";
import CategorySearchControls from "./CategorySearchControls";
import CategoryNearbyBusinesses from "./CategoryNearbyBusinesses";

type Props = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    q?: string;
  
    mode?:
      string;
  
    when?:
      string;
  
    date?:
      string;
  
    page?:
      string;

      sort?: string;
lat?: string;
lng?: string;
distance?: string;
  }>;
};

/*
 * ============================================================
 * SEO / METADATA
 * ============================================================
 */

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const {
    slug,
  } =
    await params;
  
    const {
      q,
    } =
      await searchParams;
  
 

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  /*
   * ============================================================
   * BÚSQUEDAS INTERNAS
   * ============================================================
   *
   * No queremos que Google indexe URLs como:
   *
   * /category/todos?q=dentista
   * /category/todos?q=mataro
   *
   * porque podrían generarse muchísimas páginas similares.
   */

  if (q?.trim()) {
    return {
      title: `Resultados para "${q.trim()}"`,

      description:
        `Resultados de búsqueda para ${q.trim()} en Slottye.`,

      alternates: {
        canonical:
          `${baseUrl}/category/${slug}`,
      },

      robots: {
        index: false,
        follow: true,
      },
    };
  }

  /*
   * ============================================================
   * TODOS LOS NEGOCIOS
   * ============================================================
   */

  if (slug === "todos") {
    const title =
      "Negocios y profesionales";

    const description =
      "Encuentra negocios y profesionales, consulta sus servicios, disponibilidad y opiniones, y reserva cita online con Slottye.";

    const canonical =
      `${baseUrl}/category/todos`;

    return {
      title,

      description,

      alternates: {
        canonical,
      },

      openGraph: {
        type: "website",
        title:
          "Negocios y profesionales | Slottye",
        description,
        url: canonical,
        siteName: "Slottye",
        locale: "es_ES",
      },

      twitter: {
        card: "summary_large_image",
        title:
          "Negocios y profesionales | Slottye",
        description,
      },

      robots: {
        index: true,
        follow: true,
      },
    };
  }

  /*
   * ============================================================
   * CATEGORÍA CONCRETA
   * ============================================================
   */

  const supabase =
    await createClient();

  const {
    data: category,
    error,
  } = await supabase
    .from("categories")
    .select(`
      name,
      slug
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Error loading category metadata:",
      error
    );
  }

  if (!category) {
    return {
      title: "Categoría no encontrada",

      description:
        "La categoría que buscas no está disponible en Slottye.",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    `${category.name}`;

  const description =
    `Encuentra negocios y profesionales de ${category.name} en Slottye. Consulta servicios, disponibilidad y opiniones y reserva cita online.`;

  const canonical =
    `${baseUrl}/category/${category.slug}`;

  return {
    title,

    description,

    alternates: {
      canonical,
    },

    openGraph: {
      type: "website",

      title:
        `${category.name} | Slottye`,

      description,

      url: canonical,

      siteName: "Slottye",

      locale: "es_ES",
    },

    twitter: {
      card: "summary_large_image",

      title:
        `${category.name} | Slottye`,

      description,
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

export default async function CategoryPage({
  params,
  searchParams,
}: Props) {
  const {
    slug,
  } =
    await params;

    const {
      q,
      mode,
      when,
      date,
      page,
      sort,
      lat,
      lng,
      distance,
    } =
      await searchParams;

  const availabilityMode =
    mode ===
    "availability";

  const supabase =
    await createClient();
  
    const {
      data:
        searchCategories,
      error:
        searchCategoriesError,
    } =
      await supabase
        .from(
          "categories"
        )
        .select(`
          id,
          name,
          slug,
          icon
        `)
        .eq(
          "active",
          true
        )
        .order(
          "name"
        );
    
    if (
      searchCategoriesError
    ) {
      console.error(
        "Error loading search categories:",
        searchCategoriesError
      );
    }

  let categoryName =
    "Todos los negocios";

  let categoryId:
    | string
    | null = null;

  /*
   * ============================================================
   * CATEGORÍA ACTUAL
   * ============================================================
   */

  if (slug !== "todos") {
    const {
      data: category,
      error: categoryError,
    } = await supabase
      .from("categories")
      .select(`
        id,
        name
      `)
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (categoryError) {
      console.error(
        "Error loading category:",
        categoryError
      );
    }

    if (!category) {
      notFound();
    }

    categoryName =
      category.name;

    categoryId =
      category.id;
  }

  /*
   * ============================================================
   * CARGAMOS NEGOCIOS
   * ============================================================
   */

  let query =
    supabase
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

        categories (
          name
        ),

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
      .order("name");

  /*
   * Si estamos dentro de una categoría
   * concreta, mantenemos ese filtro.
   */

  if (categoryId) {
    query =
      query.eq(
        "category_id",
        categoryId
      );
  }

  const {
    data: businesses,
    error,
  } = await query;

  if (error) {
    console.error(
      "Error loading businesses:",
      error
    );
  }

  /*
   * ============================================================
   * BUSCADOR
   * ============================================================
   */

  const searchText =
    q?.trim()
      .toLocaleLowerCase(
        "es"
      ) ?? "";

  /*
   * Normalizamos textos para que:
   *
   * "Mataró"
   * "mataro"
   *
   * puedan coincidir.
   */

  function normalizeText(
    value:
      | string
      | null
      | undefined
  ) {
    return (
      value ?? ""
    )
      .toLocaleLowerCase(
        "es"
      )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }

  const normalizedSearch =
    normalizeText(
      searchText
    );

  const filteredBusinesses =
    (businesses ?? []).filter(
      (business) => {
        /*
         * Sin búsqueda:
         * mostramos todo.
         */

        if (!normalizedSearch) {
          return true;
        }

        /*
         * Supabase puede devolver la relación
         * como objeto o array según los tipos
         * generados.
         */

        const category =
          Array.isArray(
            business.categories
          )
            ? business.categories[0] ??
              null
            : business.categories;

        const searchableText = [
          business.name,
          business.description,
          business.address,
          business.city,
          category?.name,
        ]
          .filter(Boolean)
          .map(
            (value) =>
              normalizeText(
                value
              )
          )
          .join(" ");

        /*
         * También soportamos varias palabras.
         *
         * Ejemplo:
         *
         * "dentista mataro"
         *
         * exige que aparezcan las dos palabras.
         */

        const terms =
          normalizedSearch
            .split(/\s+/)
            .filter(Boolean);

        return terms.every(
          (term) =>
            searchableText.includes(
              term
            )
        );
      }
    );

  /*
   * ============================================================
   * NORMALIZAMOS LOS NEGOCIOS
   * ============================================================
   */

  const now =
    new Date();

  const normalizedBusinesses =
    filteredBusinesses.map(
      (business) => {
        /*
         * ========================================================
         * IMAGEN
         * ========================================================
         */

        const images =
          Array.isArray(
            business.business_images
          )
            ? business.business_images
            : [];

        const imageUrl =
          [...images]
            .sort(
              (a, b) =>
                (a.position ?? 0) -
                (b.position ?? 0)
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
          reviewCount > 0
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
            (slot) =>
              slot.status ===
                "AVAILABLE" &&
              new Date(
                slot.start_at
              ) > now
          );

        /*
         * ========================================================
         * OBJETO PARA NearbyBusinesses
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
   * SEO - DATOS ESTRUCTURADOS
   * ============================================================
   */

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const categoryUrl =
    `${baseUrl}/category/${slug}`;

  /*
   * Creamos ItemList únicamente para la
   * página normal de categoría.
   *
   * No lo generamos para búsquedas ?q=...
   */

  const jsonLd =
    !q?.trim() &&
    normalizedBusinesses.length > 0
      ? {
          "@context":
            "https://schema.org",

          "@type":
            "ItemList",

          name:
            categoryName,

          url:
            categoryUrl,

          numberOfItems:
            normalizedBusinesses.length,

          itemListElement:
            normalizedBusinesses.map(
              (
                business,
                index
              ) => ({
                "@type":
                  "ListItem",

                position:
                  index + 1,

                url:
                  `${baseUrl}/business/${business.slug}`,

                name:
                  business.name,
              })
            ),
        }
      : null;

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />
      )}

      <Header />

      <main className="category12-page">
        <div className="category12-shell">
          <section className="category12-hero">
            <div>
              <span className="category12-kicker">
                Explora Slottye
              </span>

              <h1>
                {availabilityMode
                  ? `Citas de ${categoryName}`
                  : q?.trim()
                    ? `Resultados para "${q.trim()}"`
                    : categoryName}
              </h1>

              <p>
                {availabilityMode
                  ? `Encuentra y reserva la próxima cita disponible de ${categoryName.toLocaleLowerCase("es")}.`
                  : `${normalizedBusinesses.length} negocio${
                      normalizedBusinesses.length === 1 ? "" : "s"
                    } encontrado${
                      normalizedBusinesses.length === 1 ? "" : "s"
                    }.`}
              </p>
            </div>

            <Link
              href="/"
              className="btn category12-back"
            >
              ← Volver
            </Link>
          </section>

          <section className="category12-workspace">
            {availabilityMode ? (
              categoryId ? (
                <CategoryAvailabilityResults
                  categoryId={categoryId}
                  categorySlug={slug}
                  categoryName={categoryName}
                  when={when}
                  selectedDate={date}
                  requestedPage={page}
                  sort={sort}
                  latitude={lat}
                  longitude={lng}
                  maxDistance={distance}
                  searchCategories={
                    searchCategories ??
                    []
                  }
                  initialQuery={
                    q ??
                    ""
                  }
                  initialCategorySlug={
                    slug === "todos"
                      ? ""
                      : slug
                  }
                />
              ) : (
                <div className="category12-tools">
                  <CategorySearchControls
                    categories={
                      searchCategories ??
                      []
                    }
                    categorySlug={
                      slug
                    }
                    initialQuery={
                      q ??
                      ""
                    }
                    initialCategorySlug=""
                    initialMode="availability"
                    initialWhen={
                      when
                    }
                    initialSelectedDate={
                      date
                    }
                  />

                  <div className="panel category12-empty">
                    <h3>
                      Selecciona una categoría
                    </h3>

                    <p className="muted">
                      Elige qué tipo de cita necesitas.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <CategoryNearbyBusinesses
                businesses={
                  normalizedBusinesses
                }
                categories={
                  searchCategories ??
                  []
                }
                categorySlug={
                  slug
                }
                initialQuery={
                  q ??
                  ""
                }
                initialCategorySlug={
                  slug === "todos"
                    ? ""
                    : slug
                }
              />
            )}
          </section>
        </div>

        <style>{`
          .category12-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .category12-shell {
            width: min(1220px,100%);
            margin: 0 auto;
          }

          .category12-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 23px 25px;
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

          .category12-kicker {
            color: var(--accent-dark);
            font-size: 10.5px;
            font-weight: 850;
          }

          .category12-hero h1 {
            margin: 5px 0 4px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .category12-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 12.5px;
          }

          .category12-back {
            flex: 0 0 auto;
          }

          .category12-workspace {
            margin-top: 14px;
          }

          .category12-tools {
            display: grid;
            gap: 16px;
          }

          .category12-empty {
            padding: 24px;
          }

          @media (max-width: 700px) {
            .category12-page {
              padding: 18px 12px 46px;
            }

            .category12-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .category12-hero h1 {
              font-size: 30px;
            }

            .category12-back {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </main>
    </>
  );
}
