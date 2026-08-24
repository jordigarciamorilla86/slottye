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
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import BusinessHoursManager from "@/app/business-dashboard/hours/BusinessHoursManager";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessHoursPage({
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

  if (businessError) {
    console.error(
      "Error loading admin hours business:",
      businessError
    );
  }

  if (!business) {
    notFound();
  }

  const {
    data:
      hours,
    error:
      hoursError,
  } =
    await admin
      .from(
        "business_hours"
      )
      .select(`
        id,
        day_of_week,
        open_time,
        close_time,
        open_time_2,
        close_time_2,
        closed
      `)
      .eq(
        "business_id",
        business.id
      )
      .order(
        "day_of_week"
      );

  if (hoursError) {
    console.error(
      "Error loading admin business hours:",
      hoursError
    );
  }

  return (
    <>
      <Header />

      <AdminShell maxWidth={1180}>
        <AdminPageHeader eyebrow="Configuración" title="Horarios" description={`Configura el horario habitual de ${business.name}.`}>

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

          <BusinessHoursManager
            businessId={
              business.id
            }
            endpoint={`/api/admin/businesses/${business.id}/hours`}
            initialHours={
              hours ??
              []
            }
          />
        </AdminContent>
      </AdminShell>
    </>
  );
}
