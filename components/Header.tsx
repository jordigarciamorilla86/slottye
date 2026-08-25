"use client";

import Image from "next/image";
import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Clock3,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

type Profile = {
  name: string | null;
  role: string | null;
  is_admin: boolean;
};

const MOBILE_BREAKPOINT = 900;

export function Header() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const managementMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    loggedIn,
    setLoggedIn,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    );

  const [
    businessSlug,
    setBusinessSlug,
  ] =
    useState<string | null>(
      null
    );


  const [
    onboardingPending,
    setOnboardingPending,
  ] =
    useState(false);

  const [
    mobile,
    setMobile,
  ] =
    useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  const [
    managementOpen,
    setManagementOpen,
  ] =
    useState(false);

  /*
   * ============================================================
   * CARGAR USUARIO + PERFIL
   * ============================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadProfile(
      userId:
        string
    ) {
      const {
        data:
          profileData,
        error,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(`
            name,
            role,
            is_admin
          `)
          .eq(
            "id",
            userId
          )
          .maybeSingle();

      if (
        error
      ) {
        console.error(
          "Error loading profile:",
          error
        );
      }

      if (
        active
      ) {
        setProfile(
          profileData ??
            null
        );
      }

      if (
        profileData?.role ===
        "business"
      ) {
        const {
          data:
            businessData,
          error:
            businessError,
        } =
          await supabase
            .from(
              "businesses"
            )
            .select(`
  slug,
  onboarding_completed_at
`)
            .eq(
              "owner_id",
              userId
            )
            .maybeSingle();

        if (
          businessError
        ) {
          console.error(
            "Error loading business:",
            businessError
          );
        }

        if (
          active
        ) {
          setBusinessSlug(
            businessData?.slug ??
              null
          );

          /*
 * Un usuario business permanece en modo
 * configuración inicial cuando:
 *
 * - todavía no ha creado su negocio; o
 * - ya lo ha creado, pero no ha finalizado
 *   el onboarding.
 */
