import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import ServicesManager from "./ServicesManager";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function ServicesPage({
  searchParams,
}: Props) {
  const {
    setup,
  } =
    await searchParams;

  const fromSetup =
    setup === "1";
  const {
    supabase,
    user,
    profile,
  } = await requireActiveUser();

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
    .select(`
      id,
      name,
      description,
      duration_minutes,
      active
    `)
    .eq("business_id", business.id)
    .order("created_at", {
      ascending: false,
    });

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{ maxWidth: 900 }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Servicios
          </h1>

          <p className="muted">
            Gestiona los servicios que ofrece {business.name}.
          </p>

          <ServicesManager
            businessId={business.id}
            initialServices={services ?? []}
          />
        </section>

        <section
  style={{
    marginTop:
      20,

    display:
      "flex",

    gap:
      10,

    flexWrap:
      "wrap",
  }}
>
  {fromSetup ? (
    <Link
      href="/business-dashboard/setup"
      className="btn primary"
    >
      ← Volver a la configuración inicial
    </Link>
  ) : (
    <Link
      href="/business-dashboard"
      className="btn"
    >
      ← Volver al panel
    </Link>
  )}
</section>
      </main>
    </>
  );
}