import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  Header,
} from "@/components/Header";
import { AdminContent, AdminPageHeader, AdminShell, AdminSubnav } from "@/components/admin/AdminShell";

import {
  ServerPagination,
} from "@/components/ServerPagination";

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
  searchParams: Promise<{
    page?: string;
  }>;
};

const PAGE_SIZE = 25;

export default async function AdminBusinessSubscribersPage({
  params,
  searchParams,
}: Props) {
  const {
    businessId,
  } =
    await params;

  const requestedPage =
    Number.parseInt(
      (
        await searchParams
      ).page ?? "1",
      10
    );

  const currentPage =
    Number.isFinite(
      requestedPage
    ) &&
    requestedPage > 0
      ? requestedPage
      : 1;

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
    count,
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
      `, {
        count: "exact",
      })
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
      )
      .range(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE - 1
      );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        (count ?? 0) / PAGE_SIZE
      )
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

      <AdminShell maxWidth={1180}>
        <AdminPageHeader eyebrow="Audiencia" title="Suscriptores" description={`Gestiona quién recibe avisos de nuevas citas de ${business.name}.`}>

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

          <AdminSubnav>
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
          </AdminSubnav>
        </AdminPageHeader>
        <AdminContent>

          <AdminSubscribersManager
            businessId={
              business.id
            }
            initialSubscriptions={
              normalizedSubscriptions
            }
          />

          <ServerPagination
            currentPage={
              currentPage
            }
            totalPages={
              totalPages
            }
            pathname={`/admin/businesses/${business.id}/subscribers`}
          />
        </AdminContent>
      </AdminShell>
    </>
  );
}
