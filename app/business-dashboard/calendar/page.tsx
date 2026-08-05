import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  Header,
} from "@/components/Header";

import {
  requireActiveUser,
} from "@/lib/auth/requireActiveUser";

import CalendarManager from "./CalendarManager";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function CalendarPage({
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
  } =
    await requireActiveUser();

  if (
    profile?.role !==
    "business"
  ) {
    redirect(
      "/account"
    );
  }

  const {
    data:
      business,
  } =
    await supabase
      .from(
        "businesses"
      )
      .select(
        "id,name"
      )
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

  const {
    data:
      services,
  } =
    await supabase
      .from(
        "services"
      )
      .select(
        "id,name,duration_minutes"
      )
      .eq(
        "business_id",
        business.id
      )
      .eq(
        "active",
        true
      )
      .order(
        "name"
      );

  const {
    data:
      slots,
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
        new Date().toISOString()
      )
      .order(
        "start_at"
      );

  const {
    data:
      businessHours,
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

  const {
    data:
      businessBlocks,
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
      .gte(
        "end_at",
        new Date().toISOString()
      )
      .order(
        "start_at"
      );

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            900,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Calendario y citas
          </h1>

          <p className="muted">
            Crea y gestiona las citas disponibles de{" "}
            {business.name}.
          </p>

          <CalendarManager
            businessId={
              business.id
            }
            services={
              services ??
              []
            }
            initialSlots={
              slots ??
              []
            }
            businessHours={
              businessHours ??
              []
            }
            initialBlocks={
              businessBlocks ??
              []
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
                ? "/business-dashboard/agenda?setup=1"
                : "/business-dashboard/agenda"
            }
            className="btn"
          >
            Abrir agenda
          </Link>
        </section>
      </main>
    </>
  );
}