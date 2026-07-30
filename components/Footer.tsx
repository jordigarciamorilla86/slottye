import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        © 2026 Slottye · Reserva. Confirma. Listo.
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          flexWrap: "wrap",
          marginTop: 12,
          fontSize: 14,
        }}
      >
        <Link href="/privacy">
          Política de privacidad
        </Link>

        <Link href="/terms">
          Condiciones de uso
        </Link>

        <Link href="/legal">
          Aviso legal
        </Link>

        <Link href="/cookies">
          Cookies
        </Link>
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 14,
        }}
      >
        <span className="muted">
          Contacto:{" "}
        </span>

        <a
          href="mailto:contacto@slottye.com"
          style={{
            fontWeight: 700,
          }}
        >
          contacto@slottye.com
        </a>
      </div>
    </footer>
  );
}