import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

import SavedBusinessesManager from "./SavedBusinessesManager";

export default async function SavedBusinessesPage() {
  const {
    supabase,
    user,
  } =
    await requireActiveUser();

  const [
    {
      data:
        favorites,
      error:
        favoritesError,
    },
    {
      data:
        subscriptions,
      error:
        subscriptionsError,
    },
  ] =
    await Promise.all([
      supabase
        .from("favorites")
        .select(`
          id,
          created_at,
          businesses (
            id,
            name,
            slug,
            description,
            address,
            city,
            phone
          )
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "business_subscriptions"
        )
        .select(`
          id,
          email_enabled,
          created_at,
          businesses (
            id,
            name,
            slug,
            address,
            city
          )
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    favoritesError
  ) {
    console.error(
      "Error loading favorites:",
      favoritesError
    );
  }

  if (
    subscriptionsError
  ) {
    console.error(
      "Error loading subscriptions:",
      subscriptionsError
    );
  }

  const normalizedFavorites =
    (
      favorites ??
      []
    ).map(
      (
        favorite
      ) => ({
        id:
          favorite.id,

        created_at:
          favorite.created_at,

        businesses:
          Array.isArray(
            favorite.businesses
          )
            ? favorite.businesses[
                0
              ] ??
              null
            : favorite.businesses,
      })
    );

  const normalizedSubscriptions =
    (
      subscriptions ??
      []
    ).map(
      (
        subscription
      ) => ({
        ...subscription,

        businesses:
          Array.isArray(
            subscription.businesses
          )
            ? subscription.businesses[
                0
              ] ??
              null
            : subscription.businesses,
      })
    );

  return (
    <>
      <Header />

      <main className="saved10-page">
        <div className="saved10-shell">
          <section className="saved10-hero">
            <div>
              <span className="saved10-kicker">
                Mi Slottye
              </span>

              <h1>
                Mis negocios
              </h1>

              <p>
                Consulta los negocios que has guardado y los que sigues para recibir avisos.
              </p>
            </div>

            <Link
              href="/account"
              className="btn saved10-back"
            >
              <ArrowLeft
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />

              Volver a mi panel
            </Link>
          </section>

          <SavedBusinessesManager
            initialFavorites={
              normalizedFavorites
            }
            initialSubscriptions={
              normalizedSubscriptions
            }
          />
        </div>

        <style>{`
          .saved10-page {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .saved10-shell {
            width: min(1050px,100%);
            margin: 0 auto;
          }

          .saved10-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;

            padding: 24px 26px;
            border: 1px solid var(--border);
            border-radius: 20px;

            background:
              radial-gradient(
                circle at 88% 12%,
                rgba(112,87,245,.09),
                transparent 30%
              ),
              #fff;

            box-shadow:
              0 16px 42px
              rgba(31,27,48,.035);
          }

          .saved10-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .saved10-hero h1 {
            margin: 6px 0 5px;

            font-size: clamp(
              30px,
              3vw,
              38px
            );

            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .saved10-hero p {
            margin: 0;

            color: var(--muted);

            font-size: 13px;
            line-height: 1.5;
          }

          .saved10-back {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;

            flex: 0 0 auto;
          }

          .saved10-back svg {
            display: block;
            margin: 0;
            flex: 0 0 auto;
          }

          @media (max-width: 700px) {
            .saved10-page {
              padding: 18px 12px 46px;
            }

            .saved10-hero {
              flex-direction: column;
              align-items: stretch;

              padding: 19px;
            }

            .saved10-hero h1 {
              font-size: 30px;
            }

            .saved10-back {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </>
  );
}