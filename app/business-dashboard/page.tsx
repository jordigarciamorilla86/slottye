import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "business") {
    redirect("/account");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      description,
      address,
      city,
      phone,
      email,
      active
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <>
      <Header />

      <main className="shell detail" style={{ maxWidth: 900 }}>
        <section className="panel">
          <div className="kicker">Slottye Business</div>

          <h1 className="business-title">
            {business
              ? business.name
              : "Configura tu negocio"}
          </h1>

          {!business ? (
            <>
              <p className="muted">
                Todavía no has creado la ficha de tu negocio.
              </p>

              <div style={{ marginTop: 24 }}>
                <Link
                  href="/business-dashboard/create"
                  className="btn primary"
                >
                  Crear mi negocio
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                {business.address}
                {business.city
                  ? ` · ${business.city}`
                  : ""}
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 28,
                }}
              >
                <Link
                  href="/business-dashboard/business"
                  className="btn"
                >
                  Datos del negocio
                </Link>

                <Link
                  href="/business-dashboard/services"
                  className="btn"
                >
                  Servicios
                </Link>

                <Link
                  href="/business-dashboard/calendar"
                  className="btn"
                >
                  Calendario y citas
                </Link>

                <Link
                  href="/business-dashboard/bookings"
                  className="btn"
                >
                  Reservas
                </Link>

                <Link
                  href="/business-dashboard/subscribers"
                  className="btn"
                >
                  Suscriptores
                </Link>

                <Link
                  href={`/business/${business.slug}`}
                  className="btn primary"
                >
                  Ver ficha pública
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}