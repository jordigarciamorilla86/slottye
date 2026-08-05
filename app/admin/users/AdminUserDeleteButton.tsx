"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

  async function deleteUser() {
    if (
      isAdmin ||
      loading
    ) {
      return;
    }

    const confirmation =
      window.prompt(
        `Vas a eliminar definitivamente a "${userName}".\n\nSe borrarán su acceso, perfil y datos asociados. Si es propietario de un negocio, también se eliminará el negocio.\n\nEscribe ELIMINAR para continuar.`
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
        window.alert(
          result.error ??
            "No se ha podido eliminar el usuario."
        );

        return;
      }

      window.alert(
        result.emailSent
          ? "Usuario eliminado correctamente. Se le ha enviado un correo informativo."
          : "Usuario eliminado correctamente. No se ha podido enviar el correo informativo."
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error deleting user:",
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

  if (
    isAdmin
  ) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn"
      disabled={
        loading
      }
      onClick={
        deleteUser
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
        : "Eliminar usuario"}
    </button>
  );
}