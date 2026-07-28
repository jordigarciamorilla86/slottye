import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import CalendarManager from "./CalendarManager";

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "business") {
    redirect("/account");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/business-dashboard/create");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id,name,duration_minutes")
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
    .gte("start_at", new Date().toISOString())
    .order("start_at");

  return (
    <>
      <Header />

      <main className="shell detail" style={{ maxWidth: 900 }}>
        <section className="panel">
          <div className="kicker">Slottye Business</div>

          <h1 className="business-title">
            Calendario y citas
          </h1>

          <p className="muted">
            Crea y gestiona las citas disponibles de {business.name}.
          </p>

          <CalendarManager
            businessId={business.id}
            services={services ?? []}
            initialSlots={slots ?? []}
          />
        </section>

        <section style={{ marginTop: 20 }}>
          <Link href="/business-dashboard" className="btn">
            ← Volver al panel
          </Link>
        </section>
      </main>
    </>
  );
}