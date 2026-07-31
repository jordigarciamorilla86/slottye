"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

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

  const supabase =
    createClient();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function changeStatus() {
    const nextActive =
      !active;

    const confirmed =
      window.confirm(
        nextActive
          ? `¿Reactivar "${businessName}"? Volverá a ser visible públicamente en Slottye.`
          : `¿Desactivar "${businessName}"? Dejará de aparecer públicamente en Slottye.`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const {
      error,
    } =
      await supabase.rpc(
        "admin_set_business_active",
        {
          p_business_id:
            businessId,

          p_active:
            nextActive,
        }
      );

    if (error) {
      console.error(
        "Error changing business status:",
        error
      );

      alert(
        "No se pudo cambiar el estado del negocio."
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
        changeStatus
      }
      style={
        active
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
        : active
          ? "Desactivar negocio"
          : "Reactivar negocio"}
    </button>
  );
}