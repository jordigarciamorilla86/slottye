import Link from "next/link";
import { Header } from "@/components/Header";
import { SignOutButton } from "./sign-out-button";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

export default async function AccountPage() {
  /*
   * ============================================================
   * USUARIO ACTIVO
   * ============================================================
   */

  const {
    user,
    profile,
  } = await requireActiveUser();

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 760,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Mi Slottye
          </div>

          <h1 className="business-title">
            Hola
            {profile?.name
              ? `, ${profile.name}`
              : ""}
          </h1>

          <p className="muted">
            {profile?.email ??
              user.email}
          </p>

          <p>
            <strong>
              Tipo de cuenta:
            </strong>{" "}
            {profile?.role ===
            "business"
              ? "Negocio"
              : "Cliente"}
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 24,
            }}
          >
            {profile?.role ===
            "business" ? (
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
                    color:
                      "#b91c1c",
                    borderColor:
                      "#fecaca",
                  }}
                >
                  Eliminar cuenta
                </Link>
              </>
            )}

            <SignOutButton />
          </div>
        </section>

        {/* ======================================================
            VOLVER A SLOTTYE
            ====================================================== */}

        <section
          style={{
            marginTop: 20,
          }}
        >
          <Link
            href="/"
            className="btn"
          >
            ← Volver a Slottye
          </Link>
        </section>
      </main>
    </>
  );
}