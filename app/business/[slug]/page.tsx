import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { AvailableSlots } from "@/components/AvailableSlots";
import { BusinessSubscriptionButton } from "@/components/BusinessSubscriptionButton";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BusinessPage({
  params,
}: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: business, error } = await supabase
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
      category_id
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Error loading business:", error);
  }

  if (!business) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscribed = false;

if (user) {
  const { data: subscription } = await supabase
    .from("business_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .maybeSingle();

  subscribed = !!subscription;
}

  const { data: category } = business.category_id
    ? await supabase
        .from("categories")
        .select("name")
        .eq("id", business.category_id)
        .maybeSingle()
    : { data: null };

  const { data: services } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      duration_minutes
    `)
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

    const { data: slots } = await supabase
    .from("slots")
    .select(`
      id,
      service_id,
      start_at,
      end_at,
      status
    `)
    .eq("business_id", business.id)
    .eq("status", "AVAILABLE")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true });

  const fullAddress = [
    business.address,
    business.postal_code,
    business.city,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{ maxWidth: 950 }}
      >
        <section className="panel">
          {category?.name && (
            <div className="kicker">
              {category.name}
            </div>
          )}

          <h1 className="business-title">
            {business.name}
          </h1>

          {business.description && (
            <p className="lead">
              {business.description}
            </p>
          )}

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 22,
            }}
          >
            {fullAddress && (
              <div>
                📍 {fullAddress}
              </div>
            )}

            {business.phone && (
              <div>
                ☎{" "}
                <a href={`tel:${business.phone}`}>
                  {business.phone}
                </a>
              </div>
            )}

            {business.email && (
              <div>
                ✉{" "}
                <a href={`mailto:${business.email}`}>
                  {business.email}
                </a>
              </div>
            )}

            {business.website && (
              <div>
                🌐{" "}
                <a
                  href={business.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Web del negocio
                </a>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 24,
            }}
          >
            <button className="btn" disabled>
              ♡ Guardar
            </button>

            <BusinessSubscriptionButton
  businessId={business.id}
  userId={user?.id ?? null}
  initialSubscribed={subscribed}
/>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Servicios</h2>

              <p className="muted">
                Selecciona un servicio para consultar disponibilidad.
              </p>
            </div>
          </div>

          {services && services.length > 0 ? (
            <div className="cards">
              {services.map((service) => (
                <div
                  className="card"
                  key={service.id}
                >
                  <div className="card-body">
                    <h3>{service.name}</h3>

                    {service.description && (
                      <p className="muted">
                        {service.description}
                      </p>
                    )}

                    <div
                      className="meta"
                      style={{ marginTop: 12 }}
                    >
                      ⏱ {service.duration_minutes} min
                    </div>

                    <div
                      style={{ marginTop: 18 }}
                    >
                      <span className="btn primary">
                        Ver citas
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel">
              <h3>Todavía no hay servicios publicados</h3>

              <p className="muted">
                Este negocio aún no ha configurado sus servicios.
              </p>
            </div>
          )}
        </section>

        <section className="section">
  <div className="section-head">
    <div>
      <h2>Citas disponibles</h2>

      <p className="muted">
        Elige el día y la hora que mejor te vaya.
      </p>
    </div>
  </div>

  <AvailableSlots
    slots={slots ?? []}
    services={services ?? []}
    loggedIn={!!user}
  />
</section>

        <section className="section">
          <Link href="/" className="btn">
            ← Volver a Slottye
          </Link>
        </section>
      </main>
    </>
  );
}