"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

  async function deleteBusiness() {
    if (
      loading
    ) {
      return;
    }

    const confirmation =
      window.prompt(
        `Vas a eliminar definitivamente el negocio "${businessName}".\n\nSe borrarán sus servicios, horarios, imágenes, disponibilidades, reservas y demás datos asociados. La cuenta del propietario seguirá activa.\n\nEscribe ELIMINAR para continuar.`
      );

    if (
      confirmation !==
      "ELIMINAR"
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
        window.alert(
          result.error ??
            "No se ha podido eliminar el negocio."
        );

        return;
      }

      window.alert(
        result.emailSent
          ? "Negocio eliminado correctamente. Se ha avisado al propietario."
          : "Negocio eliminado correctamente. No se ha podido avisar al propietario."
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error deleting business:",
        error
      );

      window.alert(
        "No se ha podido completar la eliminación."
      );
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
        deleteBusiness
      }
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
  );
}