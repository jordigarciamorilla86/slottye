import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { Header } from "@/components/Header";
import { AdminContent, AdminPageHeader, AdminShell, AdminSubnav } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import ServicesManager from "@/app/business-dashboard/services/ServicesManager";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessServicesPage({
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

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data:
      adminProfile,
  } =
    await admin
      .from("profiles")
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
    !adminProfile?.is_admin
  ) {
    redirect("/");
  }

  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from("businesses")
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
      "Error loading admin services business:",
      businessError
    );
  }

  if (!business) {
    notFound();
  }

  const {
    data:
      services,
    error:
      servicesError,
  } =
    await admin
      .from("services")
      .select(`
        id,
        name,
        description,
        duration_minutes,
        active
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
    servicesError
  ) {
    console.error(
      "Error loading admin services:",
      servicesError
    );
  }

  return (
    <>
      <Header />

      <AdminShell maxWidth={1180}>
        <AdminPageHeader eyebrow="Configuración" title="Servicios" description={`Gestiona los servicios que ofrece ${business.name}.`}>

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
              href={`/admin/businesses/${business.id}/agenda`}
              className="btn"
            >
              Gestionar agenda
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

          <ServicesManager
            businessId={
              business.id
            }
            endpoint={`/api/admin/businesses/${business.id}/services`}
            initialServices={
              services ??
              []
            }
          />
        </AdminContent>
      </AdminShell>
    </>
  );
}
