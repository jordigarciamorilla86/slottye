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

export default async function AdminAuditPage() {
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

  const {
    data:
      logs,
    error:
      logsError,
  } =
    await admin
      .from(
        "admin_audit_logs"
      )
      .select(`
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
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        2000
      );

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

      <main
        className="shell detail"
        style={{
          maxWidth:
            1250,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Super Admin
          </div>

          <h1 className="business-title">
            Auditoría administrativa
          </h1>

          <p className="muted">
            Consulta las acciones realizadas desde el panel de administración y los valores modificados.
          </p>

          <div
            style={{
              marginTop:
                16,

              padding:
                "12px 14px",

              border:
                "1px solid #ddd6fe",

              borderRadius:
                12,

              background:
                "#f5f3ff",

              color:
                "#5b21b6",

              fontSize:
                13,
            }}
          >
            Se muestran los 2.000 registros más recientes.
          </div>

          <AdminAuditManager
            initialLogs={
              normalizedLogs
            }
          />
        </section>

        <section
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
        </section>
      </main>
    </>
  );
}