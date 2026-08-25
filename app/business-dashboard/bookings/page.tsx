import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

import BusinessBookingsManager from "./BusinessBookingsManager";

const BOOKINGS_PER_PAGE = 6;

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default async function BusinessBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    upcomingPage?: string;
    pendingPage?: string;
    historyPage?: string;
  }>;
}) {
  const params = await searchParams;
  const upcomingPage = parsePage(params.upcomingPage);
  const pendingPage = parsePage(params.pendingPage);
  const historyPage = parsePage(params.historyPage);
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
    data: business,
  } =
    await supabase
      .from(
        "businesses"
      )
      .select(
        "id,name,slug"
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

  const select = `
    id,
    user_id,
    status,
    created_at,
    cancelled_at,
    status_updated_at,
    slots!inner (id,start_at,end_at),
    services (id,name,duration_minutes),
    profiles (id,name,email)
  `;
  const now = new Date().toISOString();
  const range = (page: number) => ({
    from: (page - 1) * BOOKINGS_PER_PAGE,
    to: page * BOOKINGS_PER_PAGE - 1,
  });
  const upcomingRange = range(upcomingPage);
  const pendingRange = range(pendingPage);
  const historyRange = range(historyPage);

  const [upcomingResult, pendingResult, historyResult, completedResult, noShowResult, cancelledResult] =
    await Promise.all([
      supabase
      .from(
        "bookings"
      )
        .select(select, { count: "exact" })
        .eq("business_id", business.id)
        .eq("status", "CONFIRMED")
        .gt("slots.start_at", now)
        .order("start_at", { referencedTable: "slots", ascending: true })
        .range(upcomingRange.from, upcomingRange.to),
      supabase
        .from("bookings")
        .select(select, { count: "exact" })
        .eq("business_id", business.id)
        .eq("status", "CONFIRMED")
        .lte("slots.start_at", now)
        .order("start_at", { referencedTable: "slots", ascending: false })
        .range(pendingRange.from, pendingRange.to),
      supabase
        .from("bookings")
        .select(select, { count: "exact" })
        .eq("business_id", business.id)
        .neq("status", "CONFIRMED")
        .order("status_updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(historyRange.from, historyRange.to),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "COMPLETED"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "NO_SHOW"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", business.id).like("status", "CANCELLED_%"),
    ]);

  const queryError = upcomingResult.error ?? pendingResult.error ?? historyResult.error ?? completedResult.error ?? noShowResult.error ?? cancelledResult.error;
  if (queryError) console.error("Error loading business bookings:", queryError);

  const normalized =
    (
      [
        ...(upcomingResult.data ?? []),
        ...(pendingResult.data ?? []),
        ...(historyResult.data ?? []),
      ]
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

      <main className="bookings-page">
        <div className="bookings-page-shell">
          <section className="bookings-page-hero">
            <div>
              <span className="bookings-page-kicker">
                Gestión
              </span>

              <h1>
                Reservas
              </h1>

              <p>
                Gestiona las reservas de {business.name}.
              </p>
            </div>

            <div className="bookings-page-actions">
              <Link
                href="/business-dashboard/agenda"
                className="btn primary"
              >
                <CalendarDays
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                Abrir agenda
              </Link>

              <Link
                href="/account"
                className="btn"
              >
                <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
                Volver a mi panel
              </Link>
            </div>
          </section>

          <BusinessBookingsManager
            key={`${upcomingPage}-${pendingPage}-${historyPage}-${upcomingResult.count}-${pendingResult.count}-${historyResult.count}`}
            initialBookings={
              normalized
            }
            pagination={{
              upcoming: { page: upcomingPage, total: upcomingResult.count ?? 0 },
              pending: { page: pendingPage, total: pendingResult.count ?? 0 },
              history: { page: historyPage, total: historyResult.count ?? 0 },
            }}
            statusTotals={{
              completed: completedResult.count ?? 0,
              noShow: noShowResult.count ?? 0,
              cancelled: cancelledResult.count ?? 0,
            }}
          />
        </div>

        <style>{`
          .bookings-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .bookings-page-shell {
            width: min(1180px,100%);
            margin: 0 auto;
          }

          .bookings-page-hero {
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
                rgba(112,87,245,.09),
                transparent 30%
              ),
              #fff;
            box-shadow:
              0 16px 42px
              rgba(31,27,48,.035);
          }

          .bookings-page-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .bookings-page-hero h1 {
            margin: 6px 0 5px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .bookings-page-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .bookings-page-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: wrap;
          }

          .bookings-page-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          @media (max-width: 700px) {
            .bookings-page {
              padding: 18px 12px 46px;
            }

            .bookings-page-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .bookings-page-hero h1 {
              font-size: 30px;
            }

            .bookings-page-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .bookings-page-actions .btn {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </>
  );
}
