import Link from "next/link";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Heart,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="footer4">
      <div className="shell footer4-main">
        <div className="footer4-brand">
          <Link
            href="/"
            className="footer4-logo"
          >
            Slotty
            <span>
              e
            </span>
          </Link>

          <p>
            La forma más fácil de encontrar negocios,
            consultar citas disponibles y reservar online.
          </p>

          <a
            href="mailto:contacto@slottye.com"
            className="footer4-contact"
          >
            <Mail
              size={17}
              strokeWidth={2}
              aria-hidden="true"
            />

            contacto@slottye.com
          </a>
        </div>

        <div className="footer4-column">
          <strong>
            Para usuarios
          </strong>

          <Link href="/category/todos">
            <Search
              size={15}
              aria-hidden="true"
            />

            Buscar negocios
          </Link>

          <Link href="/account/bookings">
            <CalendarDays
              size={15}
              aria-hidden="true"
            />

            Mis citas
          </Link>

          <Link href="/account/saved">
            <Heart
              size={15}
              aria-hidden="true"
            />

            Mis negocios
          </Link>
        </div>

        <div className="footer4-column">
          <strong>
            Para negocios
          </strong>

          <Link href="/business-dashboard">
            <BarChart3
              size={15}
              aria-hidden="true"
            />

            Estadísticas
          </Link>

          <Link href="/login?mode=signup&role=business">
            <BriefcaseBusiness
              size={15}
              aria-hidden="true"
            />

            Crear cuenta de negocio
          </Link>
        </div>

        <div className="footer4-column">
          <strong>
            Legal
          </strong>

          <Link href="/privacy">
            <ShieldCheck
              size={15}
              aria-hidden="true"
            />

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
      </div>

      <div className="shell footer4-bottom">
        <span>
          © 2026 Slottye · Reserva. Confirma. Listo.
        </span>

        <div>
          <Link href="/privacy">
            Privacidad
          </Link>

          <Link href="/terms">
            Términos
          </Link>

          <Link href="/legal">
            Aviso legal
          </Link>
        </div>
      </div>
    </footer>
  );
}