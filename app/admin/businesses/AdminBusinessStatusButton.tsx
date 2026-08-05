"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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
    useMemo(
      () =>
        createClient(),
      []
    );

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

  /*
   * Sincroniza el estado local cuando el servidor
   * devuelve nuevos datos después de router.refresh().
   */
  useEffect(() => {
    setCurrentActive(
      active
    );
  }, [
    active,
  ]);

  async function changeStatus() {
    if (
      loading
    ) {
      return;
    }

    const nextActive =
      !currentActive;

    const confirmed =
      window.confirm(
        nextActive
          ? `¿Reactivar "${businessName}"? Volverá a ser visible públicamente en Slottye.`
          : `¿Desactivar "${businessName}"? Dejará de aparecer públicamente en Slottye.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setLoading(
      true
    );

    try {
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

      if (
        error
      ) {
        console.error(
          "Error changing business status:",
          error
        );

        window.alert(
          error.message ||
            "No se pudo cambiar el estado del negocio."
        );

        return;
      }

      /*
       * Actualización optimista:
       * el botón cambia inmediatamente al nuevo estado
       * sin esperar a que termine router.refresh().
       */
      setCurrentActive(
        nextActive
      );

      router.refresh();
    } finally {
      setLoading(
        false
      );
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
        changeStatus
      }
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
  );
}