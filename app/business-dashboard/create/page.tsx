import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import CreateBusinessForm from "./CreateBusinessForm";

export default async function CreateBusinessPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "business") {
    redirect("/account");
  }

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingBusiness) {
    redirect("/business-dashboard");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name")
    .eq("active", true)
    .order("name");

  return (
    <>
      <Header />

      <main className="shell detail" style={{ maxWidth: 850 }}>
        <section className="panel">
          <div className="kicker">Slottye Business</div>

          <h1 className="business-title">
            Crea tu negocio
          </h1>

          <p className="muted">
            Esta información aparecerá en la ficha pública de tu negocio.
          </p>

          <CreateBusinessForm categories={categories ?? []} />
        </section>
      </main>
    </>
  );
}