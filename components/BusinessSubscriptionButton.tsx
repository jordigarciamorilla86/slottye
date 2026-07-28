"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  businessId: string;
  userId: string | null;
  initialSubscribed: boolean;
};

export function BusinessSubscriptionButton({
  businessId,
  userId,
  initialSubscribed,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [subscribed, setSubscribed] =
    useState(initialSubscribed);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleSubscription() {
    if (!userId) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setMessage("");

    if (subscribed) {
      const { error } = await supabase
        .from("business_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("business_id", businessId);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setSubscribed(false);
      setMessage("Avisos desactivados.");
    } else {
      const { error } = await supabase
        .from("business_subscriptions")
        .insert({
          user_id: userId,
          business_id: businessId,
          email_enabled: true,
        });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setSubscribed(true);
      setMessage(
        "Te avisaremos cuando haya nuevas citas."
      );
    }

    setLoading(false);
  }

  return (
    <div>
      <button
        type="button"
        className={
          subscribed
            ? "btn primary"
            : "btn"
        }
        onClick={handleSubscription}
        disabled={loading}
      >
        {loading
          ? "Procesando..."
          : subscribed
            ? "🔔 Avisos activados"
            : "🔔 Avísame de nuevas citas"}
      </button>

      {message && (
        <div
          className="muted"
          style={{
            fontSize: 13,
            marginTop: 8,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}