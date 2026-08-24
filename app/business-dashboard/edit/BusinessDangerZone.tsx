"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Trash2,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function BusinessDangerZone() {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function deleteAccount() {
    if (
      confirmation.trim() !==
      "ELIMINAR"
    ) {
      setMessage(
        'Escribe "ELIMINAR" para confirmar.'
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/account/delete",
          {
            method: "DELETE",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setMessage(
          result.error ??
            "No se ha podido eliminar la cuenta."
        );

        return;
      }

      await supabase.auth
        .signOut();

      router.push("/");
      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error deleting business account:",
        error
      );

      setMessage(
        "Ha ocurrido un error inesperado. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  const canDelete =
    confirmation.trim() ===
      "ELIMINAR" &&
    !loading;

  return (
    <section className="danger10">
      <div className="danger10-copy">
        <span className="danger10-kicker">
          Zona de peligro
        </span>

        <h2>
          Eliminar cuenta y negocio
        </h2>

        <p>
          Esta acción es permanente. Se eliminarán tu cuenta de Slottye,
          el negocio y todos sus datos asociados.
        </p>
      </div>

      <div className="danger10-confirm">
        <label>
          <span>
            Escribe <strong>ELIMINAR</strong> para confirmar
          </span>

          <input
            value={confirmation}
            onChange={(event) =>
              setConfirmation(
                event.target.value
              )
            }
            placeholder="ELIMINAR"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          className="danger10-button"
          disabled={!canDelete}
          onClick={deleteAccount}
        >
          <Trash2
            size={15}
            strokeWidth={2}
            aria-hidden="true"
          />

          {loading
            ? "Eliminando..."
            : "Eliminar cuenta y negocio"}
        </button>
      </div>

      {message && (
        <div
          role="alert"
          className="danger10-message"
        >
          {message}
        </div>
      )}

      <style jsx>{`
        .danger10 {
          display: grid;
          grid-template-columns:
            minmax(0,1.25fr)
            minmax(420px,.9fr);
          align-items: end;
          gap: 18px;
          margin-top: 14px;
          padding: 15px 17px;
          border: 1px solid #fecaca;
          border-radius: 15px;
          background: #fffafa;
        }

        .danger10-kicker {
          color: #b91c1c;
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .danger10 h2 {
          margin: 3px 0 4px;
          font-size: 18px;
          letter-spacing: -.02em;
        }

        .danger10 p {
          max-width: 690px;
          margin: 0;
          color: #756969;
          font-size: 11.5px;
          line-height: 1.45;
        }

        .danger10-confirm {
          display: grid;
          grid-template-columns:
            minmax(220px,1fr)
            auto;
          align-items: end;
          gap: 10px;
        }

        .danger10-confirm label > span {
          display: block;
          margin-bottom: 5px;
          color: #5e4e4e;
          font-size: 10.5px;
        }

        .danger10-confirm input {
          width: 100%;
          min-height: 36px;
          padding: 8px 10px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 11.5px;
          outline: none;
        }

        .danger10-button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 11px;
          border: 1px solid #f4b3b3;
          border-radius: 9px;
          background: #fff;
          color: #b91c1c;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .danger10-button:disabled {
          opacity: .48;
          cursor: not-allowed;
        }

        .danger10-message {
          grid-column: 1 / -1;
          padding: 8px 10px;
          border-radius: 8px;
          background: #fff0f0;
          color: #b42318;
          font-size: 10.5px;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .danger10 {
            grid-template-columns: 1fr;
            align-items: stretch;
          }
        }

        @media (max-width: 620px) {
          .danger10 {
            padding: 14px;
          }

          .danger10-confirm {
            grid-template-columns: 1fr;
          }

          .danger10-button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}