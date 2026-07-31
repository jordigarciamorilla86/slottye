import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import BusinessImagesManager from "./BusinessImagesManager";

export default async function BusinessImagesPage() {
  const {
    supabase,
    user,
  } = await requireActiveUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/business-dashboard/create");
  }

  const { data: images } = await supabase
    .from("business_images")
    .select(`
      id,
      image_url,
      position
    `)
    .eq("business_id", business.id)
    .order("position");

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
            Imágenes
          </h1>

          <p className="muted">
            Gestiona las fotos de {business.name}.
          </p>

          <BusinessImagesManager
            businessId={business.id}
            initialImages={images ?? []}
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