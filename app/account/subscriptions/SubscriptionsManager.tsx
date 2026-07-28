"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Subscription = {
  id: string;
  email_enabled: boolean;
  created_at: string;
  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
      }
    | null;
};

type Props = {
  initialSubscriptions: Subscription[];
};

export default function SubscriptionsManager({
  initialSubscriptions,
}: Props) {
  const supabase = createClient();

  const [subscriptions, setSubscriptions] =
    useState(initialSubscriptions);

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  async function unsubscribe(subscriptionId: string) {
    const confirmed = window.confirm(
      "¿Quieres dejar de recibir avisos de este negocio?"
    );

    if (!confirmed) {
      return;
    }

    setLoadingId(subscriptionId);
    setMessage("");

    const { error } = await supabase
      .from("business_subscriptions")
      .delete()
      .eq("id", subscriptionId);

    if (error) {
      setMessage(error.message);
      setLoadingId(null);
      return;
    }

    setSubscriptions((current) =>
      current.filter(
        (subscription) =>
          subscription.id !== subscriptionId
      )
    );

    setMessage("Suscripción eliminada.");
    setLoadingId(null);
  }

  if (subscriptions.length === 0) {
    return (
      <div
        className="panel"
        style={{ marginTop: 24 }}
      >
        <h3>No sigues ningún negocio</h3>

        <p className="muted">
          Cuando pulses “Avísame de nuevas citas” en un negocio, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        marginTop: 28,
      }}
    >
      {subscriptions.map((subscription) => {
        const business = subscription.businesses;

        return (
          <div
            className="card"
            key={subscription.id}
          >
            <div className="card-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3>
                    {business?.name ?? "Negocio"}
                  </h3>

                  {business && (
                    <div className="meta">
                      📍{" "}
                      {[business.address, business.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}

                  <div
                    className="muted"
                    style={{ marginTop: 8 }}
                  >
                    🔔 Avisos por email activados
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {business && (
                    <Link
                      href={`/business/${business.slug}`}
                      className="btn"
                    >
                      Ver negocio
                    </Link>
                  )}

                  <button
                    type="button"
                    className="btn"
                    disabled={
                      loadingId === subscription.id
                    }
                    onClick={() =>
                      unsubscribe(subscription.id)
                    }
                  >
                    {loadingId === subscription.id
                      ? "Quitando..."
                      : "Dejar de seguir"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {message && (
        <p className="muted">
          {message}
        </p>
      )}
    </div>
  );
}