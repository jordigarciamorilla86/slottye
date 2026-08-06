"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

    if (!confirmed) {
      return;
    }

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
        window.alert(
          result.error ??
            "No se pudo cambiar el estado del usuario."
        );

        return;
      }

      setCurrentBlocked(
        result.blocked
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Error changing user blocked status:",
        error
      );

      window.alert(
        "No se pudo cambiar el estado del usuario."
      );
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