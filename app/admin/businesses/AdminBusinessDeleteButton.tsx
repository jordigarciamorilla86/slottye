"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  businessId: string;
  businessName: string;
};

export default function AdminBusinessDeleteButton({
  businessId,
  businessName,
}: Props) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function deleteBusiness() {
    if (
      loading
    ) {
      return;
    }

    setLoading(
      true
    );

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setFeedback({ type: "error", text: result.error ?? "No se ha podido eliminar el negocio." });

        return;
      }

      setFeedback({ type: "success", text: result.emailSent
          ? "Negocio eliminado correctamente. Se ha avisado al propietario."
          : "Negocio eliminado correctamente. No se ha podido avisar al propietario." });

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error deleting business:",
        error
      );

      setFeedback({ type: "error", text: "No se ha podido completar la eliminación." });
    } finally {
      setLoading(
        false
      );
    }
  }

  return (<>
    <button
      type="button"
      className="btn"
      disabled={
        loading
      }
      onClick={() => { setFeedback(null); setOpen(true); }}
      style={{
        color:
          "#ffffff",

        borderColor:
          "#991b1b",

        background:
          "#b91c1c",
      }}
    >
      {loading
        ? "Eliminando..."
        : "Eliminar negocio"}
    </button>
    {feedback && <p role="status" aria-live="polite" style={{ color: feedback.type === "error" ? "#b91c1c" : "#166534", margin: "8px 0 0", fontSize: 13 }}>{feedback.text}</p>}
    <ConfirmDialog open={open} onOpenChange={setOpen} title="Eliminar negocio definitivamente" description={`Se eliminarán servicios, horarios, imágenes, disponibilidades, reservas y datos asociados de “${businessName}”. La cuenta del propietario seguirá activa.`} variant="danger" confirmText="ELIMINAR" pending={loading} onConfirm={async () => { await deleteBusiness(); setOpen(false); }} />
  </>);
}
