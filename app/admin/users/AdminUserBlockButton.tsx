"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  async function changeBlockedStatus() {
    if (isAdmin) {
      return;
    }

    const nextBlocked = !blocked;

    const confirmed = window.confirm(
      nextBlocked
        ? `¿Bloquear a "${userName}"? No podrá acceder a las zonas privadas de Slottye.`
        : `¿Desbloquear a "${userName}"? Podrá volver a utilizar su cuenta normalmente.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc(
      "admin_set_user_blocked",
      {
        p_user_id: userId,
        p_blocked: nextBlocked,
      }
    );

    if (error) {
      console.error(
        "Error changing user blocked status:",
        error
      );

      alert(
        "No se pudo cambiar el estado del usuario."
      );

      setLoading(false);
      return;
    }

    router.refresh();
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
      disabled={loading}
      onClick={changeBlockedStatus}
      style={
        blocked
          ? {
              color: "#166534",
              borderColor: "#bbf7d0",
            }
          : {
              color: "#b91c1c",
              borderColor: "#fecaca",
            }
      }
    >
      {loading
        ? "Procesando..."
        : blocked
          ? "Desbloquear usuario"
          : "Bloquear usuario"}
    </button>
  );
}