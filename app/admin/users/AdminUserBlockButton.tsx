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
  blocked: boolean;
  isAdmin: boolean;
};

export default function AdminUserBlockButton({
  userId,
  userName,
  blocked,
  isAdmin,
}: Props) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    currentBlocked,
    setCurrentBlocked,
  ] =
    useState(
      blocked
    );
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function changeBlockedStatus() {
    if (
      isAdmin ||
      loading
    ) {
      return;
    }

    const nextBlocked =
      !currentBlocked;

    setLoading(true);

    try {
      const response =
        await fetch(
          `/api/admin/users/${userId}/blocked`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                blocked:
                  nextBlocked,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setErrorMessage(result.error ?? "No se pudo cambiar el estado del usuario.");

        return;
      }

      setCurrentBlocked(
        result.blocked
      );
      setErrorMessage("");

      router.refresh();
    } catch (error) {
      console.error(
        "Error changing user blocked status:",
        error
      );

      setErrorMessage("No se pudo cambiar el estado del usuario.");
    } finally {
      setLoading(false);
    }
  }

  if (isAdmin) {
    return (
      <button
        type="button"
        className="btn"
        disabled
        title="No se puede bloquear una cuenta administradora"
      >
        Cuenta administradora
      </button>
    );
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
        currentBlocked
          ? {
              color:
                "#166534",

              borderColor:
                "#bbf7d0",
            }
          : {
              color:
                "#b91c1c",

              borderColor:
                "#fecaca",
            }
      }
    >
      {loading
        ? "Procesando..."
        : currentBlocked
          ? "Desbloquear usuario"
          : "Bloquear usuario"}
    </button>
    {errorMessage && <p role="alert" style={{ color: "#b91c1c", margin: "8px 0 0", fontSize: 13 }}>{errorMessage}</p>}
    <ConfirmDialog open={open} onOpenChange={setOpen} title={currentBlocked ? "Desbloquear usuario" : "Bloquear usuario"} description={currentBlocked ? `“${userName}” podrá volver a utilizar su cuenta normalmente.` : `“${userName}” no podrá acceder a las zonas privadas de Slottye.`} variant="warning" confirmLabel={currentBlocked ? "Desbloquear" : "Bloquear"} pending={loading} onConfirm={async () => { await changeBlockedStatus(); setOpen(false); }} />
  </>);
}
