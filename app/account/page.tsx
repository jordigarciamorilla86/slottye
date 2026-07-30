import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,email,role")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Header />

      <main className="shell detail" style={{ maxWidth: 760 }}>
        <section className="panel">
          <div className="kicker">Mi Slottye</div>

          <h1 className="business-title">
            Hola{profile?.name ? `, ${profile.name}` : ""}
          </h1>

          <p className="muted">
            {profile?.email ?? user.email}
          </p>

          <p>
            <strong>Tipo de cuenta:</strong>{" "}
            {profile?.role === "business" ? "Negocio" : "Cliente"}
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 24,
            }}
          >
            {profile?.role === "business" ? (
              <Link
                href="/business-dashboard"
                className="btn primary"
              >
                Ir al panel del negocio
              </Link>
            ) : (
              <>
  <Link
    href="/account/bookings"
    className="btn primary"
  >
    Mis citas
  </Link>

  <Link
  href="/account/subscriptions"
  className="btn"
>
  Mis suscripciones
</Link>

<Link
  href="/account/favorites"
  className="btn"
>
  ♥ Mis favoritos
</Link>
<Link
  href="/account/password"
  className="btn"
>
  Cambiar contraseña
</Link>
<Link
  href="/account/email"
  className="btn"
>
  Cambiar correo electrónico
</Link>
<Link
  href="/account/delete"
  className="btn"
  style={{
    color: "#b91c1c",
    borderColor: "#fecaca",
  }}
>
  Eliminar cuenta
</Link>
</>
            )}

            <SignOutButton />
          </div>
        </section>
      </main>
    </>
  );
}