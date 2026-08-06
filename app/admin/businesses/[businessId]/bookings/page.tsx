import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { Header } from "@/components/Header";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import BusinessBookingsManager from "@/app/business-dashboard/bookings/BusinessBookingsManager";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessBookingsPage({
  params,
}: Props) {
  const {
    businessId,
  } = await params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  /*
   * ============================================================
   * COMPROBAR SESIÓN
   * ============================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * COMPROBAR SUPER ADMIN
   * ============================================================
   */

  const {
    data:
      adminProfile,
    error:
      adminProfileError,
  } =
    await admin
      .from("profiles")
      .select(`
        id,
        is_admin
      `)
      .eq("id", user.id)
      .maybeSingle();

  if (adminProfileError) {
    console.error(
      "Error checking admin business bookings access:",
      adminProfileError
    );
  }

  if (!adminProfile?.is_admin) {
    redirect("/");
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
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        active
      `)
      .eq("id", businessId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "Error loading admin business bookings business:",
      businessError
    );
  }

  if (!business) {
    notFound();
  }

  /*
   * ============================================================
   * RESERVAS
   * ============================================================
   */

  const {
    data:
      bookings,
    error:
      bookingsError,
  } =
    await admin
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
      .eq(
        "business_id",
        business.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (bookingsError) {
    console.error(
      "Error loading admin business bookings:",
      bookingsError
    );
  }

  const normalizedBookings =
    (bookings ?? []).map(
      (booking) => ({
        ...booking,

        slots:
          Array.isArray(
            booking.slots
          )
            ? booking.slots[0] ??
              null
            : booking.slots,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[0] ??
              null
            : booking.services,

        profiles:
          Array.isArray(
            booking.profiles
          )
            ? booking.profiles[0] ??
              null
            : booking.profiles,
      })
    );

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            1050,
        }}
      >
        <section
          className="panel"
          style={{
            borderColor:
              "#c4b5fd",

            background:
              "linear-gradient(135deg, #f5f3ff 0%, #ffffff 75%)",
          }}
        >
          <div className="kicker">
            Slottye Super Admin
          </div>

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "flex-start",

              gap:
                18,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h1 className="business-title">
                Reservas de {business.name}
              </h1>

              <p
                className="muted"
                style={{
                  marginBottom:
                    0,
                }}
              >
                Estás gestionando las reservas y el historial de este negocio como super administrador.
              </p>
            </div>

            <span
              style={{
                padding:
                  "6px 11px",

                borderRadius:
                  999,

                background:
                  business.active
                    ? "#dcfce7"
                    : "#fee2e2",

                color:
                  business.active
                    ? "#166534"
                    : "#b91c1c",

                fontSize:
                  12,

                fontWeight:
                  800,
              }}
            >
              {business.active
                ? "NEGOCIO ACTIVO"
                : "NEGOCIO INACTIVO"}
            </span>
          </div>

          <div
            style={{
              display:
                "flex",

              gap:
                10,

              flexWrap:
                "wrap",

              marginTop:
                20,
            }}
          >
            <Link
              href={`/admin/businesses/${business.id}`}
              className="btn primary"
            >
              ← Volver al negocio
            </Link>

            <Link
              href={`/admin/businesses/${business.id}/agenda`}
              className="btn"
            >
              📅 Gestionar agenda
            </Link>

            <Link
              href={`/business/${business.slug}`}
              className="btn"
            >
              Ver ficha pública
            </Link>
          </div>
        </section>

        <section
          className="panel"
          style={{
            marginTop:
              16,
          }}
        >
          <BusinessBookingsManager
            initialBookings={
              normalizedBookings
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
          <Link
            href="/admin/businesses"
            className="btn"
          >
            ← Volver a negocios
          </Link>

          <Link
            href="/admin"
            className="btn"
          >
            Panel de administración
          </Link>
        </section>
      </main>
    </>
  );
}