import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import BusinessHoursManager from "./BusinessHoursManager";

export default async function BusinessHoursPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/business-dashboard/create");
  }

  const { data: hours } = await supabase
  .from("business_hours")
  .select(`
    id,
    day_of_week,
    open_time,
    close_time,
    open_time_2,
    close_time_2,
    closed
  `)
  .eq("business_id", business.id)
  .order("day_of_week");

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{ maxWidth: 850 }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Horarios
          </h1>

          <p className="muted">
            Configura el horario habitual de {business.name}.
          </p>

          <BusinessHoursManager
            businessId={business.id}
            initialHours={hours ?? []}
          />
        </section>

        <section style={{ marginTop: 20 }}>
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