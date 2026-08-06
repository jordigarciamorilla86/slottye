"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

  useEffect(() => {
    setCurrentActive(
      active
    );
  }, [
    active,
  ]);

  async function changeStatus() {
    if (loading) {
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

    if (!confirmed) {
      return;
    }

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
        window.alert(
          result.error ??
            "No se pudo cambiar el estado del negocio."
        );

        return;
      }

      setCurrentActive(
        result.active
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Error changing business status:",
        error
      );

      window.alert(
        "No se pudo cambiar el estado del negocio."
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