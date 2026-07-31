"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  reviewId: string;
  visible: boolean;
};

export default function AdminReviewVisibilityButton({
  reviewId,
  visible,
}: Props) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function changeVisibility() {
    const nextVisible =
      !visible;

    const confirmed =
      window.confirm(
        nextVisible
          ? "¿Volver a mostrar esta reseña públicamente?"
          : "¿Ocultar esta reseña de Slottye?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const {
      error,
    } =
      await supabase.rpc(
        "admin_set_review_visible",
        {
          p_review_id:
            reviewId,

          p_visible:
            nextVisible,
        }
      );

    if (error) {
      console.error(
        "Error changing review visibility:",
        error
      );

      alert(
        "No se pudo cambiar la visibilidad de la reseña."
      );

      setLoading(false);

      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn"
      disabled={loading}
      onClick={
        changeVisibility
      }
      style={
        visible
          ? {
              color:
                "#b91c1c",

              borderColor:
                "#fecaca",
            }
          : {
              color:
                "#166534",

              borderColor:
                "#bbf7d0",
            }
      }
    >
      {loading
        ? "Procesando..."
        : visible
          ? "Ocultar reseña"
          : "Mostrar reseña"}
    </button>
  );
}