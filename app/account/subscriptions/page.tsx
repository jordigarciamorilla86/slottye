import Link from "next/link";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import SubscriptionsManager from "./SubscriptionsManager";

export default async function SubscriptionsPage() {
  const {
    supabase,
    user,
  } = await requireActiveUser();

  const { data: subscriptions, error } = await supabase
    .from("business_subscriptions")
    .select(`
      id,
      email_enabled,
      created_at,
      businesses (
        id,
        name,
        slug,
        address,
        city
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading subscriptions:",
      error
    );
  }

  const normalized =
    (subscriptions ?? []).map(
      (subscription) => ({
        ...subscription,

        businesses: Array.isArray(
          subscription.businesses
        )
          ? subscription.businesses[0] ?? null
          : subscription.businesses,
      })
    );

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 900,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Mi Slottye
          </div>

          <h1 className="business-title">
            Mis suscripciones
          </h1>

          <p className="muted">
            Aquí aparecen los negocios que sigues para recibir avisos de nuevas citas.
          </p>

          <SubscriptionsManager
            initialSubscriptions={
              normalized
            }
          />
        </section>

        <section
          style={{
            marginTop: 20,
          }}
        >
          <Link
            href="/account"
            className="btn"
          >
            ← Volver a mi cuenta
          </Link>
        </section>
      </main>
    </>
  );
}