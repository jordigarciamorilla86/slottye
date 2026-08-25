import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

import WeeklyAgenda from "./WeeklyAgenda";
import GoogleCalendarAgendaButton from "./GoogleCalendarAgendaButton";

import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
} from "lucide-react";

type Props = {
  searchParams: Promise<{
    setup?: string;
    date?: string;
  }>;
};

function getReferenceDate(
  dateParam?: string
) {
  if (
    !dateParam ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateParam
    )
  ) {
    return new Date();
  }

  const [
    year,
    month,
    day,
  ] =
    dateParam
      .split("-")
      .map(Number);

  const parsed =
    new Date(
      year,
      month - 1,
      day
    );

  const isValid =
    !Number.isNaN(
      parsed.getTime()
    ) &&
    parsed.getFullYear() ===
      year &&
    parsed.getMonth() ===
      month - 1 &&
    parsed.getDate() ===
      day;

  return isValid
    ? parsed
    : new Date();
}

export default async function AgendaPage({
  searchParams,
}: Props) {
  const {
    setup,
    date,
  } =
    await searchParams;

  const fromSetup =
    setup === "1";

  const {
    supabase,
    user,
    profile,
  } =
    await requireActiveUser();

  if (
    profile.role !==
    "business"
  ) {
    redirect(
      "/account"
    );
  }

  const {
    data: business,
  } =
    await supabase
      .from(
        "businesses"
      )
      .select(`
        id,
        name
      `)
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();

  if (
    !business
  ) {
    redirect(
      "/business-dashboard/create"
    );
  }

  /*
   * ============================================================
   * SEMANA A MOSTRAR
   * lunes -> domingo
   *
   * Sin ?date= conserva exactamente el comportamiento anterior:
   * abre la semana actual.
   *
   * Con ?date=YYYY-MM-DD abre la semana que contiene esa fecha.
   * ============================================================
   */

  const referenceDate =
    getReferenceDate(
      date
    );

  const day =
    referenceDate
      .getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  const weekStart =
    new Date(
      referenceDate
    );

  weekStart.setDate(
    referenceDate.getDate() +
      diffToMonday
  );

  weekStart.setHours(
    0,
    0,
    0,
    0
  );

  const weekEnd =
    new Date(
      weekStart
    );

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
  } =
    await supabase
      .from(
        "services"
      )
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
      .order(
        "name"
      );

  if (
    servicesError
  ) {
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
  } =
    await supabase
      .from(
        "business_hours"
      )
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
      .order(
        "day_of_week"
      );

  if (
    hoursError
  ) {
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
  } =
    await supabase
      .from(
        "slots"
      )
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
      .order(
        "start_at"
      );

  if (
    slotsError
  ) {
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
  } =
    await supabase
      .from(
        "bookings"
      )
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

  if (
    bookingsError
  ) {
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
  } =
    await supabase
      .from(
        "business_blocks"
      )
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
      .order(
        "start_at"
      );

  if (
    blocksError
  ) {
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
  } =
    await supabase
      .from(
        "manual_bookings"
      )
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
      .order(
        "start_at"
      );

  if (
    manualBookingsError
  ) {
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
    (
      bookings ??
      []
    ).map(
      (
        booking
      ) => ({
        ...booking,

        profiles:
          Array.isArray(
            booking.profiles
          )
            ? booking.profiles[
                0
              ] ??
              null
            : booking.profiles,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[
                0
              ] ??
              null
            : booking.services,

        slots:
          Array.isArray(
            booking.slots
          )
            ? booking.slots[
                0
              ] ??
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
    (
      manualBookings ??
      []
    ).map(
      (
        booking
      ) => ({
        ...booking,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[
                0
              ] ??
              null
            : booking.services,
      })
    );

  return (
    <>
      <Header />

      <main className="agenda11">
        <div className="agenda11-shell">
        <section className="agenda11-hero">
          <div className="agenda11-hero-copy">
            <span className="agenda11-eyebrow">
              <CalendarDays size={14} strokeWidth={2.2} aria-hidden="true" />
              Slottye Business
            </span>

            <h1>Agenda</h1>

            <p>Gestiona visualmente las citas y la disponibilidad semanal de {business.name}.</p>
          </div>

          <div className="agenda11-hero-actions">
            {fromSetup && (
              <Link
                href="/business-dashboard/setup"
                className="btn primary"
              >
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
                Volver a la configuración inicial
              </Link>
            )}
            {!fromSetup && (
              <Link
                href="/account"
                className="btn"
              >
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
                Volver a mi panel
              </Link>
            )}
          </div>
        </section>

        <nav className="agenda11-utilities" aria-label="Herramientas de agenda">
          <GoogleCalendarAgendaButton businessId={business.id} />

          {!fromSetup && (
            <Link
              href="/business-dashboard/calendar"
              className="btn agenda11-utility-link"
            >
              <CalendarRange size={15} strokeWidth={2.1} aria-hidden="true" />
              Calendario y disponibilidad
            </Link>
          )}
        </nav>

        <section className="agenda11-workspace">
          <WeeklyAgenda
            businessId={
              business.id
            }
            businessName={
              business.name
            }
            initialWeekStart={
              weekStart
                .toISOString()
            }
            services={
              services ??
              []
            }
            businessHours={
              businessHours ??
              []
            }
            initialSlots={
              slots ??
              []
            }
            initialBookings={
              normalizedBookings
            }
            initialBlocks={
              blocks ??
              []
            }
            initialManualBookings={
              normalizedManualBookings
            }
          />
        </section>

        </div>

        <style>{`
          .agenda11 {
            min-height: 100vh;
            padding: 22px 20px 58px;
            background: #f8f8fb;
          }

          .agenda11-shell {
            width: min(1450px, 100%);
            margin: 0 auto;
          }

          .agenda11-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 26px;
            padding: 21px 23px;
            border: 1px solid var(--border);
            border-radius: 20px;
            background: radial-gradient(circle at 88% 10%, rgba(112,87,245,.1), transparent 32%), #fff;
            box-shadow: 0 15px 40px rgba(31,27,48,.035);
          }

          .agenda11-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .agenda11-hero h1 {
            margin: 5px 0 5px;
            font-size: clamp(31px, 3vw, 39px);
            line-height: 1.07;
            letter-spacing: -.04em;
          }

          .agenda11-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .agenda11-hero-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: wrap;
          }

          .agenda11-hero-actions .btn,
          .agenda11-utilities .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          .agenda11-utilities {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 10px;
          }

          .agenda11-utilities .btn {
            min-height: 34px;
            padding: 7px 11px;
            border-radius: 10px;
            color: var(--muted);
            font-size: 11px;
            box-shadow: none;
          }

          .agenda11-utilities .btn:hover {
            color: var(--accent-dark);
          }

          .agenda11-workspace {
            margin-top: 14px;
            padding: 19px;
            border: 1px solid var(--border);
            border-radius: 20px;
            background: #fff;
            box-shadow: 0 12px 34px rgba(31,27,48,.03);
          }

          .agenda11-workspace > div {
            margin-top: 0 !important;
          }

          @media (max-width: 760px) {
            .agenda11 { padding: 16px 10px 44px; }
            .agenda11-hero { align-items: stretch; flex-direction: column; padding: 19px; }
            .agenda11-hero h1 { font-size: 30px; }
            .agenda11-hero-actions { display: grid; grid-template-columns: 1fr; }
            .agenda11-hero-actions > *, .agenda11-hero-actions .btn { width: 100%; }
            .agenda11-utilities { align-items: stretch; flex-direction: column; }
            .agenda11-utilities > *, .agenda11-utilities .btn { width: 100%; }
            .agenda11-workspace { min-width: 0; padding: 10px; overflow: hidden; border-radius: 16px; }
          }
        `}</style>
      </main>
    </>
  );
}
