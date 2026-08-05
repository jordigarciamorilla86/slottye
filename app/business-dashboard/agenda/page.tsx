import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import WeeklyAgenda from "./WeeklyAgenda";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function AgendaPage({
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

  if (profile.role !== "business") {
    redirect("/account");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(`
      id,
      name
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/business-dashboard/create");
  }

  /*
   * ============================================================
   * SEMANA ACTUAL
   * lunes -> domingo
   * ============================================================
   */

  const now = new Date();

  const day = now.getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  const weekStart = new Date(now);

  weekStart.setDate(
    now.getDate() +
      diffToMonday
  );

  weekStart.setHours(
    0,
    0,
    0,
    0
  );

  const weekEnd =
    new Date(weekStart);

  weekEnd.setDate(
    weekStart.getDate() +
      7
  );

  /*
   * ============================================================
   * SERVICIOS
   * ============================================================
   */

  const {
    data: services,
    error: servicesError,
  } = await supabase
    .from("services")
    .select(`
      id,
      name,
      duration_minutes,
      active
    `)
    .eq(
      "business_id",
      business.id
    )
    .order("name");

  if (servicesError) {
    console.error(
      "Error loading agenda services:",
      servicesError
    );
  }

  /*
   * ============================================================
   * HORARIO HABITUAL
   * ============================================================
   */

  const {
    data: businessHours,
    error: hoursError,
  } = await supabase
    .from("business_hours")
    .select(`
      day_of_week,
      open_time,
      close_time,
      open_time_2,
      close_time_2,
      closed
    `)
    .eq(
      "business_id",
      business.id
    )
    .order("day_of_week");

  if (hoursError) {
    console.error(
      "Error loading agenda business hours:",
      hoursError
    );
  }

  /*
   * ============================================================
   * SLOTS
   * ============================================================
   */

  const {
    data: slots,
    error: slotsError,
  } = await supabase
    .from("slots")
    .select(`
      id,
      service_id,
      start_at,
      end_at,
      status
    `)
    .eq(
      "business_id",
      business.id
    )
    .gte(
      "start_at",
      weekStart.toISOString()
    )
    .lt(
      "start_at",
      weekEnd.toISOString()
    )
    .order("start_at");

  if (slotsError) {
    console.error(
      "Error loading agenda slots:",
      slotsError
    );
  }

  /*
   * ============================================================
   * RESERVAS ONLINE
   * ============================================================
   */

  const {
    data: bookings,
    error: bookingsError,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      slot_id,
      user_id,
      service_id,
      status,
      cancelled_at,

      profiles (
        id,
        name,
        email
      ),

      services (
        id,
        name,
        duration_minutes
      ),

      slots (
        id,
        start_at,
        end_at,
        status
      )
    `)
    .eq(
      "business_id",
      business.id
    );

  if (bookingsError) {
    console.error(
      "Error loading agenda bookings:",
      bookingsError
    );
  }

  /*
   * ============================================================
   * BLOQUEOS
   * ============================================================
   */

  const {
    data: blocks,
    error: blocksError,
  } = await supabase
    .from("business_blocks")
    .select(`
      id,
      start_at,
      end_at,
      reason
    `)
    .eq(
      "business_id",
      business.id
    )
    .lt(
      "start_at",
      weekEnd.toISOString()
    )
    .gt(
      "end_at",
      weekStart.toISOString()
    )
    .order("start_at");

  if (blocksError) {
    console.error(
      "Error loading agenda blocks:",
      blocksError
    );
  }

  /*
   * ============================================================
   * RESERVAS MANUALES
   * ============================================================
   */

  const {
    data: manualBookings,
    error: manualBookingsError,
  } = await supabase
    .from("manual_bookings")
    .select(`
      id,
      business_id,
      service_id,
      customer_name,
      customer_phone,
      customer_email,
      start_at,
      end_at,
      notes,
      created_at,
      updated_at,

      services (
        id,
        name,
        duration_minutes
      )
    `)
    .eq(
      "business_id",
      business.id
    )
    .gte(
      "start_at",
      weekStart.toISOString()
    )
    .lt(
      "start_at",
      weekEnd.toISOString()
    )
    .order("start_at");

  if (manualBookingsError) {
    console.error(
      "Error loading agenda manual bookings:",
      manualBookingsError
    );
  }

  /*
   * ============================================================
   * NORMALIZAR RESERVAS ONLINE
   * ============================================================
   */

  const normalizedBookings =
    (bookings ?? []).map(
      (booking) => ({
        ...booking,

        profiles:
          Array.isArray(
            booking.profiles
          )
            ? booking.profiles[0] ??
              null
            : booking.profiles,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[0] ??
              null
            : booking.services,

        slots:
          Array.isArray(
            booking.slots
          )
            ? booking.slots[0] ??
              null
            : booking.slots,
      })
    );

  /*
   * ============================================================
   * NORMALIZAR RESERVAS MANUALES
   * ============================================================
   */

  const normalizedManualBookings =
    (manualBookings ?? []).map(
      (booking) => ({
        ...booking,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[0] ??
              null
            : booking.services,
      })
    );

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 1450,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Agenda
          </h1>

          <p className="muted">
            Gestiona visualmente la semana de {business.name}.
          </p>

          <WeeklyAgenda
            businessId={business.id}
            businessName={business.name}
            initialWeekStart={
              weekStart.toISOString()
            }
            services={
              services ?? []
            }
            businessHours={
              businessHours ?? []
            }
            initialSlots={
              slots ?? []
            }
            initialBookings={
              normalizedBookings
            }
            initialBlocks={
              blocks ?? []
            }
            initialManualBookings={
              normalizedManualBookings
            }
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

  <Link
    href={
      fromSetup
        ? "/business-dashboard/calendar?setup=1"
        : "/business-dashboard/calendar"
    }
    className="btn"
  >
    Calendario y disponibilidad
  </Link>
</section>
      </main>
    </>
  );
}