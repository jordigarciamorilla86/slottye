import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { AdminContent, AdminPageHeader, AdminShell, EmptyState, StatusBadge } from "@/components/admin/AdminShell";
import { ServerPagination } from "@/components/ServerPagination";
import { createClient } from "@/lib/supabase/server";
import AdminUserBlockButton from "./AdminUserBlockButton";
import AdminUserDeleteButton from "./AdminUserDeleteButton";
import collectionStyles from "../AdminCollections.module.css";

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; user?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const selectedUserId = params.user?.trim() || null;
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const supabase =
    await createClient();

  /*
   * ============================================================
   * USUARIO
   * ============================================================
   */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * COMPROBAR ADMIN
   * ============================================================
   */

  const {
    data: adminProfile,
  } =
    await supabase
      .from("profiles")
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
      .single();

  if (
    !adminProfile?.is_admin
  ) {
    redirect("/");
  }

  /*
   * ============================================================
   * USUARIOS
   * ============================================================
   */

  let usersQuery = supabase
    .from("profiles")
    .select(`
      id,
      name,
      email,
      avatar_url,
      role,
      created_at,
      updated_at,
      is_admin,
      is_blocked
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (selectedUserId) {
    usersQuery = usersQuery.eq("id", selectedUserId);
  }

  const {
    data: users,
    error,
    count,
  } =
    await usersQuery
      .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  if (error) {
    console.error(
      "Error loading admin users:",
      error
    );
  }

  /*
   * ============================================================
   * FORMATO FECHA
   * ============================================================
   */

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      <Header />

      <AdminShell maxWidth={1180}>
        <AdminPageHeader
          title={selectedUserId ? "Propietario del negocio" : "Usuarios"}
          description={selectedUserId ? "Consulta y gestiona directamente esta cuenta." : "Consulta y gestiona las cuentas registradas en Slottye."}
        >
          {selectedUserId && <Link href="/admin/users" className="btn">Ver todos los usuarios</Link>}
        </AdminPageHeader>
        <AdminContent>
        <section className={`panel ${collectionStyles.panel}`}>

          <div
            className={collectionStyles.grid}
            style={{
              marginTop:
                24,

              display:
                "grid",

              gap:
                12,
            }}
          >
            {(users ?? []).map(
              (
                profile
              ) => (
                <div
                  key={
                    profile.id
                  }
                  className="card"
                >
                  <div className="card-body">
                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          16,

                        alignItems:
                          "flex-start",

                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              10,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                18,
                            }}
                          >
                            {profile.name?.trim() ||
                              "Sin nombre"}
                          </strong>

                          {profile.is_admin && (
                            <StatusBadge tone="accent">ADMIN</StatusBadge>
                          )}

                          {profile.is_blocked && (
                            <StatusBadge tone="danger">BLOQUEADO</StatusBadge>
                          )}
                        </div>

                        <div
                          className="muted"
                          style={{
                            marginTop:
                              6,
                          }}
                        >
                          {profile.email ??
                            "Sin email"}
                        </div>

                        <div
                          style={{
                            marginTop:
                              10,

                            display:
                              "flex",

                            gap:
                              10,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span
                            className="muted"
                            style={{
                              fontSize:
                                13,
                            }}
                          >
                            Tipo:{" "}
                            <strong>
                              {profile.role ===
                              "business"
                                ? "Negocio"
                                : "Cliente"}
                            </strong>
                          </span>

                          <span
                            className="muted"
                            style={{
                              fontSize:
                                13,
                            }}
                          >
                            Alta:{" "}
                            <strong>
                              {formatDate(
                                profile.created_at
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div
                        className="muted"
                        style={{
                          fontSize:
                            12,

                          maxWidth:
                            280,

                          wordBreak:
                            "break-all",
                        }}
                      >
                        ID:{" "}
                        {profile.id}
                      </div>
                    </div>

                    {/* ==========================================
                        ACCIONES
                        ========================================== */}

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
                      <AdminUserBlockButton
                        userId={
                          profile.id
                        }
                        userName={
                          profile.name?.trim() ||
                          profile.email ||
                          "Usuario"
                        }
                        blocked={
                          profile.is_blocked
                        }
                        isAdmin={
                          profile.is_admin
                        }
                      />
                      <AdminUserDeleteButton
  userId={
    profile.id
  }
  userName={
    profile.name?.trim() ||
    profile.email ||
    "Usuario"
  }
  isAdmin={
    profile.is_admin
  }
/>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {(users ?? [])
            .length ===
            0 && (
            <EmptyState title="No hay usuarios registrados" />
          )}

          <ServerPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pathname="/admin/users"
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
            href="/admin"
            className="btn"
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
        </AdminContent>
      </AdminShell>
    </>
  );
}
