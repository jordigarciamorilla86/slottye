import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import AdminBusinessImagesManager from "./AdminBusinessImagesManager";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function AdminBusinessImagesPage({
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
      "Error loading admin images business:",
      businessError
    );
  }

  if (
    !business
  ) {
    notFound();
  }

  const {
    data:
      images,
    error:
      imagesError,
  } =
    await admin
      .from(
        "business_images"
      )
      .select(`
        id,
        image_url,
        position
      `)
      .eq(
        "business_id",
        business.id
      )
      .order(
        "position"
      );

  if (
    imagesError
  ) {
    console.error(
      "Error loading admin business images:",
      imagesError
    );
  }

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            950,
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
            Imágenes de {business.name}
          </h1>

          <p className="muted">
            Estás gestionando directamente las imágenes públicas de este negocio.
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
          <AdminBusinessImagesManager
            businessId={
              business.id
            }
            initialImages={
              images ??
              []
            }
          />
        </section>
      </main>
    </>
  );
}