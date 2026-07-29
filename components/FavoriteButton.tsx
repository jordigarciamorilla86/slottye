"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  businessId: string;
  loggedIn: boolean;
  initialFavorite: boolean;
};

export function FavoriteButton({
  businessId,
  loggedIn,
  initialFavorite,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [favorite, setFavorite] =
    useState(initialFavorite);

  const [loading, setLoading] =
    useState(false);

  async function toggleFavorite() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (favorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("business_id", businessId);

      if (!error) {
        setFavorite(false);
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          business_id: businessId,
        });

      if (!error) {
        setFavorite(true);
      }
    }

    setLoading(false);
  }

  return (
    <button
      type="button"
      className={
        favorite
          ? "btn primary"
          : "btn"
      }
      onClick={toggleFavorite}
      disabled={loading}
    >
      {loading
        ? "..."
        : favorite
          ? "♥ Guardado"
          : "♡ Guardar"}
    </button>
  );
}