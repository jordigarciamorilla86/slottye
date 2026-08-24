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
  active: boolean;
};

export default function AdminBusinessStatusButton({
  businessId,
  businessName,
  active,
}: Props) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    currentActive,
    setCurrentActive,
  ] =
    useState(
      active
    );
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function changeStatus() {
    if (loading) {
      return;
    }

    const nextActive =
      !currentActive;

    setLoading(true);

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/status`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                active:
                  nextActive,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setErrorMessage(result.error ?? "No se pudo cambiar el estado del negocio.");

        return;
      }

      setCurrentActive(
        result.active
      );
      setErrorMessage("");

      router.refresh();
    } catch (error) {
      console.error(
        "Error changing business status:",
        error
      );

      setErrorMessage("No se pudo cambiar el estado del negocio.");
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
        currentActive
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
        : currentActive
          ? "Desactivar negocio"
          : "Reactivar negocio"}
    </button>
    {errorMessage && <p role="alert" style={{ color: "#b91c1c", margin: "8px 0 0", fontSize: 13 }}>{errorMessage}</p>}
    <ConfirmDialog open={open} onOpenChange={setOpen} title={currentActive ? "Desactivar negocio" : "Reactivar negocio"} description={currentActive ? `“${businessName}” dejará de aparecer públicamente en Slottye.` : `“${businessName}” volverá a ser visible públicamente en Slottye.`} variant="warning" confirmLabel={currentActive ? "Desactivar" : "Reactivar"} pending={loading} onConfirm={async () => { await changeStatus(); setOpen(false); }} />
  </>);
}
