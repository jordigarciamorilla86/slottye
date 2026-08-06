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

export default async function AdminNotificationsPage() {
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

  const {
    data:
      notifications,
    error:
      notificationsError,
  } =
    await admin
      .from(
        "notifications"
      )
      .select(`
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
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        1000
      );

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
            Centro de notificaciones
          </h1>

          <p className="muted">
            Consulta los correos registrados por Slottye, sus destinatarios y su estado de envío.
          </p>

          <div
            style={{
              marginTop:
                16,

              padding:
                "12px 14px",

              borderRadius:
                12,

              border:
                "1px solid #ddd6fe",

              background:
                "#f5f3ff",

              color:
                "#5b21b6",

              fontSize:
                13,
            }}
          >
            Se muestran las 1.000 notificaciones más recientes.
          </div>

          <AdminNotificationsManager
            initialNotifications={
              normalizedNotifications
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