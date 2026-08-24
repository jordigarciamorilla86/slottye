"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  Bell,
  BellOff,
  ExternalLink,
  Heart,
  MapPin,
  Phone,
  Store,
  XCircle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui";

type Favorite = {
  id: string;
  created_at: string;

  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        description:
          | string
          | null;
        address:
          | string
          | null;
        city:
          | string
          | null;
        phone:
          | string
          | null;
      }
    | null;
};

type Subscription = {
  id: string;
  email_enabled: boolean;
  created_at: string;

  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        address:
          | string
          | null;
        city:
          | string
          | null;
      }
    | null;
};

type Props = {
  initialFavorites:
    Favorite[];

  initialSubscriptions:
    Subscription[];
};

type Tab =
  | "favorites"
  | "subscriptions";

const ITEMS_PER_PAGE =
  6;

export default function SavedBusinessesManager({
  initialFavorites,
  initialSubscriptions,
}: Props) {
  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "favorites"
    );

  const [
    favoritesPage,
    setFavoritesPage,
  ] =
    useState(1);

  const [
    subscriptionsPage,
    setSubscriptionsPage,
  ] =
    useState(1);

  const [
    favorites,
    setFavorites,
  ] =
    useState(
      initialFavorites
    );

  const [
    subscriptions,
    setSubscriptions,
  ] =
    useState(
      initialSubscriptions
    );

  const [
    loadingId,
    setLoadingId,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState<{
      text: string;
      type:
        | "success"
        | "error";
    } | null>(
      null
    );

  const [subscriptionToRemove, setSubscriptionToRemove] = useState<string | null>(null);
  const [favoriteToRemove, setFavoriteToRemove] = useState<string | null>(null);

  const favoritePages =
    Math.max(
      1,
      Math.ceil(
        favorites.length /
          ITEMS_PER_PAGE
      )
    );

  const subscriptionPages =
    Math.max(
      1,
      Math.ceil(
        subscriptions.length /
          ITEMS_PER_PAGE
      )
    );

  const visibleFavorites =
    useMemo(
      () =>
        favorites.slice(
          (
            favoritesPage -
            1
          ) *
            ITEMS_PER_PAGE,
          favoritesPage *
            ITEMS_PER_PAGE
        ),
      [
        favorites,
        favoritesPage,
      ]
    );

  const visibleSubscriptions =
    useMemo(
      () =>
        subscriptions.slice(
          (
            subscriptionsPage -
            1
          ) *
            ITEMS_PER_PAGE,
          subscriptionsPage *
            ITEMS_PER_PAGE
        ),
      [
        subscriptions,
        subscriptionsPage,
      ]
    );

  async function unsubscribe(
    subscriptionId:
      string
  ) {
    setLoadingId(
      subscriptionId
    );

    setMessage(
      null
    );

    try {
      const response =
        await fetch(
          "/api/account/subscriptions",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                subscriptionId,
              }),
          }
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "La respuesta del servidor no es válida.",
            })
          );

      if (
        !response.ok
      ) {
        setMessage({
          text:
            result.error ??
            "No se ha podido eliminar la suscripción.",
          type:
            "error",
        });

        return;
      }

      setSubscriptions(
        (
          current
        ) =>
          current.filter(
            (
              subscription
            ) =>
              subscription.id !==
              subscriptionId
          )
      );

      setSubscriptionsPage(
        (
          current
        ) =>
          Math.max(
            1,
            Math.min(
              current,
              Math.ceil(
                (
                  subscriptions.length -
                  1
                ) /
                  ITEMS_PER_PAGE
              ) ||
                1
            )
          )
      );

      setMessage({
        text:
          "Has dejado de seguir el negocio.",
        type:
          "success",
      });
    } catch (
      error
    ) {
      console.error(
        "Error deleting subscription:",
        error
      );

      setMessage({
        text:
          "No se ha podido eliminar la suscripción.",
        type:
          "error",
      });
    } finally {
      setLoadingId(
        null
      );
    }
  }

  async function removeFavorite(
    favoriteId: string
  ) {
    setLoadingId(favoriteId);
    setMessage(null);

    try {
      const { createClient } =
        await import(
          "@/lib/supabase/client"
        );
      const supabase =
        createClient();
      const {
        error,
      } =
        await supabase
          .from("favorites")
          .delete()
          .eq("id", favoriteId);

      if (error) {
        throw error;
      }

      setFavorites((current) =>
        current.filter(
          (favorite) =>
            favorite.id !==
            favoriteId
        )
      );
      setFavoritesPage((current) =>
        Math.max(
          1,
          Math.min(
            current,
            Math.ceil(
              (favorites.length - 1) /
                ITEMS_PER_PAGE
            ) || 1
          )
        )
      );
      setMessage({
        text:
          "Negocio eliminado de favoritos.",
        type: "success",
      });
    } catch (error) {
      console.error(
        "Error deleting favorite:",
        error
      );
      setMessage({
        text:
          "No se ha podido quitar el negocio de favoritos.",
        type: "error",
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="saved10">
      <ConfirmDialog
        open={favoriteToRemove !== null}
        onOpenChange={(open) => { if (!open) setFavoriteToRemove(null); }}
        title="Quitar de favoritos"
        description="¿Quieres quitar este negocio de tus favoritos?"
        variant="neutral"
        confirmLabel="Quitar"
        pending={favoriteToRemove !== null && loadingId === favoriteToRemove}
        onConfirm={async () => {
          if (!favoriteToRemove) return;
          await removeFavorite(favoriteToRemove);
          setFavoriteToRemove(null);
        }}
      />
      <ConfirmDialog
        open={subscriptionToRemove !== null}
        onOpenChange={(open) => { if (!open) setSubscriptionToRemove(null); }}
        title="Dejar de seguir"
        description="¿Quieres dejar de seguir este negocio? Ya no recibirás avisos de nuevos horarios."
        variant="warning"
        confirmLabel="Dejar de seguir"
        pending={subscriptionToRemove !== null && loadingId === subscriptionToRemove}
        onConfirm={async () => {
          if (!subscriptionToRemove) return;
          await unsubscribe(subscriptionToRemove);
          setSubscriptionToRemove(null);
        }}
      />
      <div
        className="saved10-tabs"
        role="tablist"
        aria-label="Mis negocios"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            tab ===
            "favorites"
          }
          className={
            tab ===
            "favorites"
              ? "saved10-tab is-active"
              : "saved10-tab"
          }
          onClick={() =>
            setTab(
              "favorites"
            )
          }
        >
          <Heart
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          Favoritos

          <span>
            {favorites.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            tab ===
            "subscriptions"
          }
          className={
            tab ===
            "subscriptions"
              ? "saved10-tab is-active"
              : "saved10-tab"
          }
          onClick={() =>
            setTab(
              "subscriptions"
            )
          }
        >
          <Bell
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          Suscripciones

          <span>
            {subscriptions.length}
          </span>
        </button>
      </div>

      {message && (
        <div
          className={`saved10-message is-${message.type}`}
          role="alert"
        >
          {message.type ===
          "error" ? (
            <XCircle
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : (
            <Bell
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          )}

          {message.text}
        </div>
      )}

      {tab ===
      "favorites" ? (
        <div className="saved10-content">
          <div className="saved10-section-title">
            <div>
              <span>
                Favoritos
              </span>

              <h2>
                Negocios guardados
              </h2>

              <p>
                Accede rápidamente a los negocios que has marcado como favoritos.
              </p>
            </div>
          </div>

          {favorites.length ===
          0 ? (
            <div className="saved10-empty">
              <span className="saved10-empty-icon">
                <Heart
                  size={21}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Todavía no tienes favoritos
                </strong>

                <p>
                  Guarda negocios para encontrarlos rápidamente desde aquí.
                </p>

                <Link
                  href="/"
                  className="btn primary"
                >
                  Explorar negocios
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="saved10-list">
                {visibleFavorites.map(
                  (
                    favorite
                  ) => {
                    const business =
                      favorite.businesses;

                    if (
                      !business
                    ) {
                      return null;
                    }

                    return (
                      <article
                        className="saved10-row"
                        key={
                          favorite.id
                        }
                      >
                        <span className="saved10-row-icon">
                          <Heart
                            size={17}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </span>

                        <div className="saved10-row-main">
                          <strong>
                            {business.name}
                          </strong>

                          {business.description && (
                            <p>
                              {business.description}
                            </p>
                          )}

                          {(business.address ||
                            business.city) && (
                            <span className="saved10-meta">
                              <MapPin
                                size={13}
                                strokeWidth={2}
                                aria-hidden="true"
                              />

                              {[
                                business.address,
                                business.city,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " · "
                                )}
                            </span>
                          )}

                          {business.phone && (
                            <span className="saved10-meta">
                              <Phone
                                size={13}
                                strokeWidth={2}
                                aria-hidden="true"
                              />

                              {business.phone}
                            </span>
                          )}
                        </div>

                        <div className="saved10-row-actions">
                          <Link
                            href={`/business/${business.slug}`}
                            className="btn"
                          >
                            Ver negocio

                            <ExternalLink
                              size={14}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </Link>

                          <button
                            type="button"
                            className="btn saved10-remove"
                            onClick={() =>
                              setFavoriteToRemove(
                                favorite.id
                              )
                            }
                            disabled={
                              loadingId ===
                              favorite.id
                            }
                          >
                            <Heart
                              size={14}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            {loadingId ===
                            favorite.id
                              ? "Quitando..."
                              : "Quitar favorito"}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              {favoritePages >
              1 && (
                <Pagination
                  page={
                    favoritesPage
                  }
                  pages={
                    favoritePages
                  }
                  onPrevious={() =>
                    setFavoritesPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current -
                            1
                        )
                    )
                  }
                  onNext={() =>
                    setFavoritesPage(
                      (
                        current
                      ) =>
                        Math.min(
                          favoritePages,
                          current +
                            1
                        )
                    )
                  }
                />
              )}
            </>
          )}
        </div>
      ) : (
        <div className="saved10-content">
          <div className="saved10-section-title">
            <div>
              <span>
                Suscripciones
              </span>

              <h2>
                Negocios que sigues
              </h2>

              <p>
                Recibe avisos cuando estos negocios publiquen nueva disponibilidad.
              </p>
            </div>
          </div>

          {subscriptions.length ===
          0 ? (
            <div className="saved10-empty">
              <span className="saved10-empty-icon">
                <Store
                  size={21}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  No sigues ningún negocio
                </strong>

                <p>
                  Cuando pulses “Avísame de nuevas citas” en un negocio, aparecerá aquí.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="saved10-list">
                {visibleSubscriptions.map(
                  (
                    subscription
                  ) => {
                    const business =
                      subscription.businesses;

                    return (
                      <article
                        className="saved10-row"
                        key={
                          subscription.id
                        }
                      >
                        <span className="saved10-row-icon is-bell">
                          {subscription.email_enabled ? (
                            <Bell
                              size={17}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          ) : (
                            <BellOff
                              size={17}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          )}
                        </span>

                        <div className="saved10-row-main">
                          <strong>
                            {business?.name ??
                              "Negocio"}
                          </strong>

                          {business &&
                            (
                              business.address ||
                              business.city
                            ) && (
                              <span className="saved10-meta">
                                <MapPin
                                  size={13}
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />

                                {[
                                  business.address,
                                  business.city,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " · "
                                  )}
                              </span>
                            )}

                          <span
                            className={
                              subscription.email_enabled
                                ? "saved10-badge is-enabled"
                                : "saved10-badge is-disabled"
                            }
                          >
                            {subscription.email_enabled
                              ? "Avisos por email activados"
                              : "Avisos por email desactivados"}
                          </span>
                        </div>

                        <div className="saved10-actions">
                          {business && (
                            <Link
                              href={`/business/${business.slug}`}
                              className="btn"
                            >
                              Ver negocio

                              <ExternalLink
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </Link>
                          )}

                          <button
                            type="button"
                            className="btn saved10-unfollow"
                            disabled={
                              loadingId ===
                              subscription.id
                            }
                            onClick={() =>
                              setSubscriptionToRemove(
                                subscription.id
                              )
                            }
                          >
                            {loadingId ===
                            subscription.id
                              ? "Quitando..."
                              : "Dejar de seguir"}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              {subscriptionPages >
              1 && (
                <Pagination
                  page={
                    subscriptionsPage
                  }
                  pages={
                    subscriptionPages
                  }
                  onPrevious={() =>
                    setSubscriptionsPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current -
                            1
                        )
                    )
                  }
                  onNext={() =>
                    setSubscriptionsPage(
                      (
                        current
                      ) =>
                        Math.min(
                          subscriptionPages,
                          current +
                            1
                        )
                    )
                  }
                />
              )}
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .saved10 {
          margin-top: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 14px 34px
            rgba(31,27,48,.025);
        }

        .saved10-tabs {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 7px;
            border-bottom: 1px solid #efedf2;
            background: #faf9fc;
          }
          
          .saved10-tab {
            flex: 1 1 0;
          }

        .saved10-tab {
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--muted);
          font: inherit;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
        }

        .saved10-tab svg {
          display: block;
          margin: 0;
        }

        .saved10-tab > span {
          min-width: 22px;
          height: 20px;
          display: grid;
          place-items: center;
          padding: 0 6px;
          border-radius: 999px;
          background: #efedf3;
          font-size: 9.5px;
        }

        .saved10-tab.is-active {
          background: #fff;
          color: var(--accent-dark);
          box-shadow:
            0 2px 8px
            rgba(31,27,48,.06);
        }

        .saved10-tab.is-active > span {
          background: #f0ecff;
        }

        .saved10-message {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 14px 16px 0;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 750;
        }

        .saved10-message.is-success {
          border: 1px solid #b8ebc9;
          background: #effaf3;
          color: #176b3a;
        }

        .saved10-message.is-error {
          border: 1px solid #ffc9c9;
          background: #fff2f2;
          color: #a92727;
        }

        .saved10-content {
            min-height: 0;
          }

          .saved10-section-title {
            padding: 14px 18px 12px;
            border-bottom: 1px solid #efedf2;
          }

        .saved10-section-title span {
          color: var(--accent-dark);
          font-size: 10.5px;
          font-weight: 850;
        }

        .saved10-section-title h2 {
          margin: 3px 0 3px;
          font-size: 20px;
          letter-spacing: -.025em;
        }

        .saved10-section-title p {
          margin: 0;
          color: var(--muted);
          font-size: 11.5px;
        }

        .saved10-list {
          display: grid;
        }

        .saved10-row {
            display: grid;
            grid-template-columns:
              auto
              minmax(0,1fr)
              auto;
            align-items: center;
            gap: 12px;
            padding: 12px 18px;
            border-bottom: 1px solid #efedf2;
          }

        .saved10-row:last-child {
          border-bottom: 0;
        }

        .saved10-row-icon,
        .saved10-empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saved10-row-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .saved10-row-icon.is-bell {
          background: #eef8f2;
          color: #2f8251;
        }

        .saved10-row-icon svg,
        .saved10-empty-icon svg {
          display: block;
          margin: 0;
          flex: 0 0 auto;
        }

        .saved10-row-main {
          min-width: 0;
        }

        .saved10-row-main > strong {
          display: block;
          font-size: 12.5px;
        }

        .saved10-row-main > p {
          display: -webkit-box;
          overflow: hidden;
          margin: 3px 0 5px;
          color: var(--muted);
          font-size: 10.5px;
          line-height: 1.4;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .saved10-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          color: var(--muted);
          font-size: 10.5px;
        }

        .saved10-meta svg {
          flex: 0 0 auto;
        }

        .saved10-row > .btn,
        .saved10-actions .btn,
        .saved10-row-actions .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 9px;
          font-size: 10.5px;
        }

        .saved10-row-actions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
        }

        .saved10-remove {
          color: #b42318;
          border-color: #ffcaca;
        }

        .saved10-actions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
        }

        .saved10-unfollow {
          color: #b42318;
          border-color: #ffcaca;
        }

        .saved10-badge {
          width: fit-content;
          display: inline-flex;
          margin-top: 6px;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 800;
        }

        .saved10-badge.is-enabled {
          background: #eaf8ef;
          color: #267746;
        }

        .saved10-badge.is-disabled {
          background: #f1f1f4;
          color: #706d78;
        }

        .saved10-empty {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 24px 19px;
        }

        .saved10-empty-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 12px;
          background: #f0ecff;
          color: var(--accent);
        }

        .saved10-empty strong {
          display: block;
          font-size: 13px;
        }

        .saved10-empty p {
          margin: 4px 0 10px;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.45;
        }

        .saved10-pagination {
          display: grid;
          grid-template-columns:
            minmax(110px,auto)
            auto
            minmax(110px,auto);
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 13px 16px;
          border-top: 1px solid #efedf2;
        }

        .saved10-pagination .btn {
          min-width: 110px;
          padding: 8px 10px;
          font-size: 10.5px;
        }

        .saved10-pagination span {
          min-width: 86px;
          color: var(--muted);
          font-size: 10.5px;
          font-weight: 750;
          text-align: center;
        }

        @media (max-width: 680px) {
          .saved10-row {
            grid-template-columns:
              auto
              minmax(0,1fr);
            align-items: start;
            padding: 14px;
          }

          .saved10-row > .btn,
          .saved10-actions,
          .saved10-row-actions {
            grid-column: 1 / -1;
            width: 100%;
          }

          .saved10-row > .btn,
          .saved10-actions .btn,
          .saved10-row-actions .btn {
            width: 100%;
          }

          .saved10-actions,
          .saved10-row-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .saved10-pagination {
            grid-template-columns:
              minmax(0,1fr)
              auto
              minmax(0,1fr);
            gap: 8px;
          }

          .saved10-pagination .btn {
            width: 100%;
            min-width: 0;
          }

          .saved10-pagination span {
            min-width: 0;
          }
        }
      `}</style>
    </section>
  );
}

function Pagination({
  page,
  pages,
  onPrevious,
  onNext,
}: {
  page: number;
  pages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="saved10-pagination">
      <button
        type="button"
        className="btn"
        disabled={
          page <=
          1
        }
        onClick={
          onPrevious
        }
      >
        Anterior
      </button>

      <span>
        Página {page} de {pages}
      </span>

      <button
        type="button"
        className="btn"
        disabled={
          page >=
          pages
        }
        onClick={
          onNext
        }
      >
        Siguiente
      </button>
    </div>
  );
}
