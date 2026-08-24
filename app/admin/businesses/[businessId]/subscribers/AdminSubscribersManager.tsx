"use client";

import {
  useMemo,
  useState,
} from "react";
import styles from "./AdminSubscribersManager.module.css";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type SubscriberProfile = {
  id: string;
  name: string | null;
  email: string | null;
  is_blocked: boolean;
};

type Subscription = {
  id: string;
  user_id: string;
  business_id: string;
  email_enabled: boolean;
  created_at: string;
  profiles: SubscriberProfile | null;
};

type Props = {
  businessId: string;
  initialSubscriptions: Subscription[];
};

export default function AdminSubscribersManager({
  businessId,
  initialSubscriptions,
}: Props) {
  const [subscriptionToToggle, setSubscriptionToToggle] = useState<Subscription | null>(null);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);
  const [
    subscriptions,
    setSubscriptions,
  ] =
    useState<
      Subscription[]
    >(
      initialSubscriptions
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loadingId,
    setLoadingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const filteredSubscriptions =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase();

        if (
          !normalizedSearch
        ) {
          return subscriptions;
        }

        return subscriptions.filter(
          (
            subscription
          ) => {
            const name =
              subscription.profiles
                ?.name
                ?.toLowerCase() ??
              "";

            const email =
              subscription.profiles
                ?.email
                ?.toLowerCase() ??
              "";

            return (
              name.includes(
                normalizedSearch
              ) ||
              email.includes(
                normalizedSearch
              )
            );
          }
        );
      },
      [
        search,
        subscriptions,
      ]
    );

  const enabledCount =
    subscriptions.filter(
      (
        subscription
      ) =>
        subscription.email_enabled
    ).length;

  function formatDate(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  async function toggleEmailEnabled(
    subscription:
      Subscription
  ) {
    if (
      loadingId
    ) {
      return;
    }

    const nextValue =
      !subscription.email_enabled;

    setLoadingId(
      subscription.id
    );

    setMessage("");
    setErrorMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/subscribers`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                subscriptionId:
                  subscription.id,

                emailEnabled:
                  nextValue,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setErrorMessage(
          result.error ??
            "No se ha podido cambiar el estado de los avisos."
        );

        return;
      }

      setSubscriptions(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              subscription.id
                ? result.subscription
                : item
          )
      );

      setMessage(
        nextValue
          ? "Avisos por correo activados."
          : "Avisos por correo desactivados."
      );
    } catch (
      error
    ) {
      console.error(
        "Error updating subscriber:",
        error
      );

      setErrorMessage(
        "No se ha podido cambiar el estado de los avisos."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  async function deleteSubscription(
    subscription:
      Subscription
  ) {
    if (
      loadingId
    ) {
      return;
    }

    setLoadingId(
      subscription.id
    );

    setMessage("");
    setErrorMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/subscribers`,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                subscriptionId:
                  subscription.id,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setErrorMessage(
          result.error ??
            "No se ha podido eliminar la suscripción."
        );

        return;
      }

      setSubscriptions(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              subscription.id
          )
      );

      setMessage(
        "Suscripción eliminada correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error deleting subscriber:",
        error
      );

      setErrorMessage(
        "No se ha podido eliminar la suscripción."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  return (
    <div
      className={styles.manager}
      style={{
        marginTop:
          28,
      }}
    >
      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",

          gap:
            14,
        }}
      >
        <div className="panel">
          <div className="muted">
            Suscriptores
          </div>

          <div
            style={{
              marginTop:
                6,

              fontSize:
                28,

              fontWeight:
                800,
            }}
          >
            {subscriptions.length}
          </div>
        </div>

        <div className="panel">
          <div className="muted">
            Avisos activos
          </div>

          <div
            style={{
              marginTop:
                6,

              fontSize:
                28,

              fontWeight:
                800,
            }}
          >
            {enabledCount}
          </div>
        </div>

        <div className="panel">
          <div className="muted">
            Avisos desactivados
          </div>

          <div
            style={{
              marginTop:
                6,

              fontSize:
                28,

              fontWeight:
                800,
            }}
          >
            {subscriptions.length -
              enabledCount}
          </div>
        </div>
      </div>

      <label
        style={{
          display:
            "block",

          marginTop:
            24,
        }}
      >
        <strong>
          Buscar suscriptor
        </strong>

        <input
          value={
            search
          }
          onChange={(
            event
          ) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Nombre o correo electrónico"
          style={
            inputStyle
          }
        />
      </label>

      {message && (
        <div
          style={{
            marginTop:
              16,

            padding:
              "14px 16px",

            border:
              "1px solid #bbf7d0",

            borderRadius:
              12,

            background:
              "#f0fdf4",

            color:
              "#166534",
          }}
        >
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginTop:
              16,

            padding:
              "14px 16px",

            border:
              "1px solid #fecaca",

            borderRadius:
              12,

            background:
              "#fef2f2",

            color:
              "#b91c1c",
          }}
        >
          {errorMessage}
        </div>
      )}

      {filteredSubscriptions.length ===
      0 ? (
        <div
          className="panel"
          style={{
            marginTop:
              24,
          }}
        >
          <h3>
            No hay suscriptores
          </h3>

          <p className="muted">
            No se han encontrado suscriptores con los criterios seleccionados.
          </p>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              14,

            marginTop:
              24,
          }}
        >
          {filteredSubscriptions.map(
            (
              subscription
            ) => {
              const profile =
                subscription.profiles;

              return (
                <div
                  className="card"
                  key={
                    subscription.id
                  }
                >
                  <div className="card-body">
                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        alignItems:
                          "flex-start",

                        gap:
                          18,

                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            marginBottom:
                              6,
                          }}
                        >
                          {profile
                            ?.name
                            ?.trim() ||
                            "Usuario sin nombre"}
                        </h3>

                        <div className="meta">
                          ✉{" "}
                          {profile
                            ?.email ??
                            "Sin email"}
                        </div>

                        <div
                          className="meta"
                          style={{
                            marginTop:
                              6,
                          }}
                        >
                          Suscrito desde{" "}
                          {formatDate(
                            subscription.created_at
                          )}
                        </div>

                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              8,

                            flexWrap:
                              "wrap",

                            marginTop:
                              12,
                          }}
                        >
                          <span
                            style={{
                              padding:
                                "5px 9px",

                              borderRadius:
                                999,

                              background:
                                subscription.email_enabled
                                  ? "#dcfce7"
                                  : "#f3f4f6",

                              color:
                                subscription.email_enabled
                                  ? "#166534"
                                  : "#60646f",

                              fontSize:
                                12,

                              fontWeight:
                                800,
                            }}
                          >
                            {subscription.email_enabled
                              ? "EMAIL ACTIVO"
                              : "EMAIL DESACTIVADO"}
                          </span>

                          {profile
                            ?.is_blocked && (
                            <span
                              style={{
                                padding:
                                  "5px 9px",

                                borderRadius:
                                  999,

                                background:
                                  "#fee2e2",

                                color:
                                  "#b91c1c",

                                fontSize:
                                  12,

                                fontWeight:
                                  800,
                              }}
                            >
                              CUENTA BLOQUEADA
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",

                          gap:
                            8,

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <a
                          href={`/admin/users?user=${subscription.user_id}`}
                          className="btn"
                        >
                          Ver usuario
                        </a>

                        <button
                          type="button"
                          className="btn"
                          disabled={
                            loadingId ===
                            subscription.id
                          }
                          onClick={() => setSubscriptionToToggle(subscription)}
                        >
                          {loadingId ===
                          subscription.id
                            ? "Procesando..."
                            : subscription.email_enabled
                              ? "Desactivar avisos"
                              : "Activar avisos"}
                        </button>

                        <button
                          type="button"
                          className="btn"
                          disabled={
                            loadingId ===
                            subscription.id
                          }
                          onClick={() => setSubscriptionToDelete(subscription)}
                          style={{
                            color:
                              "#b91c1c",

                            borderColor:
                              "#fecaca",
                          }}
                        >
                          Eliminar suscripción
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
      <ConfirmDialog open={subscriptionToToggle !== null} onOpenChange={(open) => { if (!open) setSubscriptionToToggle(null); }} title={subscriptionToToggle?.email_enabled ? "Desactivar avisos" : "Activar avisos"} description={subscriptionToToggle?.email_enabled ? "Este suscriptor dejará de recibir avisos por correo." : "Este suscriptor volverá a recibir avisos por correo."} variant="warning" confirmLabel={subscriptionToToggle?.email_enabled ? "Desactivar" : "Activar"} pending={loadingId !== null} onConfirm={async () => { if (subscriptionToToggle) { await toggleEmailEnabled(subscriptionToToggle); setSubscriptionToToggle(null); } }} />
      <ConfirmDialog open={subscriptionToDelete !== null} onOpenChange={(open) => { if (!open) setSubscriptionToDelete(null); }} title="Eliminar suscripción" description={`Se eliminará la suscripción de “${subscriptionToDelete?.profiles?.name?.trim() || subscriptionToDelete?.profiles?.email || "este usuario"}”. Su cuenta seguirá activa.`} variant="danger" pending={loadingId !== null} onConfirm={async () => { if (subscriptionToDelete) { await deleteSubscription(subscriptionToDelete); setSubscriptionToDelete(null); } }} />
    </div>
  );
}

const inputStyle = {
  width:
    "100%",

  padding:
    14,

  border:
    "1px solid var(--border)",

  borderRadius:
    14,

  marginTop:
    8,

  background:
    "var(--card)",

  color:
    "var(--text)",

  font:
    "inherit",
};
