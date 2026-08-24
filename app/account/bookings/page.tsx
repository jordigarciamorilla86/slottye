import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import BookingsManager from "./BookingsManager";
import type { Booking } from "./BookingsManager";
import {
  paginateBookingHistory,
  selectHistoryPageRows,
  type BookingIndexRow,
} from "./historyPagination";

type Props = {
  searchParams:
    Promise<{
      review?: string;
      upcomingPage?: string;
      historyPage?: string;
      reviewPage?: string;
    }>;
};

const PAGE_SIZE = 6;

const BOOKING_SELECT = `
  id, status, created_at, cancelled_at,
  slots (id, start_at, end_at),
  businesses (id, name, slug, address, city, allow_cancellations, min_cancellation_notice_hours),
  services (id, name, duration_minutes),
  reviews (id, rating, comment, created_at, updated_at)
`;

function pageNumber(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeBooking(booking: Record<string, unknown>): Booking {
  const first = (value: unknown) =>
    Array.isArray(value) ? value[0] ?? null : value;

  return {
    ...booking,
    slots: first(booking.slots),
    businesses: first(booking.businesses),
    services: first(booking.services),
    reviews: first(booking.reviews),
  } as unknown as Booking;
}

export default async function BookingsPage({
  searchParams,
}: Props) {
  const {
    review, upcomingPage: upcomingPageParam,
    historyPage: historyPageParam, reviewPage: reviewPageParam,
  } =
    await searchParams;

  const {
    supabase,
    user,
  } =
    await requireActiveUser();

  const now = new Date().toISOString();
  const upcomingPage = pageNumber(upcomingPageParam);
  const historyPage = pageNumber(historyPageParam);
  const reviewPage = pageNumber(reviewPageParam);

  // Classify and order the parent bookings before applying pagination. Ordering
  // an embedded `slots` relation does not reliably order the booking rows.
  // The total and the rendered page must come from the exact same RLS-visible
  // result set. Refetching a page by ID could lose rows with hidden embedded
  // relations and produced sparse or empty pages.
  const { data: bookingIndexRows, error: bookingIndexError } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("user_id", user.id);

  const historyPagination = paginateBookingHistory(
    (bookingIndexRows ?? []) as BookingIndexRow[], now, historyPage, PAGE_SIZE,
  );
  const { upcomingIds, total: historyTotal,
    page: validHistoryPage, historyIds: historyPageIds } = historyPagination;
  if (validHistoryPage !== historyPage) {
    const params = new URLSearchParams();
    if (upcomingPage > 1) params.set("upcomingPage", String(upcomingPage));
    if (validHistoryPage > 1) params.set("historyPage", String(validHistoryPage));
    if (reviewPage > 1) params.set("reviewPage", String(reviewPage));
    if (review) params.set("review", review);
    redirect(`/account/bookings${params.size ? `?${params}` : ""}#historial`);
  }

  const upcomingFrom = (upcomingPage - 1) * PAGE_SIZE;
  const reviewFrom = (reviewPage - 1) * PAGE_SIZE;
  const historyPageRows = selectHistoryPageRows(
    bookingIndexRows ?? [],
    historyPageIds,
  );

  const [upcomingResult, pendingResult, completedResult,
    cancelledResult, highlightedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(BOOKING_SELECT, { count: "exact" }).eq("user_id", user.id)
      .eq("status", "CONFIRMED").in("id", upcomingIds.length ? upcomingIds : ["00000000-0000-0000-0000-000000000000"])
      .order("start_at", { referencedTable: "slots", ascending: true })
      .range(upcomingFrom, upcomingFrom + PAGE_SIZE - 1),
    supabase.from("bookings").select(BOOKING_SELECT, { count: "exact" })
      .eq("user_id", user.id).eq("status", "COMPLETED").is("reviews", null)
      .order("created_at", { ascending: false }).range(reviewFrom, reviewFrom + PAGE_SIZE - 1),
    supabase.from("bookings").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("status", "COMPLETED"),
    supabase.from("bookings").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).like("status", "CANCELLED_%"),
    review ? supabase.from("bookings").select(BOOKING_SELECT).eq("user_id", user.id)
      .eq("id", review).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  const errors = [bookingIndexError, upcomingResult.error,
    pendingResult.error, completedResult.error, cancelledResult.error, highlightedResult.error].filter(Boolean);
  if (errors.length) console.error("Error loading bookings:", errors);

  const merged = [...(upcomingResult.data ?? []), ...historyPageRows,
    ...(pendingResult.data ?? []), ...(highlightedResult.data ? [highlightedResult.data] : [])];
  const normalizedBookings = Array.from(new Map(merged.map((booking) => [booking.id,
    normalizeBooking(booking as unknown as Record<string, unknown>)])).values());

  return (
    <>
      <Header />

      <main className="bookings-page">
        <div className="bookings-page-shell">
          <section className="bookings-page-hero">
            <div>
              <span className="bookings-page-kicker">
                Mi Slottye
              </span>

              <h1>
                Mis citas
              </h1>

              <p>
                Consulta tus próximas citas y tu historial.
              </p>
            </div>

            <Link
              href="/account"
              className="btn bookings-page-back"
            >
              <ArrowLeft
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />

              Volver a mi panel
            </Link>
          </section>

          <section className="bookings-page-content">
            <BookingsManager
              key={`${upcomingPage}:${validHistoryPage}:${reviewPage}:${historyPageIds.join(",")}`}
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
              upcomingIds={(upcomingResult.data ?? []).map((booking) => booking.id)}
              historyIds={historyPageRows.map((booking) => booking.id)}
              pendingReviewIds={(pendingResult.data ?? []).map((booking) => booking.id)}
              upcomingPage={upcomingPage}
              historyPage={validHistoryPage}
              reviewPage={reviewPage}
              totals={{
                upcoming: upcomingResult.count ?? 0,
                history: historyTotal,
                pendingReviews: pendingResult.count ?? 0,
                completed: completedResult.count ?? 0,
                cancelled: cancelledResult.count ?? 0,
              }}
              pageSize={PAGE_SIZE}
            />
          </section>
        </div>

        <style>{`
          .bookings-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .bookings-page-shell {
            width: min(900px, 100%);
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
                rgba(112, 87, 245, .09),
                transparent 30%
              ),
              #fff;

            box-shadow:
              0 16px 42px
              rgba(31, 27, 48, .035);
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
            line-height: 1.5;
          }

          .bookings-page-back {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;

            flex: 0 0 auto;
          }

          .bookings-page-back svg {
            display: block;
            margin: 0;
            flex: 0 0 auto;
          }

          .bookings-page-content {
            margin-top: 16px;
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

            .bookings-page-back {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </>
  );
}
