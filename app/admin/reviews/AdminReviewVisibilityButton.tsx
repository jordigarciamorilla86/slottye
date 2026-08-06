"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    currentVisible,
    setCurrentVisible,
  ] =
    useState(
      visible
    );

  useEffect(() => {
    setCurrentVisible(
      visible
    );
  }, [
    visible,
  ]);

  async function changeVisibility() {
    if (loading) {
      return;
    }

    const nextVisible =
      !currentVisible;

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

    try {
      const response =
        await fetch(
          `/api/admin/reviews/${reviewId}/visibility`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                visible:
                  nextVisible,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        window.alert(
          result.error ??
            "No se pudo cambiar la visibilidad de la reseña."
        );

        return;
      }

      setCurrentVisible(
        result.visible
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Error changing review visibility:",
        error
      );

      window.alert(
        "No se pudo cambiar la visibilidad de la reseña."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn"
      disabled={
        loading
      }
      onClick={
        changeVisibility
      }
      style={
        currentVisible
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
        : currentVisible
          ? "Ocultar reseña"
          : "Mostrar reseña"}
    </button>
  );
}