import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
} from "lucide-react";

import { Header } from "@/components/Header";
import GoogleCalendarIntegration from "@/components/GoogleCalendarIntegration";

import {
  requireActiveUser,
} from "@/lib/auth/requireActiveUser";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import BusinessEditForm from "./BusinessEditForm";
import BusinessDangerZone from "./BusinessDangerZone";

import BusinessImagesManager from "../images/BusinessImagesManager";

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
    review === "policies";

  const {
    supabase,
    user,
  } =
    await requireActiveUser();

  const {
    data: business,
    error: businessError,
  } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        category_id,
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
        auto_complete_bookings,
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

  if (
    reviewingPolicies &&
    !business.booking_policies_reviewed_at
  ) {
    const admin =
      createAdminClient();

    const {
      error: reviewedError,
    } =
      await admin
        .from("businesses")
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

  const [
    {
      data: categories,
      error: categoriesError,
    },
    {
      data: images,
      error: imagesError,
    },
  ] =
    await Promise.all([
      supabase
        .from("categories")
        .select(`
          id,
          name
        `)
        .order(
          "name"
        ),

      supabase
        .from("business_images")
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
        ),
    ]);

  if (
    categoriesError
  ) {
    console.error(
      "Error loading business categories:",
      categoriesError
    );
  }

  if (
    imagesError
  ) {
    console.error(
      "Error loading business images:",
      imagesError
    );
  }

  return (
    <>
      <Header />

      <main className="edit10">
        <div className="edit10-shell">
          <section className="edit10-hero">
            <div>
              <span className="edit10-eyebrow">
                Configuración
              </span>

              <h1>
                Editar mi negocio
              </h1>

              <p>
                {business.name}
                {business.city
                  ? ` · ${business.city}`
                  : ""}
              </p>
            </div>

            <div className="edit10-actions">
              {fromSetup ? (
                <Link
                  href="/business-dashboard/setup"
                  className="btn primary"
                >
                  <ArrowLeft
                    size={15}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  Volver a configuración inicial
                </Link>
              ) : (
                <Link
                  href="/account"
                  className="btn"
                >
                  <ArrowLeft size={15} strokeWidth={2.2} aria-hidden="true" />
                  Volver a mi panel
                </Link>
              )}
            </div>
          </section>

          <BusinessEditForm
            business={business}
            categories={
              categories ?? []
            }
            imagesSection={
              <BusinessImagesManager
                businessId={
                  business.id
                }
                initialImages={
                  images ?? []
                }
              />
            }
            calendarSection={
              <GoogleCalendarIntegration
                businessId={
                  business.id
                }
              />
            }
          />

          <BusinessDangerZone />
        </div>

        <style>{`
          .edit10 {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .edit10-shell {
            width: min(1180px, 100%);
            margin: 0 auto;
          }

          .edit10-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 18px 20px;
            border: 1px solid var(--border);
            border-radius: 19px;
            background:
              radial-gradient(
                circle at 90% 10%,
                rgba(112,87,245,.08),
                transparent 32%
              ),
              #fff;
            box-shadow:
              0 14px 36px
              rgba(31,27,48,.03);
          }

          .edit10-eyebrow {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .edit10-hero h1 {
            margin: 5px 0 5px;
            font-size: clamp(
              30px,
              3vw,
              38px
            );
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .edit10-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .edit10-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            flex-wrap: wrap;
          }

          .edit10-actions .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          @media (max-width: 700px) {
            .edit10 {
              padding:
                16px
                11px
                44px;
            }

            .edit10-hero {
              align-items: stretch;
              flex-direction: column;
              padding: 18px;
            }

            .edit10-hero h1 {
              font-size: 28px;
            }

            .edit10-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .edit10-actions .btn {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </main>
    </>
  );
}
