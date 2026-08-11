import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/Header";

import {
  requireActiveUser,
} from "@/lib/auth/requireActiveUser";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import BusinessEditForm from "./BusinessEditForm";

type Props = {
  searchParams: Promise<{
    setup?: string;
    review?: string;
  }>;
};

export default async function EditBusinessPage({
  searchParams,
}: Props) {
  const {
    setup,
    review,
  } =
    await searchParams;

  const fromSetup =
    setup === "1";

  const reviewingPolicies =
    review ===
    "policies";

  const {
    supabase,
    user,
  } =
    await requireActiveUser();

  /*
   * ============================================================
   * NEGOCIO DEL USUARIO
   * ============================================================
   */

  const {
    data:
      business,
    error:
      businessError,
  } =
    await supabase
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
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
        booking_policies_reviewed_at
      `)
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();

  if (
    businessError
  ) {
    console.error(
      "Error loading business edit page:",
      businessError
    );
  }

  if (
    !business
  ) {
    redirect(
      "/business-dashboard/create"
    );
  }

  /*
   * ============================================================
   * MARCAR POLÍTICAS COMO REVISADAS
   * ============================================================
   *
   * Esta escritura se realiza exclusivamente en servidor
   * mediante service_role.
   *
   * El navegador ya no necesita permiso UPDATE directo
   * sobre businesses para esta operación.
   */

  if (
    reviewingPolicies &&
    !business.booking_policies_reviewed_at
  ) {
    const admin =
      createAdminClient();

    const {
      error:
        reviewedError,
    } =
      await admin
        .from(
          "businesses"
        )
        .update({
          booking_policies_reviewed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          business.id
        )
        .eq(
          "owner_id",
          user.id
        );

    if (
      reviewedError
    ) {
      console.error(
        "Error marking booking policies as reviewed:",
        reviewedError
      );
    }
  }

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            800,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Editar mi negocio
          </h1>

          <p className="muted">
            Esta información aparecerá en tu ficha pública.
          </p>

          <BusinessEditForm
            business={
              business
            }
          />
        </section>

        <section
          className="section"
          style={{
            marginTop:
              16,

            display:
              "flex",

            gap:
              10,

            flexWrap:
              "wrap",
          }}
        >
          {fromSetup ? (
            <Link
              href="/business-dashboard/setup"
              className="btn primary"
            >
              ← Volver a la configuración inicial
            </Link>
          ) : (
            <Link
              href="/business-dashboard"
              className="btn"
            >
              ← Volver al panel
            </Link>
          )}
        </section>
      </main>
    </>
  );
}