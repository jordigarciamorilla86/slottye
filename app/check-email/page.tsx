import Link from "next/link";
import { Header } from "@/components/Header";

type Props = {
  searchParams: Promise<{
    email?: string;
    role?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: Props) {
  const {
    email,
    role,
  } = await searchParams;

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 600,
        }}
      >
        <section
          className="panel"

          style={{
            textAlign:
              "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom:
                12,
            }}
          >
            ✉️
          </div>

          <div className="kicker">
            Cuenta creada
          </div>

          <h1 className="business-title">
            Revisa tu correo
          </h1>

          <p className="lead">
            Te hemos enviado un
            enlace para confirmar
            tu cuenta.
          </p>

          {email && (
            <div
              style={{
                marginTop:
                  18,

                padding:
                  "12px 14px",

                borderRadius:
                  12,

                background:
                  "var(--bg)",

                border:
                  "1px solid var(--border)",
              }}
            >
              <strong>
                {email}
              </strong>
            </div>
          )}

          <p
            className="muted"

            style={{
              marginTop:
                18,
            }}
          >
            Abre el mensaje de
            Slottye y pulsa el enlace
            de confirmación.
          </p>

          {role ===
            "business" && (
            <p className="muted">
              Después de confirmar tu
              cuenta podrás crear la
              ficha de tu negocio e
              importarla desde Google
              Maps si quieres.
            </p>
          )}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "center",

              gap: 10,

              flexWrap:
                "wrap",

              marginTop:
                24,
            }}
          >
            <Link
              href="/login"
              className="btn primary"
            >
              Ir a iniciar sesión
            </Link>

            <Link
              href="/"
              className="btn"
            >
              Volver a Slottye
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}