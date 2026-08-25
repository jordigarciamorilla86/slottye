import Link from "next/link";

import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  Settings2,
  Store,
  Wrench,
} from "lucide-react";

import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";

import AccountSettingsClient from "./AccountSettingsClient";
import { SignOutButton } from "./sign-out-button";

export default async function AccountPage() {
  const {
    supabase,
    user,
    profile,
  } =
    await requireActiveUser();

  const displayName =
    profile?.name?.trim() ||
    "Usuario de Slottye";

  const email =
    profile?.email ??
    user.email ??
    "";

  const role =
    profile?.role ??
    "customer";

  const isBusiness =
    role ===
    "business";

  const { data: business } = isBusiness
    ? await supabase
        .from("businesses")
        .select("slug")
        .eq("owner_id", user.id)
        .maybeSingle()
    : { data: null };

  const businessShortcuts = [
    { href: "/business-dashboard", label: "Estadísticas", detail: "Rendimiento de tu negocio", icon: LayoutDashboard },
    { href: "/business-dashboard/agenda", label: "Agenda", detail: "Gestiona el día a día", icon: CalendarDays },
    { href: "/account/bookings", label: "Mis citas", detail: "Tus reservas como usuario", icon: BriefcaseBusiness },
    { href: "/business-dashboard/edit", label: "Editar mi negocio", detail: "Ficha, imágenes y políticas", icon: Settings2 },
    { href: "/business-dashboard/services", label: "Servicios", detail: "Oferta y duraciones", icon: Wrench },
    { href: "/business-dashboard/hours", label: "Horarios", detail: "Horario habitual", icon: Clock3 },
    { href: "/business-dashboard/calendar", label: "Calendario", detail: "Disponibilidad múltiple", icon: CalendarRange },
    { href: "/business-dashboard/bookings", label: "Reservas", detail: "Gestión e historial", icon: BriefcaseBusiness },
    { href: "/business-dashboard/subscribers", label: "Suscriptores", detail: "Personas que te siguen", icon: Bell },
    ...(business?.slug
      ? [{ href: `/business/${business.slug}`, label: "Ver ficha pública", detail: "Así te ven tus clientes", icon: ExternalLink }]
      : []),
  ];

  return (
    <>
      <Header />

      <main className="account10">
        <div className="account10-shell">
          <header className="account10-hero">
            <div>
              <span className="account10-kicker">
                Mi Slottye
              </span>

              <h1>
                Hola, {displayName}
              </h1>

              <p>
                Gestiona tu cuenta, seguridad y accesos desde un único lugar.
              </p>

              <Link href="/" className="btn account10-home-link">
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
                Volver a Slottye
              </Link>
            </div>

            <div className="account10-profile">
              <div>
                <span>
                  Correo
                </span>

                <strong>
                  {email}
                </strong>
              </div>

              <div>
                <span>
                  Tipo de cuenta
                </span>

                <strong>
                  {isBusiness
                    ? "Negocio"
                    : "Cliente"}
                </strong>
              </div>
            </div>
          </header>

          <section className={`account10-shortcuts${isBusiness ? " is-business" : ""}`}>
            {isBusiness ? (
              businessShortcuts.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={`account10-shortcut${index < 3 ? " is-primary" : ""}`}
                  >
                    <span className="account10-shortcut-icon">
                      <Icon size={19} strokeWidth={2} aria-hidden="true" />
                    </span>

                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <>
                <Link
                  href="/account/bookings"
                  className="account10-shortcut is-primary"
                >
                  <span className="account10-shortcut-icon">
                    <CalendarDays
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    
                    />
                  </span>

                  <div>
                    <strong>
                      Mis citas
                    </strong>

                    <span>
                      Próximas reservas e historial.
                    </span>
                  </div>
                </Link>

                <Link
                  href="/account/saved"
                  className="account10-shortcut"
                >
                  <span className="account10-shortcut-icon">
                    <Store
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </span>

                  <div>
                    <strong>
                      Mis negocios
                    </strong>

                    <span>
                      Favoritos y suscripciones.
                    </span>
                  </div>
                </Link>
              </>
            )}
          </section>

          <AccountSettingsClient
            initialEmail={email}
            role={role}
          />

          <section className="account10-session">
            <div>
              <strong>
                Sesión
              </strong>

              <span>
                Cierra la sesión actual de Slottye.
              </span>
            </div>

            <SignOutButton />
          </section>
        </div>

        <style>{`
          .account10 {
            min-height: 100vh;
            padding: 22px 20px 54px;
            background: #f8f8fb;
          }

          .account10-shell {
            width: min(1050px,100%);
            margin: 0 auto;
          }

          .account10-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 28px;
            padding: 24px 26px;
            border: 1px solid var(--border);
            border-radius: 20px;
            background:
              radial-gradient(
                circle at 88% 12%,
                rgba(112,87,245,.09),
                transparent 30%
              ),
              #fff;
            box-shadow:
              0 16px 42px
              rgba(31,27,48,.035);
          }

          .account10-kicker {
            color: var(--accent-dark);
            font-size: 11px;
            font-weight: 850;
          }

          .account10-hero h1 {
            margin: 6px 0 5px;
            font-size: clamp(30px,3vw,38px);
            line-height: 1.08;
            letter-spacing: -.04em;
          }

          .account10-hero p {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
          }

          .account10-home-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 14px;
          }

          .account10-profile {
            min-width: 290px;
            display: grid;
            gap: 10px;
          }

          .account10-profile > div {
            display: grid;
            grid-template-columns: 100px minmax(0,1fr);
            gap: 12px;
            align-items: center;
          }

          .account10-profile span {
            color: var(--muted);
            font-size: 10.5px;
            font-weight: 700;
          }

          .account10-profile strong {
            min-width: 0;
            overflow-wrap: anywhere;
            font-size: 12px;
            text-align: right;
          }

          .account10-shortcuts {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 10px;
            margin-top: 14px;
          }

          .account10-shortcuts.is-business {
            grid-template-columns: repeat(3,minmax(0,1fr));
          }

          .account10-shortcut {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 14px 15px;
            border: 1px solid var(--border);
            border-radius: 15px;
            background: #fff;
            color: inherit;
            text-decoration: none;
            transition:
              transform .15s ease,
              border-color .15s ease;
          }

          .account10-shortcut:hover {
            transform: translateY(-1px);
            border-color: #d5cff7;
          }

          .account10-shortcut.is-primary {
            border-color: #d8d1ff;
            background: #fbfaff;
          }

          .account10-shortcut-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 36px;
            border-radius: 10px;
            background: #f0ecff;
            color: var(--accent);
          }
          
          .account10-shortcut-icon svg {
            display: block;
            margin: 0;
            flex: 0 0 auto;
          }

          .account10-shortcut > div strong,
.account10-shortcut > div span {
  display: block;
}

.account10-shortcut > div strong {
  font-size: 12.5px;
}

.account10-shortcut > div span {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.35;
}

          .account10-session {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-top: 14px;
            padding: 16px 18px;
            border: 1px solid var(--border);
            border-radius: 15px;
            background: #fff;
          }

          .account10-session strong,
          .account10-session span {
            display: block;
          }

          .account10-session strong {
            font-size: 12.5px;
          }

          .account10-session span {
            margin-top: 3px;
            color: var(--muted);
            font-size: 10.5px;
          }

          @media (max-width: 760px) {
            .account10 {
              padding: 18px 12px 46px;
            }

            .account10-hero {
              flex-direction: column;
              align-items: stretch;
              padding: 19px;
            }

            .account10-hero h1 {
              font-size: 30px;
            }

            .account10-profile {
              min-width: 0;
            }

            .account10-profile > div {
              grid-template-columns: 1fr;
              gap: 3px;
            }

            .account10-profile strong {
              text-align: left;
            }

            .account10-shortcuts {
              grid-template-columns: 1fr;
            }

            .account10-shortcuts.is-business {
              grid-template-columns: 1fr;
            }

            .account10-session {
              align-items: stretch;
              flex-direction: column;
            }
          }
        `}</style>
      </main>
    </>
  );
}