setOnboardingPending(
  !businessData ||
  !businessData.onboarding_completed_at
);
        }
      } else if (
        active
      ) {
        setBusinessSlug(
          null
        );
        setOnboardingPending(
          false
        );
      }
    }

    async function loadSession() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (
        !active
      ) {
        return;
      }

      if (
        !user
      ) {
        setLoggedIn(
          false
        );

        setProfile(
          null
        );

        setBusinessSlug(
          null
        );

        setOnboardingPending(
          false
        );

        setLoading(
          false
        );

        return;
      }

      setLoggedIn(
        true
      );

      await loadProfile(
        user.id
      );

      if (
        active
      ) {
        setLoading(
          false
        );
      }
    }

    void loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session
        ) => {
          const user =
            session?.user;

          if (
            !user
          ) {
            setLoggedIn(
              false
            );

            setProfile(
              null
            );

            setBusinessSlug(
              null
            );

            setOnboardingPending(
              false
            );

            setLoading(
              false
            );

            return;
          }

          setLoggedIn(
            true
          );

          await loadProfile(
            user.id
          );

          setLoading(
            false
          );
        }
      );

    return () => {
      active =
        false;

      subscription.unsubscribe();
    };
  }, [
    supabase,
  ]);

  /*
   * ============================================================
   * RESPONSIVE
   * ============================================================
   */

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        `(max-width: ${MOBILE_BREAKPOINT}px)`
      );

    function updateMobile() {
      setMobile(
        mediaQuery.matches
      );

      if (
        !mediaQuery.matches
      ) {
        setMenuOpen(
          false
        );

        setManagementOpen(
          false
        );
      } else {
        setManagementOpen(
          false
        );
      }
    }

    updateMobile();

    mediaQuery.addEventListener(
      "change",
      updateMobile
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMobile
      );
    };
  }, []);

  /*
   * ============================================================
   * CERRAR MENÚ
   * ============================================================
   */

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          setMenuOpen(
            false
          );

          setManagementOpen(
            false
          );
        },
        0
      );

    return () =>
      window.clearTimeout(
        timeoutId
      );
  }, [
    pathname,
  ]);

  useEffect(() => {
    function handlePointerDown(
      event:
        MouseEvent
    ) {
      if (
        event.target instanceof
          Node
      ) {
        if (
          menuOpen &&
          menuRef.current &&
          !menuRef.current.contains(
            event.target
          )
        ) {
          setMenuOpen(
            false
          );
        }

        if (
          managementOpen &&
          managementMenuRef.current &&
          !managementMenuRef.current.contains(
            event.target
          )
        ) {
          setManagementOpen(
            false
          );
        }
      }
    }

    function handleKeyDown(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setMenuOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    menuOpen,
    managementOpen,
  ]);

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  async function handleLogout() {
    setMenuOpen(
      false
    );

    await supabase.auth.signOut();

    setLoggedIn(
      false
    );

    setProfile(
      null
    );

    setBusinessSlug(
      null
    );

    setOnboardingPending(
      false
    );

    setManagementOpen(
      false
    );

    router.push(
      "/"
    );

    router.refresh();
  }

  /*
   * ============================================================
   * DATOS DERIVADOS
   * ============================================================
   */

  const displayName =
    profile?.name
      ?.trim() ||
    null;

  const businessUser =
    profile?.role ===
    "business";

    const onboardingHref =
  businessSlug
    ? "/business-dashboard/setup"
    : "/business-dashboard/create";
  
    const adminUser =
  profile?.is_admin ===
  true;

  const panelHref =
    businessUser
      ? "/business-dashboard"
      : "/account";

  const primaryActionHref =
    businessUser
      ? "/business-dashboard/agenda"
      : "/account/bookings";

  const primaryActionText =
    businessUser
      ? "Agenda"
      : "Mis citas";

  const businessManagementLinks = [
    {
      href:
        "/business-dashboard",

      icon: "statistics",

      label:
        "Estadísticas",
    },
    {
      href:
        "/business-dashboard/edit",

      icon: "edit",

      label:
        "Editar mi negocio",
    },
    {
      href:
        "/business-dashboard/hours",

      icon: "hours",

      label:
        "Horarios",
    },
    {
      href:
        "/business-dashboard/services",

      icon: "services",

      label:
        "Servicios",
    },
    {
      href:
        "/business-dashboard/calendar",

      icon: "calendar",

      label:
        "Calendario y disponibilidad",
    },
    {
      href:
        "/business-dashboard/bookings",

      icon: "bookings",

      label:
        "Reservas",
    },
    {
      href:
        "/business-dashboard/subscribers",

      icon: "subscribers",

      label:
        "Suscriptores",
    },
  ];

  function ManagementIcon({
    icon,
  }: {
    icon: string;
  }) {
    const props = {
      size: 18,
      strokeWidth: 2,
      "aria-hidden": true,
    } as const;

    switch (icon) {
      case "statistics":
        return <LayoutDashboard {...props} />;
      case "edit":
        return <Settings2 {...props} />;
      case "hours":
        return <Clock3 {...props} />;
      case "services":
        return <Wrench {...props} />;
      case "calendar":
        return <CalendarDays {...props} />;
      case "bookings":
        return <BriefcaseBusiness {...props} />;
      case "subscribers":
        return <Bell {...props} />;
      case "account":
        return <CircleUserRound {...props} />;
      default:
        return <Settings2 {...props} />;
    }
  }

  const isActive = (
    href: string
  ) => {
    if (
      href === "/business-dashboard"
    ) {
      return (
        pathname ===
        "/business-dashboard"
      );
    }

    if (href === "/account") {
      return pathname === "/account";
    }

    return (
      pathname === href ||
      (
        href !== "/" &&
        pathname.startsWith(
          `${href}/`
        )
      )
    );
  };

  const renderManagementLinks =
    () =>
      businessManagementLinks.map(
        (
          item
        ) => (
          <Link
            key={
              item.href
            }
            href={
              item.href
            }
            role="menuitem"
            className={
              isActive(
                item.href
              )
                ? "site-header-menu-link is-active"
                : "site-header-menu-link"
            }
          >
            <span className="site-header-menu-icon">
              <ManagementIcon
                icon={
                  item.icon
                }
              />
            </span>

            <span>
              {item.label}
            </span>
          </Link>
        )
      );

  const renderLogoutButton =
    () => (
      <button
        type="button"
        role="menuitem"
        onClick={
          handleLogout
        }
        className="site-header-menu-link site-header-logout-link"
      >
        <span className="site-header-menu-icon">
          <LogOut
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>

        <span>
          Cerrar sesión
        </span>
      </button>
    );

  const renderMobileMenuButton =
    () => (
      <button
        type="button"
        className="site-header-mobile-trigger"
        aria-label={
          menuOpen
            ? "Cerrar menú"
            : "Abrir menú"
        }
        aria-expanded={
          menuOpen
        }
        aria-controls="slottye-mobile-menu"
        onClick={() =>
          setMenuOpen(
            (
              current
            ) =>
              !current
          )
        }
      >
        {menuOpen ? (
          <X
            size={22}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        ) : (
          <Menu
            size={22}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        )}
      </button>
    );

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link
          className="site-header-brand"
          href={
            businessUser &&
            onboardingPending
              ? onboardingHref
              : "/"
          }
          aria-label={
            businessUser &&
            onboardingPending
              ? "Slottye - Configuración inicial"
              : "Slottye - Inicio"
          }
        >
          <span className="site-header-brand-icon">
            <Image
              src="/slottye-icon.png"
              alt=""
              width={38}
              height={38}
              priority
              aria-hidden="true"
            />
          </span>

          <span className="site-header-wordmark">
            Slotty
            <span>
              e
            </span>
          </span>
        </Link>

        <nav
          className="site-header-nav"
          aria-label="Navegación principal"
        >
          {!loading &&
          loggedIn ? (
            businessUser &&
            onboardingPending ? (
              <>
                {!mobile && (
                  <div className="site-header-desktop-actions">
                    <div className="site-header-main-actions">
                      <Link
                        href={
                          onboardingHref
                        }
                        className="site-header-action is-highlighted"
                      >
                        <Settings2
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        Configuración inicial
                      </Link>
                    </div>

                  </div>
                )}

                {mobile && (
                  <div
                    ref={
                      menuRef
                    }
                    className="site-header-mobile"
                  >
                    {renderMobileMenuButton()}

                    {menuOpen && (
                      <div
                        id="slottye-mobile-menu"
                        role="menu"
                        className="site-header-mobile-menu"
                      >
                        {displayName && (
                          <div className="site-header-mobile-profile">
                            <span className="site-header-avatar is-large">
                              <UserRound
                                size={19}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </span>

                            <div>
                              <span>
                                Sesión iniciada
                              </span>

                              <strong>
                                {displayName}
                              </strong>
                            </div>
                          </div>
                        )}

                        <Link
                          href={
                            onboardingHref
                          }
                          role="menuitem"
                          className="site-header-menu-link is-active"
                        >
                          <span className="site-header-menu-icon">
                            <Settings2
                              size={18}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </span>

                          Configuración inicial
                        </Link>

                        <div className="site-header-menu-separator" />

                        {renderLogoutButton()}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {!mobile && (
                  <div className="site-header-desktop-actions">
                    <div className="site-header-main-actions">
                      <Link
                        href={
                          primaryActionHref
                        }
                        className={
                          isActive(
                            primaryActionHref
                          )
                            ? "site-header-action is-active"
                            : "site-header-action"
                        }
                      >
                        <CalendarDays
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        {primaryActionText}
                      </Link>

                    {businessUser && (
                      <Link
                        href="/account/bookings"
                        className={
                          isActive(
                            "/account/bookings"
                          )
                            ? "site-header-action is-active"
                            : "site-header-action"
                        }
                      >
                        <BriefcaseBusiness
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        Mis citas
                      </Link>
                    )}

                    {businessUser && (
                      <div
                        ref={
                          managementMenuRef
                        }
                        className="site-header-dropdown"
                      >
                        <button
                          type="button"
                          className={
                            managementOpen
                              ? "site-header-action is-open"
                              : "site-header-action"
                          }
                          aria-haspopup="menu"
                          aria-expanded={
                            managementOpen
                          }
                          onClick={() =>
                            setManagementOpen(
                              (
                                current
                              ) =>
                                !current
                            )
                          }
                        >
                          <Settings2
                            size={17}
                            strokeWidth={2}
                            aria-hidden="true"
                          />

                          Gestión

                          <ChevronDown
                            size={15}
                            strokeWidth={2.2}
                            aria-hidden="true"
                            className={
                              managementOpen
                                ? "site-header-chevron is-open"
                                : "site-header-chevron"
                            }
                          />
                        </button>

                        {managementOpen && (
                          <div
                            role="menu"
                            className="site-header-dropdown-menu"
                          >
                            <div className="site-header-menu-label">
                              Gestionar negocio
                            </div>

                            {renderManagementLinks()}

                          </div>
                        )}
                      </div>
                    )}

                    {!businessUser && (
                      <Link
                        className={
                          isActive(
                            panelHref
                          )
                            ? "site-header-action is-active"
                            : "site-header-action"
                        }
                        href={
                          panelHref
                        }
                      >
                        <LayoutDashboard
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        Mi panel
                      </Link>
                    )}

                      {adminUser && (
                        <Link
                          href="/admin"
                          className={
                            isActive(
                              "/admin"
                            )
                              ? "site-header-action is-active"
                              : "site-header-action"
                          }
                        >
                          <ShieldCheck
                            size={17}
                            strokeWidth={2}
                            aria-hidden="true"
                          />

                          Administración
                        </Link>
                      )}
                    </div>

                  </div>
                )}

                {mobile && (
                  <div
                    ref={
                      menuRef
                    }
                    className="site-header-mobile"
                  >
                    {renderMobileMenuButton()}

                    {menuOpen && (
                      <div
                        id="slottye-mobile-menu"
                        role="menu"
                        className="site-header-mobile-menu"
                      >
                        {displayName && (
                          businessUser ? (
                            <Link
                              href="/account"
                              role="menuitem"
                              className="site-header-mobile-profile"
                              aria-label="Ir a mi panel"
                            >
                              <span className="site-header-avatar is-large">
                                <Settings2 size={19} strokeWidth={2} aria-hidden="true" />
                              </span>

                              <div>
                                <span>Mi panel</span>
                                <strong>{displayName}</strong>
                              </div>
                            </Link>
                          ) : (
                            <div className="site-header-mobile-profile">
                              <span className="site-header-avatar is-large">
                                <UserRound size={19} strokeWidth={2} aria-hidden="true" />
                              </span>

                              <div>
                                <span>Hola</span>
                                <strong>{displayName}</strong>
                              </div>
                            </div>
                          )
                        )}

                        <Link
                          href={
                            primaryActionHref
                          }
                          role="menuitem"
                          className={
                            isActive(
                              primaryActionHref
                            )
                              ? "site-header-menu-link is-active"
                              : "site-header-menu-link"
                          }
                        >
                          <span className="site-header-menu-icon">
                            <CalendarDays
                              size={18}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </span>

                          {primaryActionText}
                        </Link>

                        {businessUser && (
                          <Link
                            href="/account/bookings"
                            role="menuitem"
                            className={
                              isActive(
                                "/account/bookings"
                              )
                                ? "site-header-menu-link is-active"
                                : "site-header-menu-link"
                            }
                          >
                            <span className="site-header-menu-icon">
                              <BriefcaseBusiness
                                size={18}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </span>

                            Mis citas
                          </Link>
                        )}

                        {businessUser && (
                          <>
                            <div className="site-header-menu-label">
                              Gestión
                            </div>

                            {renderManagementLinks()}

                            <div className="site-header-menu-separator" />
                          </>
                        )}

                        {!businessUser && (
                          <Link
                            href={
                              panelHref
                            }
                            role="menuitem"
                            className={
                              isActive(
                                panelHref
                              )
                                ? "site-header-menu-link is-active"
                                : "site-header-menu-link"
                            }
                          >
                            <span className="site-header-menu-icon">
                              <CircleUserRound
                                size={18}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </span>

                            Mi panel
                          </Link>
                        )}

                        {adminUser && (
                          <Link
                            href="/admin"
                            role="menuitem"
                            className={
                              isActive(
                                "/admin"
                              )
                                ? "site-header-menu-link is-active"
                                : "site-header-menu-link"
                            }
                          >
                            <span className="site-header-menu-icon">
                              <ShieldCheck
                                size={18}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </span>

                            Administración
                          </Link>
                        )}

                        <div className="site-header-menu-separator" />

                        {renderLogoutButton()}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          ) : !loading ? (
            <>
              {!mobile && (
                <div className="site-header-desktop-actions">
                  <Link
                    className="site-header-login-button"
                    href="/login"
                  >
                    <LogIn
                      size={17}
                      strokeWidth={2}
                      aria-hidden="true"
                    />

                    Entrar o crear cuenta
                  </Link>
                </div>
              )}

              {mobile && (
                <div
                  ref={
                    menuRef
                  }
                  className="site-header-mobile"
                >
                  {renderMobileMenuButton()}

                  {menuOpen && (
                    <div
                      id="slottye-mobile-menu"
                      role="menu"
                      className="site-header-mobile-menu"
                    >
                      <Link
                        href="/login"
                        role="menuitem"
                        className="site-header-menu-link site-header-menu-login"
                      >
                        <span className="site-header-menu-icon">
                          <LogIn
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </span>

                        Entrar o crear cuenta
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </nav>

        {!loading &&
          loggedIn &&
          !mobile && (
            <div className="site-header-account-zone">
              {displayName && (
                businessUser ? (
                  <Link
                    href="/account"
                    className="site-header-account-profile"
                    aria-label="Ir a mi panel"
                    title="Ir a mi panel"
                  >
                    <span className="site-header-avatar">
                      <Settings2 size={17} strokeWidth={2} aria-hidden="true" />
                    </span>

                    <strong>{displayName}</strong>
                  </Link>
                ) : (
                  <div className="site-header-account-profile">
                    <span className="site-header-avatar">
                      <UserRound size={17} strokeWidth={2} aria-hidden="true" />
                    </span>

                    <strong>{displayName}</strong>
                  </div>
                )
              )}

              <button
                type="button"
                className="site-header-logout-button"
                onClick={
                  handleLogout
                }
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut
                  size={17}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
      </div>
    </header>
  );
}
