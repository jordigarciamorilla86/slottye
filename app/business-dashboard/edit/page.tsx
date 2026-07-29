import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import BusinessEditForm from "./BusinessEditForm";

export default async function EditBusinessPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
  .from("businesses")
  .select(`
    id,
    name,
    description,
    address,
    city,
    postal_code,
    phone,
    email,
    website,
    latitude,
    longitude,
    google_place_id,
    show_google_reviews,
    min_booking_notice_hours,
    max_booking_advance_days,
    allow_cancellations,
    min_cancellation_notice_hours
  `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/business-dashboard/create");
  }

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{ maxWidth: 800 }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Editar mi negocio
          </h1>

          <p className="muted">
            Esta información aparecerá en tu ficha pública.
          </p>

          <BusinessEditForm
            business={business}
          />
        </section>

        <section
          className="section"
          style={{ marginTop: 16 }}
        >
          <Link
            href="/business-dashboard"
            className="btn"
          >
            ← Volver al panel
          </Link>
        </section>
      </main>
    </>
  );
}