import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  Header,
} from "@/components/Header";
import { AdminContent, AdminPageHeader, AdminShell, AdminSubnav, StatusBadge } from "@/components/admin/AdminShell";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import BusinessEditForm from "@/app/business-dashboard/edit/BusinessEditForm";
import BusinessImagesManager from "@/app/business-dashboard/images/BusinessImagesManager";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessEditPage({
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
        category_id,
        active,
        description,
        address,
        city,
        postal_code,
        phone,
        email,
        website,
        latitude,
        longitude,
        google_place_id,
        show_google_reviews,
        min_booking_notice_hours,
        max_booking_advance_days,
        allow_cancellations,
        min_cancellation_notice_hours,
        auto_complete_bookings
      `)
      .eq(
        "id",
        businessId
      )
      .maybeSingle();

  if (businessError) {
    console.error(
      "Error loading admin business edit:",
      businessError
    );
  }

  if (!business) {
    notFound();
  }

  const { data: images, error: imagesError } = await admin
    .from("business_images")
    .select("id,image_url,position")
    .eq("business_id", business.id)
    .order("position");

  if (imagesError) {
    console.error("Error loading admin business images:", imagesError);
  }

  const { data: categories, error: categoriesError } = await admin
    .from("categories")
    .select("id,name")
    .order("name");

  if (categoriesError) {
    console.error("Error loading categories for admin business edit:", categoriesError);
  }

  return (
    <>
      <Header />

      <AdminShell maxWidth={1180}>
        <AdminPageHeader eyebrow="Configuración" title="Editar negocio" description={`${business.name}${business.city ? ` · ${business.city}` : ""}`}>

          {!business.active && (
            <StatusBadge tone="danger">Este negocio está actualmente inactivo</StatusBadge>
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
          <BusinessEditForm
            business={business}
            categories={categories ?? []}
            saveEndpoint={`/api/admin/businesses/${business.id}/edit`}
            showGoogleBusinessIntegration={false}
            showIntegrationsSection={false}
            calendarSection={null}
            imagesSection={
              <BusinessImagesManager
                businessId={business.id}
                initialImages={images ?? []}
                endpoint={`/api/admin/businesses/${business.id}/images`}
              />
            }
          />
        </AdminContent>
      </AdminShell>
    </>
  );
}
