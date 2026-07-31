import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * COMPROBAR ADMINISTRADOR
   * ============================================================
   */

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,email,is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  /*
   * ============================================================
   * ESTADÍSTICAS
   * ============================================================
   */

  const [
    usersResult,
    businessesResult,
    bookingsResult,
    reviewsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("businesses")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("bookings")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("reviews")
      .select("*", {
        count: "exact",
        head: true,
      }),
  ]);

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 1000,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Admin
          </div>

          <h1 className="business-title">
            Panel de administración
          </h1>

          <p className="muted">
            Hola
            {profile.name
              ? `, ${profile.name}`
              : ""}
            . Gestiona Slottye desde aquí.
          </p>

          {/* ====================================================
              ESTADÍSTICAS
              ==================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginTop: 28,
            }}
          >
            <div className="panel">
              <div className="muted">
                Usuarios
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {usersResult.count ?? 0}
              </div>
            </div>

            <div className="panel">
              <div className="muted">
                Negocios
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {businessesResult.count ?? 0}
              </div>
            </div>

            <div className="panel">
              <div className="muted">
                Reservas
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {bookingsResult.count ?? 0}
              </div>
            </div>

            <div className="panel">
              <div className="muted">
                Reseñas
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {reviewsResult.count ?? 0}
              </div>
            </div>
          </div>

          {/* ====================================================
              GESTIÓN
              ==================================================== */}

          <h2
            style={{
              marginTop: 34,
              marginBottom: 14,
            }}
          >
            Gestión
          </h2>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <Link
              href="/admin/users"
              className="btn"
            >
              👤 Gestionar usuarios
            </Link>

            <Link
              href="/admin/businesses"
              className="btn"
            >
              🏢 Gestionar negocios
            </Link>

            <Link
              href="/admin/bookings"
              className="btn"
            >
              📅 Gestionar reservas
            </Link>

            <Link
              href="/admin/reviews"
              className="btn"
            >
              ⭐ Gestionar reseñas
            </Link>
          </div>
        </section>

        <section
          style={{
            marginTop: 20,
          }}
        >
          <Link
            href="/"
            className="btn"
          >
            ← Volver a Slottye
          </Link>
        </section>
      </main>
    </>
  );
}