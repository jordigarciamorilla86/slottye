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

import AdminAuditManager from "./AdminAuditManager";
import { AdminContent, AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import routeStyles from "../AdminRoute.module.css";

const PAGE_SIZE = 25;

export default async function AdminAuditPage({ searchParams }: {
  searchParams: Promise<{ page?: string; q?: string; entity?: string; action?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = (params.q ?? "").trim().slice(0, 120);
  const safeSearch = search.replace(/[,()%]/g, " ").trim();
  const entityFilter = (params.entity ?? "ALL").slice(0, 80);
  const actionFilter = (params.action ?? "ALL").slice(0, 100);
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
      "Error checking audit admin:",
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
   * REGISTROS DE AUDITORÍA
   * ============================================================
   */

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [matchingProfiles, matchingBusinesses] = safeSearch
    ? await Promise.all([
        admin.from("profiles").select("id").or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`),
        admin.from("businesses").select("id").ilike("name", `%${safeSearch}%`),
      ])
    : [{ data: [] }, { data: [] }];

  let logsQuery = admin.from("admin_audit_logs").select(`
        id,
        admin_user_id,
        action,
        entity_type,
        entity_id,
        business_id,
        target_user_id,
        description,
        old_values,
        new_values,
        metadata,
        created_at
      `, { count: "exact" });

  if (entityFilter !== "ALL") logsQuery = logsQuery.eq("entity_type", entityFilter);
  if (actionFilter !== "ALL") logsQuery = logsQuery.eq("action", actionFilter);
  if (safeSearch) {
    const profileIds = (matchingProfiles.data ?? []).map((row) => row.id);
    const businessIds = (matchingBusinesses.data ?? []).map((row) => row.id);
    const clauses = [
      `description.ilike.%${safeSearch}%`,
      `action.ilike.%${safeSearch}%`,
      `entity_type.ilike.%${safeSearch}%`,
      ...(uuidPattern.test(search) ? [`entity_id.eq.${search}`] : []),
      ...(profileIds.length ? [`admin_user_id.in.(${profileIds.join(",")})`, `target_user_id.in.(${profileIds.join(",")})`] : []),
      ...(businessIds.length ? [`business_id.in.(${businessIds.join(",")})`] : []),
    ];
    logsQuery = logsQuery.or(clauses.join(","));
  }

  const { data: logs, error: logsError, count } = await logsQuery
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
    if (entityFilter !== "ALL") nextParams.set("entity", entityFilter);
    if (actionFilter !== "ALL") nextParams.set("action", actionFilter);
    if (totalPages > 1) nextParams.set("page", String(totalPages));
    redirect(`/admin/audit${nextParams.size ? `?${nextParams}` : ""}`);
  }

  if (
    logsError
  ) {
    console.error(
      "Error loading admin audit logs:",
      logsError
    );
  }

  const auditLogs =
    logs ??
    [];

  const { data: auditDimensions, count: totalLogs } = await admin
    .from("admin_audit_logs")
    .select("action,entity_type,target_user_id,business_id", { count: "exact" });
  const entityTypes = Array.from(new Set((auditDimensions ?? []).map((row) => row.entity_type))).sort();
  const actions = Array.from(new Set((auditDimensions ?? []).map((row) => row.action))).sort();

  const adminIds =
    Array.from(
      new Set(
        auditLogs
          .map(
            (
              log
            ) =>
              log.admin_user_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    );

  const targetUserIds =
    Array.from(
      new Set(
        auditLogs
          .map(
            (
              log
            ) =>
              log.target_user_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    );

  const businessIds =
    Array.from(
      new Set(
        auditLogs
          .map(
            (
              log
            ) =>
              log.business_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    );

  const allProfileIds =
    Array.from(
      new Set([
        ...adminIds,
        ...targetUserIds,
      ])
    );

  const [
    profilesResult,
    businessesResult,
  ] =
    await Promise.all([
      allProfileIds.length >
      0
        ? admin
            .from(
              "profiles"
            )
            .select(`
              id,
              name,
              email
            `)
            .in(
              "id",
              allProfileIds
            )
        : Promise.resolve({
            data:
              [],

            error:
              null,
          }),

      businessIds.length >
      0
        ? admin
            .from(
              "businesses"
            )
            .select(`
              id,
              name,
              slug
            `)
            .in(
              "id",
              businessIds
            )
        : Promise.resolve({
            data:
              [],

            error:
              null,
          }),
    ]);

  if (
    profilesResult.error
  ) {
    console.error(
      "Error loading audit profiles:",
      profilesResult.error
    );
  }

  if (
    businessesResult.error
  ) {
    console.error(
      "Error loading audit businesses:",
      businessesResult.error
    );
  }

  const profilesById =
    new Map(
      (
        profilesResult.data ??
        []
      ).map(
        (
          profile
        ) => [
          profile.id,
          profile,
        ]
      )
    );

  const businessesById =
    new Map(
      (
        businessesResult.data ??
        []
      ).map(
        (
          business
        ) => [
          business.id,
          business,
        ]
      )
    );

  const normalizedLogs =
    auditLogs.map(
      (
        log
      ) => ({
        ...log,

        admin_profile:
          log.admin_user_id
            ? profilesById.get(
                log.admin_user_id
              ) ??
              null
            : null,

        target_profile:
          log.target_user_id
            ? profilesById.get(
                log.target_user_id
              ) ??
              null
            : null,

        business:
          log.business_id
            ? businessesById.get(
                log.business_id
              ) ??
              null
            : null,
      })
    );

  return (
    <>
      <Header />

      <AdminShell maxWidth={1250}>
        <AdminPageHeader title="Auditoría administrativa" description="Consulta las acciones realizadas desde el panel de administración y los valores modificados." />
        <AdminContent>
          <section aria-label="Registros de auditoría">
          <AdminAuditManager
            initialLogs={
              normalizedLogs
            }
            search={search}
            entityFilter={entityFilter}
            actionFilter={actionFilter}
            entityTypes={entityTypes}
            actions={actions}
            currentPage={Math.min(currentPage, totalPages)}
            totalPages={totalPages}
            totalResults={totalResults}
            totalLogs={totalLogs ?? 0}
            affectedUsers={new Set((auditDimensions ?? []).map((row) => row.target_user_id).filter(Boolean)).size}
            affectedBusinesses={new Set((auditDimensions ?? []).map((row) => row.business_id).filter(Boolean)).size}
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
