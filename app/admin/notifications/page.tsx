import Link from "next/link";

import {
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

import AdminNotificationsManager from "./AdminNotificationsManager";
import { AdminContent, AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import routeStyles from "../AdminRoute.module.css";

const PAGE_SIZE = 20;
const STATUSES = new Set(["PENDING", "SENT", "FAILED"]);
const TYPES = new Set(["BOOKING_CONFIRMATION", "BOOKING_CANCELLATION", "BOOKING_REMINDER", "NEW_SLOTS", "SLOT_AVAILABLE", "BOOKING_RESCHEDULED", "REVIEW_REQUEST"]);

export default async function AdminNotificationsPage({ searchParams }: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = (params.q ?? "").trim().slice(0, 120);
  const safeSearch = search.replace(/[,()%]/g, " ").trim();
  const statusFilter = STATUSES.has(params.status ?? "") ? params.status! : "ALL";
  const typeFilter = TYPES.has(params.type ?? "") ? params.type! : "ALL";
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  /*
   * ============================================================
   * SESIÓN Y PERMISOS
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
    error:
      adminProfileError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(`
        id,
        name,
        email,
        is_admin
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    adminProfileError
  ) {
    console.error(
      "Error checking notification admin:",
      adminProfileError
    );
  }

  if (
    !adminProfile
      ?.is_admin
  ) {
    redirect(
      "/"
    );
  }

  /*
   * ============================================================
   * NOTIFICACIONES
   * ============================================================
   */

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [matchingProfiles, matchingBusinesses] = safeSearch
    ? await Promise.all([
        admin.from("profiles").select("id").or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`),
        admin.from("businesses").select("id").ilike("name", `%${safeSearch}%`),
      ])
    : [{ data: [] }, { data: [] }];

  let notificationsQuery = admin.from("notifications").select(`
        id,
        user_id,
        business_id,
        booking_id,
        type,
        status,
        created_at,
        sent_at,
        subject,
        metadata,

        profiles (
          id,
          name,
          email
        ),

        businesses (
          id,
          name,
          slug
        ),

        bookings (
          id,
          status
        )
      `, { count: "exact" });

  if (statusFilter !== "ALL") notificationsQuery = notificationsQuery.eq("status", statusFilter);
  if (typeFilter !== "ALL") notificationsQuery = notificationsQuery.eq("type", typeFilter);
  if (safeSearch) {
    const profileIds = (matchingProfiles.data ?? []).map((row) => row.id);
    const businessIds = (matchingBusinesses.data ?? []).map((row) => row.id);
    const clauses = [
      `subject.ilike.%${safeSearch}%`,
      ...(uuidPattern.test(search) ? [`id.eq.${search}`, `booking_id.eq.${search}`] : []),
      ...(profileIds.length ? [`user_id.in.(${profileIds.join(",")})`] : []),
      ...(businessIds.length ? [`business_id.in.(${businessIds.join(",")})`] : []),
    ];
    notificationsQuery = notificationsQuery.or(clauses.join(","));
  }

  const { data: notifications, error: notificationsError, count } = await notificationsQuery
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const totalResults = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  if (currentPage > totalPages) {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set("q", search);
    if (statusFilter !== "ALL") nextParams.set("status", statusFilter);
    if (typeFilter !== "ALL") nextParams.set("type", typeFilter);
    if (totalPages > 1) nextParams.set("page", String(totalPages));
    redirect(`/admin/notifications${nextParams.size ? `?${nextParams}` : ""}`);
  }
  const [totalResult, sentResult, pendingResult, failedResult] = await Promise.all([
    admin.from("notifications").select("id", { count: "exact", head: true }),
    admin.from("notifications").select("id", { count: "exact", head: true }).eq("status", "SENT"),
    admin.from("notifications").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("notifications").select("id", { count: "exact", head: true }).eq("status", "FAILED"),
  ]);

  if (
    notificationsError
  ) {
    console.error(
      "Error loading admin notifications:",
      notificationsError
    );
  }

  const normalizedNotifications =
    (
      notifications ??
      []
    ).map(
      (
        notification
      ) => ({
        ...notification,

        profiles:
          Array.isArray(
            notification.profiles
          )
            ? notification
                .profiles[0] ??
              null
            : notification.profiles,

        businesses:
          Array.isArray(
            notification.businesses
          )
            ? notification
                .businesses[0] ??
              null
            : notification.businesses,

        bookings:
          Array.isArray(
            notification.bookings
          )
            ? notification
                .bookings[0] ??
              null
            : notification.bookings,
      })
    );

  return (
    <>
      <Header />

      <AdminShell maxWidth={1250}>
        <AdminPageHeader title="Centro de notificaciones" description="Consulta los correos registrados por Slottye, sus destinatarios y su estado de envío." />
        <AdminContent>
          <section aria-label="Notificaciones registradas">
          <AdminNotificationsManager
            initialNotifications={
              normalizedNotifications
            }
            search={search}
            statusFilter={statusFilter as "PENDING" | "SENT" | "FAILED" | "ALL"}
            typeFilter={typeFilter as "BOOKING_CONFIRMATION" | "BOOKING_CANCELLATION" | "BOOKING_REMINDER" | "NEW_SLOTS" | "SLOT_AVAILABLE" | "BOOKING_RESCHEDULED" | "REVIEW_REQUEST" | "ALL"}
            currentPage={Math.min(currentPage, totalPages)}
            totalPages={totalPages}
            totalResults={totalResults}
            totalNotifications={totalResult.count ?? 0}
            sentCount={sentResult.count ?? 0}
            pendingCount={pendingResult.count ?? 0}
            failedCount={failedResult.count ?? 0}
          />
          </section>
        </AdminContent>
        <nav aria-label="Navegación administrativa" className={routeStyles.actions}>
          <Link
            href="/admin"
            className="btn primary"
          >
            ← Volver al panel
          </Link>

          <Link
            href="/"
            className="btn"
          >
            Volver a Slottye
          </Link>
        </nav>
      </AdminShell>
    </>
  );
}
