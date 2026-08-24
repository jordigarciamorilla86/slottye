"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function changeVisibility() {
    if (loading) {
      return;
    }

    const nextVisible =
      !currentVisible;

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
        setErrorMessage(result.error ?? "No se pudo cambiar la visibilidad de la reseña.");

        return;
      }

      setCurrentVisible(
        result.visible
      );
      setErrorMessage("");

      router.refresh();
    } catch (error) {
      console.error(
        "Error changing review visibility:",
        error
      );

      setErrorMessage("No se pudo cambiar la visibilidad de la reseña.");
    } finally {
      setLoading(false);
    }
  }

  return (<>
    <button
      type="button"
      className="btn"
      disabled={
        loading
      }
      onClick={() => setOpen(true)}
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
    {errorMessage && <p role="alert" style={{ color: "#b91c1c", margin: "8px 0 0", fontSize: 13 }}>{errorMessage}</p>}
    <ConfirmDialog open={open} onOpenChange={setOpen} title={currentVisible ? "Ocultar reseña" : "Mostrar reseña"} description={currentVisible ? "La reseña dejará de mostrarse públicamente en Slottye." : "La reseña volverá a mostrarse públicamente en Slottye."} variant="warning" confirmLabel={currentVisible ? "Ocultar" : "Mostrar"} pending={loading} onConfirm={async () => { await changeVisibility(); setOpen(false); }} />
  </>);
}
