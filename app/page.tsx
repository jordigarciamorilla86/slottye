import Link from "next/link";
import { Header } from "@/components/Header";
import { BusinessCard } from "@/components/BusinessCard";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("active", true)
    .order("name");

  const { data: businesses, error: businessesError } = await supabase
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
      category_id
    `)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (categoriesError) {
    console.error("Error loading categories:", categoriesError);
  }

  if (businessesError) {
    console.error("Error loading businesses:", businessesError);
  }

  return (
    <>
      <Header />

      <main>
        <section className="shell hero">
          <span className="kicker">
            Reservas fáciles, negocios cerca
          </span>

          <h1>Tu próxima cita, en segundos.</h1>

          <p className="lead">
            Busca negocios cerca de ti, encuentra un hueco disponible
            y reserva sin llamadas ni esperas.
          </p>

          <form className="search" action="/category/todos">
            <input
              name="q"
              placeholder="Buscar dentista, peluquería, psicólogo..."
            />
            <button>Buscar</button>
          </form>
        </section>

        <section className="shell section">
          <div className="section-head">
            <div>
              <h2>Explora por categoría</h2>
              <div className="muted">
                Encuentra justo lo que necesitas.
              </div>
            </div>
          </div>

          <div className="category-grid">
            {(categories ?? []).map((category) => (
              <Link
                className="category"
                href={`/category/${category.slug}`}
                key={category.id}
              >
                <div className="category-icon">
                  {category.icon}
                </div>

                <strong>{category.name}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="shell section">
          <div className="section-head">
            <div>
              <h2>Negocios cerca de ti</h2>
              <div className="muted">
                Descubre negocios disponibles en Slottye.
              </div>
            </div>

            <Link className="muted" href="/category/todos">
              Ver todos →
            </Link>
          </div>

          {businesses && businesses.length > 0 ? (
            <div className="cards">
              {businesses.map((business) => (
                <BusinessCard
                  business={{
                    slug: business.slug,
                    name: business.name,
                    description: business.description ?? "",
                    address: business.address ?? "",
                    city: business.city ?? "",
                    phone: business.phone ?? "",
                    website: business.website ?? "",
                  }}
                  key={business.id}
                />
              ))}
            </div>
          ) : (
            <div className="panel">
              <p className="muted">
                Todavía no hay negocios publicados.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        © 2026 Slottye · Reserva. Confirma. Listo.
      </footer>
    </>
  );
}