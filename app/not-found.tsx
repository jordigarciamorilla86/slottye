import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />

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
            🔎
          </div>

          <div className="kicker">
            Error 404
          </div>

          <h1
            className="business-title"
            style={{
              marginTop: 12,
            }}
          >
            No hemos encontrado esta página
          </h1>

          <p className="lead">
            Puede que el enlace ya no exista o que la dirección
            no sea correcta.
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
            <Link
              href="/"
              className="btn primary"
            >
              Volver a Slottye
            </Link>

            <Link
              href="/category/todos"
              className="btn"
            >
              Ver negocios
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}