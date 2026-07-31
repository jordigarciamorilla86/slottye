import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import BusinessBookingsManager from "./BusinessBookingsManager";

export default async function BusinessBookingsPage() {
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

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      user_id,
      status,
      created_at,
      cancelled_at,
      slots (
        id,
        start_at,
        end_at
      ),
      services (
        id,
        name,
        duration_minutes
      ),
      profiles (
        id,
        name,
        email
      )
    `)
    .eq("business_id", business.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading business bookings:",
      error
    );
  }

  const normalized =
    (bookings ?? []).map(
      (booking) => ({
        ...booking,

        slots: Array.isArray(
          booking.slots
        )
          ? booking.slots[0] ?? null
          : booking.slots,

        services: Array.isArray(
          booking.services
        )
          ? booking.services[0] ?? null
          : booking.services,

        profiles: Array.isArray(
          booking.profiles
        )
          ? booking.profiles[0] ?? null
          : booking.profiles,
      })
    );

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 1000,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Reservas
          </h1>

          <p className="muted">
            Gestiona las reservas de {business.name}.
          </p>

          <BusinessBookingsManager
            initialBookings={normalized}
          />
        </section>

        <section
          style={{
            marginTop: 20,
          }}
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