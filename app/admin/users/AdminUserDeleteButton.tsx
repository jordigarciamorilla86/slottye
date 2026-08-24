"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  userId: string;
  userName: string;
  isAdmin: boolean;
};

export default function AdminUserDeleteButton({
  userId,
  userName,
  isAdmin,
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

  async function deleteUser() {
    if (
      isAdmin ||
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
          `/api/admin/users/${userId}`,
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
        setFeedback({ type: "error", text: result.error ?? "No se ha podido eliminar el usuario." });

        return;
      }

      setFeedback({ type: "success", text: result.emailSent
          ? "Usuario eliminado correctamente. Se le ha enviado un correo informativo."
          : "Usuario eliminado correctamente. No se ha podido enviar el correo informativo." });

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error deleting user:",
        error
      );

      setFeedback({ type: "error", text: "No se ha podido completar la eliminación." });
    } finally {
      setLoading(
        false
      );
    }
  }

  if (
    isAdmin
  ) {
    return null;
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
        : "Eliminar usuario"}
    </button>
    {feedback && <p role="status" aria-live="polite" style={{ color: feedback.type === "error" ? "#b91c1c" : "#166534", margin: "8px 0 0", fontSize: 13 }}>{feedback.text}</p>}
    <ConfirmDialog open={open} onOpenChange={setOpen} title="Eliminar usuario definitivamente" description={`Se eliminarán el acceso, perfil y datos asociados de “${userName}”. Si tiene un negocio, también se eliminará.`} variant="danger" confirmText="ELIMINAR" pending={loading} onConfirm={async () => { await deleteUser(); setOpen(false); }} />
  </>);
}
