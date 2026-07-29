import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function FavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: favorites, error } = await supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      businesses (
        id,
        name,
        slug,
        description,
        address,
        city,
        phone
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading favorites:", error);
  }

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{ maxWidth: 850 }}
      >
        <section className="panel">
          <div className="kicker">Mi Slottye</div>

          <h1 className="business-title">
            Mis favoritos
          </h1>

          <p className="muted">
            Los negocios que has guardado.
          </p>

          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 28,
            }}
          >
            {!favorites || favorites.length === 0 ? (
              <div>
                <h3>Todavía no tienes favoritos</h3>

                <p className="muted">
                  Guarda negocios para encontrarlos rápidamente
                  desde aquí.
                </p>

                <Link
                  href="/"
                  className="btn primary"
                  style={{ marginTop: 12 }}
                >
                  Explorar negocios
                </Link>
              </div>
            ) : (
              favorites.map((favorite) => {
                const business = Array.isArray(
                  favorite.businesses
                )
                  ? favorite.businesses[0]
                  : favorite.businesses;

                if (!business) return null;

                return (
                  <Link
                    key={favorite.id}
                    href={`/business/${business.slug}`}
                    className="card"
                    style={{
                      textDecoration: "none",
                    }}
                  >
                    <div className="card-body">
                      <h3>{business.name}</h3>

                      {business.description && (
                        <p className="muted">
                          {business.description}
                        </p>
                      )}

                      {(business.address ||
                        business.city) && (
                        <div
                          className="meta"
                          style={{ marginTop: 10 }}
                        >
                          📍{" "}
                          {[
                            business.address,
                            business.city,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}

                      {business.phone && (
                        <div
                          className="meta"
                          style={{ marginTop: 6 }}
                        >
                          ☎ {business.phone}
                        </div>
                      )}

                      <div style={{ marginTop: 16 }}>
                        <span className="btn primary">
                          Ver negocio
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section
          className="section"
          style={{ marginTop: 16 }}
        >
          <Link href="/account" className="btn">
            ← Volver a mi cuenta
          </Link>
        </section>
      </main>
    </>
  );
}