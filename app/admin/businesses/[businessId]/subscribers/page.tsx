import Link from "next/link";

import {
  notFound,
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

import AdminSubscribersManager from "./AdminSubscribersManager";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessSubscribersPage({
  params,
}: Props) {
  const {
    businessId,
  } =
    await params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  /*
   * ============================================================
   * COMPROBAR ADMINISTRADOR
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
  } =
    await admin
      .from(
        "profiles"
      )
      .select(`
        id,
        is_admin
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

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
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        slug,
        active
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
      "Error loading admin subscribers business:",
      businessError
    );
  }

  if (
    !business
  ) {
    notFound();
  }

  /*
   * ============================================================
   * SUSCRIPTORES
   * ============================================================
   */

  const {
    data:
      subscriptions,
    error:
      subscriptionsError,
  } =
    await admin
      .from(
        "business_subscriptions"
      )
      .select(`
        id,
        user_id,
        business_id,
        email_enabled,
        created_at,

        profiles (
          id,
          name,
          email,
          is_blocked
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
    subscriptionsError
  ) {
    console.error(
      "Error loading admin business subscribers:",
      subscriptionsError
    );
  }

  const normalizedSubscriptions =
    (
      subscriptions ??
      []
    ).map(
      (
        subscription
      ) => ({
        ...subscription,

        profiles:
          Array.isArray(
            subscription.profiles
          )
            ? subscription
                .profiles[0] ??
              null
            : subscription.profiles,
      })
    );

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            1100,
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

          <h1 className="business-title">
            Suscriptores de {business.name}
          </h1>

          <p className="muted">
            Gestiona quién recibe avisos cuando este negocio publica nuevas citas.
          </p>

          {!business.active && (
            <div
              style={{
                marginTop:
                  14,

                padding:
                  "11px 14px",

                border:
                  "1px solid #fecaca",

                borderRadius:
                  12,

                background:
                  "#fef2f2",

                color:
                  "#b91c1c",

                fontWeight:
                  700,
              }}
            >
              Este negocio está actualmente inactivo.
            </div>
          )}

          <div
            style={{
              display:
                "flex",

              gap:
                10,

              flexWrap:
                "wrap",

              marginTop:
                18,
            }}
          >
            <Link
              href={`/admin/businesses/${business.id}`}
              className="btn primary"
            >
              ← Volver al negocio
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
          <AdminSubscribersManager
            businessId={
              business.id
            }
            initialSubscriptions={
              normalizedSubscriptions
            }
          />
        </section>
      </main>
    </>
  );
}