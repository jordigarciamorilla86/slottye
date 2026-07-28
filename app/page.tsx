import Link from "next/link";
import { Header } from "@/components/Header";
import { BusinessCard } from "@/components/BusinessCard";
import { businesses } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("active", true)
    .order("name");

  if (error) {
    console.error("Error loading categories:", error);
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
                Disponibilidad próxima en tu zona.
              </div>
            </div>

            <Link className="muted" href="/category/todos">
              Ver todos →
            </Link>
          </div>

          <div className="cards">
            {businesses.map((business) => (
              <BusinessCard
                business={business}
                key={business.slug}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        © 2026 Slottye · Reserva. Confirma. Listo.
      </footer>
    </>
  );
}