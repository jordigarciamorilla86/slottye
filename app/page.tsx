import Link from "next/link";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { NearbyBusinesses } from "@/components/NearbyBusinesses";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("active", true)
    .order("name");

  const {
    data: businesses,
    error: businessesError,
  } = await supabase
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
    .eq("active", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  if (categoriesError) {
    console.error(
      "Error loading categories:",
      categoriesError
    );
  }

  if (businessesError) {
    console.error(
      "Error loading businesses:",
      businessesError
    );
  }

  const now = new Date();

  const normalizedBusinesses =
    (businesses ?? []).map(
      (business) => {
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
          [...images]
            .sort(
              (a, b) =>
                a.position -
                b.position
            )[0]
            ?.image_url ?? null;

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
              ) / reviewCount
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

  return (
    <>
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
              (category) => (
                <Link
                  className="category"
                  href={`/category/${category.slug}`}
                  key={category.id}
                >
                  <div className="category-icon">
                    {category.icon}
                  </div>

                  <strong>
                    {category.name}
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
    SOBRE SLOTTYE
    ====================================================== */}

<section
  className="shell section"
  style={{
    paddingTop: 20,
    paddingBottom: 20,
  }}
>
  <div
    style={{
      borderTop: "1px solid var(--border)",
      paddingTop: 24,
      maxWidth: 800,
    }}
  >
    <h2
      style={{
        fontSize: 18,
        marginBottom: 8,
      }}
    >
      ¿Qué es Slottye?
    </h2>

    <p
      className="muted"
      style={{
        margin: 0,
        fontSize: 14,
        lineHeight: 1.7,
      }}
    >
      Slottye es una plataforma online para encontrar negocios
      y profesionales, consultar sus citas disponibles y reservar
      directamente por Internet. Los usuarios pueden gestionar sus
      reservas y seguir sus negocios favoritos, mientras que los
      negocios pueden publicar servicios, horarios y disponibilidad.
    </p>
  </div>
</section>
      </main>

      <footer className="footer">
        © 2026 Slottye · Reserva.
        Confirma. Listo.
      </footer>
    </>
  );
}