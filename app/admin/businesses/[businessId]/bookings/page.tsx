import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CalendarDays,
  ExternalLink,
} from "lucide-react";

import { Header } from "@/components/Header";
import { AdminContent, AdminPageHeader, AdminShell, AdminSubnav } from "@/components/admin/AdminShell";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
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
  } =
    await params;

  const {
    user,
  } =
    await requireActiveUser();

  const admin = createAdminClient();
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  /*
   * ============================================================
   * SOLO ADMIN
   * ============================================================
   */

  if (
    !adminProfile?.is_admin
  ) {
    redirect(
      "/account"
    );
  }

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data: business,
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
        slug
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
      "Error loading admin business:",
      businessError
    );
  }

  if (
    !business
  ) {
    redirect(
      "/admin/businesses"
    );
  }

  /*
   * ============================================================
   * RESERVAS
   * ============================================================
   */

  const {
    data: bookings,
    error:
      bookingsError,
  } =
    await admin
      .from(
        "bookings"
      )
      .select(`
        id,
        user_id,
        status,
        created_at,
        cancelled_at,
        status_updated_at,

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

  if (
    bookingsError
  ) {
    console.error(
      "Error loading admin business bookings:",
      bookingsError
    );
  }

  /*
   * ============================================================
   * NORMALIZAR RELACIONES
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

        slots:
          Array.isArray(
            booking.slots
          )
            ? booking.slots[
                0
              ] ??
              null
            : booking.slots,

        services:
          Array.isArray(
            booking.services
          )
            ? booking.services[
                0
              ] ??
              null
            : booking.services,

        profiles:
          Array.isArray(
            booking.profiles
          )
            ? booking.profiles[
                0
              ] ??
              null
            : booking.profiles,
      })
    );

  return (
    <>
      <Header />

      <AdminShell maxWidth={1180}>
        <AdminPageHeader eyebrow="Gestión" title="Reservas" description={`Gestiona las reservas de ${business.name}.`}>
            <AdminSubnav>
              <Link
                href="/admin/businesses"
                className="btn"
              >
                ← Volver a negocios
              </Link>

              <Link
                href={`/business/${business.slug}`}
                className="btn"
              >
                Ver ficha pública

                <ExternalLink
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Link>

              <Link
                href={`/admin/businesses/${business.id}/agenda`}
                className="btn primary"
              >
                <CalendarDays
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                Abrir agenda
              </Link>
            </AdminSubnav>
        </AdminPageHeader>
        <AdminContent>
          <BusinessBookingsManager
            paginationPath={`/admin/businesses/${business.id}/bookings`}
            initialBookings={
              normalizedBookings
            }
          />
        </AdminContent>

        <style>{`
          .admin-bookings-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .admin-bookings-shell {
            width: min(1180px, 100%);
            margin: 0 auto;
          }

          .admin-bookings-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 24px 26px;
            border: 1px solid var(--border);
            border-radius: 20px;
            background:
              radial-gradient(
                circle at 88% 12%,
                rgba(112, 87, 245, .09),
                transparent 30%
              ),
              #fff;
            box-shadow:
              0 16px 42px
              rgba(31, 27, 48, .035);
          }

          .admin-bookings-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .admin-bookings-hero h1 {
            margin: 6px 0 5px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .admin-bookings-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .admin-bookings-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: wrap;
          }

          .admin-bookings-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          @media (max-width: 760px) {
            .admin-bookings-page {
              padding: 18px 12px 46px;
            }

            .admin-bookings-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .admin-bookings-hero h1 {
              font-size: 30px;
            }

            .admin-bookings-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .admin-bookings-actions .btn {
              width: 100%;
            }
          }
        `}</style>
      </AdminShell>
    </>
  );
}
