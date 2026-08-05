import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  Header,
} from "@/components/Header";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import WeeklyAgenda from "@/app/business-dashboard/agenda/WeeklyAgenda";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessAgendaPage({
  params,
}: Props) {
  const {
    businessId,
  } =
    await params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  /*
   * ============================================================
   * COMPROBAR ADMINISTRADOR
   * ============================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      adminProfile,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(`
        id,
        is_admin
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    !adminProfile?.is_admin
  ) {
    redirect(
      "/"
    );
  }

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        slug,
        active
      `)
      .eq(
        "id",
        businessId
      )
      .maybeSingle();

  if (
    businessError
  ) {
    console.error(
      "Error loading admin agenda business:",
      businessError
    );
  }

  if (
    !business
  ) {
    notFound();
  }

  /*
   * ============================================================
   * SEMANA ACTUAL
   * ============================================================
   */

  const now =
    new Date();

  const currentDay =
    now.getDay();

  const diffToMonday =
    currentDay ===
    0
      ? -6
      : 1 -
        currentDay;

  const weekStart =
    new Date(
      now
    );

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
    new Date(
      weekStart
    );

  weekEnd.setDate(
    weekStart.getDate() +
      7
  );

  /*
   * ============================================================
   * SERVICIOS Y HORARIOS
   * ============================================================
   */

  const [
    servicesResult,
    hoursResult,
  ] =
    await Promise.all([
      admin
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
        ),

      admin
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
        ),
    ]);

  if (
    servicesResult.error
  ) {
    console.error(
      "Error loading admin agenda services:",
      servicesResult.error
    );
  }

  if (
    hoursResult.error
  ) {
    console.error(
      "Error loading admin agenda hours:",
      hoursResult.error
    );
  }

  /*
   * ============================================================
   * SLOTS INICIALES
   * ============================================================
   */

  const {
    data:
      slots,
    error:
      slotsError,
  } =
    await admin
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
    slotsError
  ) {
    console.error(
      "Error loading initial admin agenda slots:",
      slotsError
    );
  }

  const slotIds =
    (
      slots ??
      []
    ).map(
      (
        slot
      ) =>
        slot.id
    );

  /*
   * ============================================================
   * RESERVAS INICIALES
   * ============================================================
   */

  let normalizedBookings:
    {
      id: string;
      slot_id: string;
      user_id: string | null;
      service_id: string | null;
      status: string;
      cancelled_at: string | null;
      profiles: {
        id: string;
        name: string | null;
        email: string | null;
      } | null;
      services: {
        id: string;
        name: string;
        duration_minutes: number;
      } | null;
      slots: {
        id: string;
        start_at: string;
        end_at: string;
        status: string;
      } | null;
    }[] =
    [];

  if (
    slotIds.length >
    0
  ) {
    const {
      data:
        bookings,
      error:
        bookingsError,
    } =
      await admin
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
        )
        .in(
          "slot_id",
          slotIds
        );

    if (
      bookingsError
    ) {
      console.error(
        "Error loading initial admin agenda bookings:",
        bookingsError
      );
    }

    normalizedBookings =
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
              ? booking
                  .profiles[0] ??
                null
              : booking.profiles,

          services:
            Array.isArray(
              booking.services
            )
              ? booking
                  .services[0] ??
                null
              : booking.services,

          slots:
            Array.isArray(
              booking.slots
            )
              ? booking
                  .slots[0] ??
                null
              : booking.slots,
        })
      );
  }

  /*
   * ============================================================
   * BLOQUEOS Y RESERVAS MANUALES
   * ============================================================
   */

  const [
    blocksResult,
    manualResult,
  ] =
    await Promise.all([
      admin
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
        ),

      admin
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
        ),
    ]);

  const normalizedManualBookings =
    (
      manualResult.data ??
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
            ? booking
                .services[0] ??
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
          maxWidth:
            1450,
        }}
      >
        <section
          className="panel"
          style={{
            marginBottom:
              16,

            borderColor:
              "#c4b5fd",

            background:
              "linear-gradient(135deg, #f5f3ff 0%, #ffffff 75%)",
          }}
        >
          <div className="kicker">
            Slottye Super Admin
          </div>

          <h1 className="business-title">
            Agenda de {business.name}
          </h1>

          <p className="muted">
            Estás gestionando esta agenda como super administrador.
            Los cambios afectan directamente al negocio y a sus clientes.
          </p>

          {!business.active && (
            <div
              style={{
                marginTop:
                  14,

                padding:
                  "11px 14px",

                border:
                  "1px solid #fecaca",

                borderRadius:
                  12,

                background:
                  "#fef2f2",

                color:
                  "#b91c1c",

                fontWeight:
                  700,
              }}
            >
              Este negocio está actualmente inactivo.
            </div>
          )}

          <div
            style={{
              marginTop:
                18,

              display:
                "flex",

              gap:
                10,

              flexWrap:
                "wrap",
            }}
          >
            <Link
              href={`/admin/businesses/${business.id}`}
              className="btn primary"
            >
              ← Volver al negocio
            </Link>

            <Link
              href={`/business/${business.slug}`}
              className="btn"
            >
              Ver ficha pública
            </Link>
          </div>
        </section>

        <section className="panel">
          <WeeklyAgenda
            businessId={
              business.id
            }
            businessName={
              business.name
            }
            initialWeekStart={
              weekStart.toISOString()
            }
            mode="admin"
            services={
              servicesResult.data ??
              []
            }
            businessHours={
              hoursResult.data ??
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
              blocksResult.data ??
              []
            }
            initialManualBookings={
              normalizedManualBookings
            }
          />
        </section>
      </main>
    </>
  );
}