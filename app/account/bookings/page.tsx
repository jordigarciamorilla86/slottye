import Link from "next/link";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import BookingsManager from "./BookingsManager";

type Props = {
  searchParams:
    Promise<{
      review?:
        string;
    }>;
};

export default async function BookingsPage({
  searchParams,
}: Props) {
  const {
    review,
  } =
    await searchParams;
  const {
    supabase,
    user,
  } = await requireActiveUser();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      created_at,
      cancelled_at,

      slots (
        id,
        start_at,
        end_at
      ),

      businesses (
        id,
        name,
        slug,
        address,
        city,
        allow_cancellations,
        min_cancellation_notice_hours
      ),

      services (
        id,
        name,
        duration_minutes
      ),

      reviews (
        id,
        rating,
        comment,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error loading bookings:",
      error
    );
  }

  const normalizedBookings =
    (bookings ?? []).map(
      (booking) => ({
        ...booking,

        slots: Array.isArray(
          booking.slots
        )
          ? booking.slots[0] ?? null
          : booking.slots,

        businesses:
          Array.isArray(
            booking.businesses
          )
            ? booking.businesses[0] ?? null
            : booking.businesses,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[0] ?? null
            : booking.services,

        reviews:
          Array.isArray(
            booking.reviews
          )
            ? booking.reviews[0] ?? null
            : booking.reviews,
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
            Mis citas
          </h1>

          <p className="muted">
            Consulta tus próximas citas y tu historial.
          </p>

          <BookingsManager
            initialBookings={
              normalizedBookings
            }
            userId={
              user.id
            }
            highlightedBookingId={
              review ??
              null
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