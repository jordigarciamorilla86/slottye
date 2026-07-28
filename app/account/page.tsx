import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,role")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Header />
      <main className="shell detail" style={{ maxWidth: 760 }}>
        <section className="panel">
          <div className="kicker">Mi Slotty</div>
          <h1 className="business-title">Hola{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="muted">{profile?.email ?? user.email}</p>
          <p><strong>Tipo de cuenta:</strong> {profile?.role === "business" ? "Negocio" : "Cliente"}</p>

          <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
            {profile?.role === "business" ? (
              <Link href="/business-dashboard" className="btn primary">Ir al panel del negocio</Link>
            ) : (
              <>
                <button className="btn" disabled>Mis próximas citas · siguiente bloque</button>
                <button className="btn" disabled>Mis suscripciones · siguiente bloque</button>
                <button className="btn" disabled>Mis favoritos · siguiente bloque</button>
              </>
            )}
            <SignOutButton />
          </div>
        </section>
      </main>
    </>
  );
}
