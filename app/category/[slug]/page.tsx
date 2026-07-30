import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { NearbyBusinesses } from "@/components/NearbyBusinesses";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    q?: string;
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
  const { slug } = await params;
  const { q } = await searchParams;

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
  const { slug } = await params;
  const { q } = await searchParams;

  const supabase =
    await createClient();

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
            __html:
              JSON.stringify(
                jsonLd
              ).replace(
                /</g,
                "\\u003c"
              ),
          }}
        />
      )}

      <Header />

      <main className="shell detail">
        <section className="section">
          <div className="section-head">
            <div>
              <div className="kicker">
                Explora Slottye
              </div>

              <h1 className="business-title">
                {q?.trim()
                  ? `Resultados para "${q.trim()}"`
                  : categoryName}
              </h1>

              <p className="muted">
                {
                  normalizedBusinesses.length
                }{" "}
                negocio
                {normalizedBusinesses.length ===
                1
                  ? ""
                  : "s"}{" "}
                encontrado
                {normalizedBusinesses.length ===
                1
                  ? ""
                  : "s"}
                .
              </p>
            </div>

            <Link
              href="/"
              className="btn"
            >
              ← Volver
            </Link>
          </div>

          {/* ====================================================
              BUSCADOR
              ==================================================== */}

          <form
            className="search"
            action={`/category/${slug}`}
            style={{
              marginBottom: 24,
            }}
          >
            <input
              name="q"
              defaultValue={
                q ?? ""
              }
              placeholder="Negocio, servicio, ciudad, categoría..."
            />

            <button>
              Buscar
            </button>
          </form>

          {/* ====================================================
              RESULTADOS
              ==================================================== */}

          {normalizedBusinesses.length >
          0 ? (
            <NearbyBusinesses
              businesses={
                normalizedBusinesses
              }
            />
          ) : (
            <div className="panel">
              <h3>
                No hemos encontrado
                negocios
              </h3>

              <p className="muted">
                Prueba con otro nombre,
                ciudad, categoría o
                término de búsqueda.
              </p>

              {q?.trim() && (
                <Link
                  href={`/category/${slug}`}
                  className="btn"
                  style={{
                    marginTop: 12,
                  }}
                >
                  Limpiar búsqueda
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}