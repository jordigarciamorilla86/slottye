import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  Header,
} from "@/components/Header";

import {
  requireActiveUser,
} from "@/lib/auth/requireActiveUser";

import BusinessImagesManager from "./BusinessImagesManager";

type Props = {
  searchParams: Promise<{
    setup?: string;
  }>;
};

export default async function BusinessImagesPage({
  searchParams,
}: Props) {
  const {
    setup,
  } =
    await searchParams;

  const fromSetup =
    setup === "1";

  const {
    supabase,
    user,
  } =
    await requireActiveUser();

  const {
    data:
      business,
  } =
    await supabase
      .from(
        "businesses"
      )
      .select(
        "id,name"
      )
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();

  if (
    !business
  ) {
    redirect(
      "/business-dashboard/create"
    );
  }

  const {
    data:
      images,
  } =
    await supabase
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

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            900,
        }}
      >
        <section className="panel">
          <div className="kicker">
            Slottye Business
          </div>

          <h1 className="business-title">
            Imágenes
          </h1>

          <p className="muted">
            Gestiona las fotos de{" "}
            {business.name}.
          </p>

          <BusinessImagesManager
            businessId={
              business.id
            }
            initialImages={
              images ??
              []
            }
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