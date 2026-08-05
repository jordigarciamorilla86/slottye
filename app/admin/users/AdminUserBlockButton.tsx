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
    currentBlocked,
    setCurrentBlocked,
  ] =
    useState(
      blocked
    );

  /*
   * Sincroniza el estado local cuando el servidor
   * devuelve nuevos datos después de router.refresh().
   */
  useEffect(() => {
    setCurrentBlocked(
      blocked
    );
  }, [
    blocked,
  ]);

  async function changeBlockedStatus() {
    if (
      isAdmin ||
      loading
    ) {
      return;
    }

    const nextBlocked =
      !currentBlocked;

    const confirmed =
      window.confirm(
        nextBlocked
          ? `¿Bloquear a "${userName}"? No podrá acceder a las zonas privadas de Slottye.`
          : `¿Desbloquear a "${userName}"? Podrá volver a utilizar su cuenta normalmente.`
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
          "admin_set_user_blocked",
          {
            p_user_id:
              userId,

            p_blocked:
              nextBlocked,
          }
        );

      if (
        error
      ) {
        console.error(
          "Error changing user blocked status:",
          error
        );

        window.alert(
          error.message ||
            "No se pudo cambiar el estado del usuario."
        );

        return;
      }

      /*
       * Actualización optimista:
       * el botón cambia inmediatamente al nuevo estado
       * sin esperar a que termine router.refresh().
       */
      setCurrentBlocked(
        nextBlocked
      );

      router.refresh();
    } finally {
      setLoading(
        false
      );
    }
  }

  if (
    isAdmin
  ) {
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

  return (
    <button
      type="button"
      className="btn"
      disabled={
        loading
      }
      onClick={
        changeBlockedStatus
      }
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
  );
}