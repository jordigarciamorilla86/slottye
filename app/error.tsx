"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
};

export default function GlobalError({
  error,
  reset,
}: Props) {
  useEffect(() => {
    console.error(
      "Error de aplicación:",
      error
    );
  }, [error]);

  return (
    <main
      className="shell detail"
      style={{
        maxWidth: 760,
      }}
    >
      <section
        className="panel"
        style={{
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 52,
            marginBottom: 14,
          }}
        >
          ⚠️
        </div>

        <div className="kicker">
          Algo ha fallado
        </div>

        <h1
          className="business-title"
          style={{
            marginTop: 12,
          }}
        >
          No hemos podido cargar esta página
        </h1>

        <p className="lead">
          Puedes intentarlo de nuevo o volver al inicio.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <button
            type="button"
            className="btn primary"
            onClick={() => reset()}
          >
            Intentar de nuevo
          </button>

          <Link
            href="/"
            className="btn"
          >
            Volver al inicio
          </Link>
        </div>

        {error.digest && (
          <p
            className="muted"
            style={{
              marginTop: 20,
              fontSize: 12,
            }}
          >
            Referencia: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}