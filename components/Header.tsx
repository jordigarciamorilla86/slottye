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
    setMenuOpen(
      false
    );

    setManagementOpen(
      false
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
        "/business-dashboard/edit",

      icon:
        "✏️",

      label:
        "Editar mi negocio",
    },
    {
      href:
        "/business-dashboard/images",

      icon:
        "📷",

      label:
        "Imágenes",
    },
    {
      href:
        "/business-dashboard/hours",

      icon:
        "🕒",

      label:
        "Horarios",
    },
    {
      href:
        "/business-dashboard/services",

      icon:
        "🛠️",

      label:
        "Servicios",
    },
    {
      href:
        "/business-dashboard/calendar",

      icon:
        "📅",

      label:
        "Calendario y citas",
    },
    {
      href:
        "/business-dashboard/bookings",

      icon:
        "📋",

      label:
        "Reservas",
    },
    {
      href:
        "/business-dashboard/subscribers",

      icon:
        "🔔",

      label:
        "Suscriptores",
    },
  ];

  /*
   * ============================================================
   * ESTILOS
   * ============================================================
   */

  const quickLinkStyle = {
    display:
      "inline-flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    minHeight:
      42,

    padding:
      "10px 15px",

    border:
      "1px solid var(--border)",

    borderRadius:
      12,

    background:
      "#ffffff",

    color:
      "var(--text)",

    textDecoration:
      "none",

    fontSize:
      14,

    fontWeight:
      700,

    whiteSpace:
      "nowrap",
  } as const;

  const dropdownLinkStyle = {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      10,

    width:
      "100%",

    padding:
      "11px 12px",

    borderRadius:
      10,

    color:
      "var(--text)",

    textDecoration:
      "none",

    fontSize:
      14,

    fontWeight:
      650,
  } as const;

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <header
      className="shell header"
      style={{
        position:
          "relative",
      
        zIndex:
          2000,
      
        isolation:
          "isolate",
      }}
    >
      <Link
        className="logo"
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
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            9,

          textDecoration:
            "none",

          flexShrink:
            0,
        }}
      >
        <Image
          src="/slottye-icon.png"
          alt=""
          width={34}
          height={34}
          priority
          aria-hidden="true"
          style={{
            width:
              34,

            height:
              34,

            objectFit:
              "contain",

            flexShrink:
              0,
          }}
        />

        <span
          style={{
            display:
              "inline-flex",

            alignItems:
              "baseline",

            color:
              "var(--accent)",
          }}
        >
          Slotty

          <span
            style={{
              color:
                "#62c985",
            }}
          >
            e
          </span>
        </span>
      </Link>

      <nav
        className="nav"
        aria-label="Navegación principal"
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            10,

          marginLeft:
            "auto",
        }}
      >
        {!loading &&
        loggedIn ? (
          businessUser &&
          onboardingPending ? (
            <>
              {!mobile && (
                <>
                  {displayName && (
                    <span
                      className="muted"
                      style={{
                        display:
                          "inline-flex",

                        alignItems:
                          "center",

                        fontWeight:
                          600,

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      Hola,{" "}
                      {displayName}
                    </span>
                  )}

                  <Link
                    href={
                      onboardingHref
                    }
                    style={{
                      ...quickLinkStyle,

                      background:
                        "#f0edff",

                      borderColor:
                        "#c4b5fd",

                      color:
                        "#5b43e6",
                    }}
                  >
                    ⚙️ Configuración inicial
                  </Link>

                  <button
                    type="button"
                    className="btn primary"
                    onClick={
                      handleLogout
                    }
                  >
                    Cerrar sesión
                  </button>
                </>
              )}

              {mobile && (
                <div
                  ref={
                    menuRef
                  }
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <button
                    type="button"
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
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      width:
                        44,

                      height:
                        44,

                      border:
                        "1px solid var(--border)",

                      borderRadius:
                        12,

                      background:
                        "#ffffff",

                      color:
                        "var(--text)",

                      cursor:
                        "pointer",

                      fontSize:
                        22,

                      lineHeight:
                        1,
                    }}
                  >
                    {menuOpen
                      ? "×"
                      : "☰"}
                  </button>

                  {menuOpen && (
                    <div
                      id="slottye-mobile-menu"
                      role="menu"
                      style={{
                        position:
                          "absolute",

                        top:
                          "calc(100% + 10px)",

                        right:
                          0,

                        zIndex:
                          2100,

                        width:
                          270,

                        padding:
                          10,

                        border:
                          "1px solid var(--border)",

                        borderRadius:
                          16,

                        background:
                          "#ffffff",

                        boxShadow:
                          "0 18px 45px rgba(15, 23, 42, 0.16)",
                      }}
                    >
                      {displayName && (
                        <div
                          style={{
                            padding:
                              "9px 12px 12px",

                            marginBottom:
                              6,

                            borderBottom:
                              "1px solid var(--border)",

                            color:
                              "var(--muted)",

                            fontSize:
                              13,

                            fontWeight:
                              600,
                          }}
                        >
                          Hola,{" "}
                          {displayName}
                        </div>
                      )}

                      <Link
                        href={
                          onboardingHref
                        }
                        role="menuitem"
                        style={{
                          ...dropdownLinkStyle,

                          background:
                            "#f0edff",

                          color:
                            "#5b43e6",
                        }}
                      >
                        <span>
                          ⚙️
                        </span>

                        Configuración inicial
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={
                          handleLogout
                        }
                        style={{
                          ...dropdownLinkStyle,

                          marginTop:
                            6,

                          border:
                            "none",

                          background:
                            "#fef2f2",

                          color:
                            "#b91c1c",

                          cursor:
                            "pointer",

                          font:
                            "inherit",

                          fontWeight:
                            700,
                        }}
                      >
                        <span>
                          ↪
                        </span>

                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {!mobile && (
                <>
                  {displayName && (
                    <span
                      className="muted"
                      style={{
                        display:
                          "inline-flex",

                        alignItems:
                          "center",

                        fontWeight:
                          600,

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      Hola,{" "}
                      {displayName}
                    </span>
                  )}

                  <Link
                    href={
                      primaryActionHref
                    }
                    style={{
                      ...quickLinkStyle,

                      background:
                        pathname ===
                        primaryActionHref
                          ? "#f0edff"
                          : "#ffffff",

                      borderColor:
                        pathname ===
                        primaryActionHref
                          ? "#c4b5fd"
                          : "var(--border)",

                      color:
                        pathname ===
                        primaryActionHref
                          ? "#5b43e6"
                          : "var(--text)",
                    }}
                  >
                    {businessUser
                      ? "📅 Agenda"
                      : "📅 Mis citas"}
                  </Link>

                  {businessUser && (
                    <Link
                      href="/account/bookings"
                      style={{
                        ...quickLinkStyle,

                        background:
                          pathname ===
                          "/account/bookings"
                            ? "#f0edff"
                            : "#ffffff",

                        borderColor:
                          pathname ===
                          "/account/bookings"
                            ? "#c4b5fd"
                            : "var(--border)",

                        color:
                          pathname ===
                          "/account/bookings"
                            ? "#5b43e6"
                            : "var(--text)",
                      }}
                    >
                      📋 Mis citas
                    </Link>
                  )}

                  {businessUser && (
                    <div
                      ref={
                        managementMenuRef
                      }
                      style={{
                        position:
                          "relative",
                      }}
                    >
                      <button
                        type="button"
                        className="btn secondary"
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
                        style={{
                          display:
                            "inline-flex",

                          alignItems:
                            "center",

                          gap:
                            7,
                        }}
                      >
                        Gestión

                        <span
                          aria-hidden="true"
                          style={{
                            fontSize:
                              11,

                            transform:
                              managementOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",

                            transition:
                              "transform 0.15s ease",
                          }}
                        >
                          ▼
                        </span>
                      </button>

                      {managementOpen && (
                        <div
                          role="menu"
                          style={{
                            position:
                              "absolute",

                            zIndex:
                              2100,

                            top:
                              "calc(100% + 10px)",

                            right:
                              0,

                            width:
                              270,

                            padding:
                              10,

                            border:
                              "1px solid var(--border)",

                            borderRadius:
                              16,

                            background:
                              "#ffffff",

                            boxShadow:
                              "0 18px 45px rgba(15, 23, 42, 0.16)",
                          }}
                        >
                          {businessManagementLinks.map(
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
                                style={{
                                  ...dropdownLinkStyle,

                                  background:
                                    pathname ===
                                    item.href
                                      ? "#f0edff"
                                      : "transparent",

                                  color:
                                    pathname ===
                                    item.href
                                      ? "#5b43e6"
                                      : "var(--text)",
                                }}
                              >
                                <span>
                                  {item.icon}
                                </span>

                                {item.label}
                              </Link>
                            )
                          )}

                          {businessSlug && (
                            <>
                              <div
                                style={{
                                  height:
                                    1,

                                  margin:
                                    "8px 4px",

                                  background:
                                    "var(--border)",
                                }}
                              />

                              <Link
                                href={`/business/${businessSlug}`}
                                role="menuitem"
                                style={{
                                  ...dropdownLinkStyle,

                                  background:
                                    "#f0edff",

                                  color:
                                    "#5b43e6",
                                }}
                              >
                                <span>
                                  🌐
                                </span>

                                Ver ficha pública
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <Link
                    className="btn secondary"
                    href={
                      panelHref
                    }
                  >
                    {businessUser
                      ? "Panel negocio"
                      : "Mi panel"}
                  </Link>

                  {adminUser && (
                    <Link
                      href="/admin"
                      className="btn secondary"
                    >
                      🛡 Administración
                    </Link>
                  )}

                  <button
                    type="button"
                    className="btn primary"
                    onClick={
                      handleLogout
                    }
                  >
                    Cerrar sesión
                  </button>
                </>
              )}

              {mobile && (
                <div
                  ref={
                    menuRef
                  }
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <button
                    type="button"
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
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      width:
                        44,

                      height:
                        44,

                      border:
                        "1px solid var(--border)",

                      borderRadius:
                        12,

                      background:
                        "#ffffff",

                      color:
                        "var(--text)",

                      cursor:
                        "pointer",

                      fontSize:
                        22,

                      lineHeight:
                        1,
                    }}
                  >
                    {menuOpen
                      ? "×"
                      : "☰"}
                  </button>

                  {menuOpen && (
                    <div
                      id="slottye-mobile-menu"
                      role="menu"
                      style={{
                        position:
                          "absolute",

                        top:
                          "calc(100% + 10px)",

                        right:
                          0,

                        zIndex:
                          2100,

                        width:
                          270,

                        padding:
                          10,

                        border:
                          "1px solid var(--border)",

                        borderRadius:
                          16,

                        background:
                          "#ffffff",

                        boxShadow:
                          "0 18px 45px rgba(15, 23, 42, 0.16)",
                      }}
                    >
                      {displayName && (
                        <div
                          style={{
                            padding:
                              "9px 12px 12px",

                            marginBottom:
                              6,

                            borderBottom:
                              "1px solid var(--border)",

                            color:
                              "var(--muted)",

                            fontSize:
                              13,

                            fontWeight:
                              600,
                          }}
                        >
                          Hola,{" "}
                          {displayName}
                        </div>
                      )}

                      <Link
                        href={
                          primaryActionHref
                        }
                        role="menuitem"
                        style={{
                          ...dropdownLinkStyle,

                          background:
                            pathname ===
                            primaryActionHref
                              ? "#f0edff"
                              : "transparent",

                          color:
                            pathname ===
                            primaryActionHref
                              ? "#5b43e6"
                              : "var(--text)",
                        }}
                      >
                        <span>
                          📅
                        </span>

                        {primaryActionText}
                      </Link>

                      {businessUser && (
                        <Link
                          href="/account/bookings"
                          role="menuitem"
                          style={{
                            ...dropdownLinkStyle,

                            background:
                              pathname ===
                              "/account/bookings"
                                ? "#f0edff"
                                : "transparent",

                            color:
                              pathname ===
                              "/account/bookings"
                                ? "#5b43e6"
                                : "var(--text)",
                          }}
                        >
                          <span>
                            📋
                          </span>

                          Mis citas
                        </Link>
                      )}

                      {businessUser && (
                        <>
                          <div
                            style={{
                              padding:
                                "12px 12px 6px",

                              color:
                                "var(--muted)",

                              fontSize:
                                11,

                              fontWeight:
                                800,

                              letterSpacing:
                                "0.06em",

                              textTransform:
                                "uppercase",
                            }}
                          >
                            Gestión
                          </div>

                          {businessManagementLinks.map(
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
                                style={{
                                  ...dropdownLinkStyle,

                                  background:
                                    pathname ===
                                    item.href
                                      ? "#f0edff"
                                      : "transparent",

                                  color:
                                    pathname ===
                                    item.href
                                      ? "#5b43e6"
                                      : "var(--text)",
                                }}
                              >
                                <span>
                                  {item.icon}
                                </span>

                                {item.label}
                              </Link>
                            )
                          )}

                          {businessSlug && (
                            <Link
                              href={`/business/${businessSlug}`}
                              role="menuitem"
                              style={{
                                ...dropdownLinkStyle,

                                color:
                                  "#5b43e6",
                              }}
                            >
                              <span>
                                🌐
                              </span>

                              Ver ficha pública
                            </Link>
                          )}

                          <div
                            style={{
                              height:
                                1,

                              margin:
                                "8px 4px",

                              background:
                                "var(--border)",
                            }}
                          />
                        </>
                      )}

                      <Link
                        href={
                          panelHref
                        }
                        role="menuitem"
                        style={
                          dropdownLinkStyle
                        }
                      >
                        <span>
                          {businessUser
                            ? "🏢"
                            : "👤"}
                        </span>

                        {businessUser
                          ? "Panel negocio"
                          : "Mi panel"}
                      </Link>

                      {adminUser && (
                        <Link
                          href="/admin"
                          role="menuitem"
                          style={
                            dropdownLinkStyle
                          }
                        >
                          <span>
                            🛡
                          </span>

                          Administración
                        </Link>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={
                          handleLogout
                        }
                        style={{
                          ...dropdownLinkStyle,

                          marginTop:
                            6,

                          border:
                            "none",

                          background:
                            "#fef2f2",

                          color:
                            "#b91c1c",

                          cursor:
                            "pointer",

                          font:
                            "inherit",

                          fontWeight:
                            700,
                        }}
                      >
                        <span>
                          ↪
                        </span>

                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )
        ) : !loading ? (
          <>
            {!mobile && (
              <>
                <Link
                  className="btn secondary"
                  href="/login?mode=signup&role=business"
                >
                  Para negocios
                </Link>

                <Link
                  className="btn primary"
                  href="/login"
                >
                  Entrar
                </Link>
              </>
            )}

            {mobile && (
              <div
                ref={
                  menuRef
                }
                style={{
                  position:
                    "relative",
                }}
              >
                <button
                  type="button"
                  aria-label={
                    menuOpen
                      ? "Cerrar menú"
                      : "Abrir menú"
                  }
                  aria-expanded={
                    menuOpen
                  }
                  onClick={() =>
                    setMenuOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  style={{
                    display:
                      "inline-flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    width:
                      44,

                    height:
                      44,

                    border:
                      "1px solid var(--border)",

                    borderRadius:
                      12,

                    background:
                      "#ffffff",

                    cursor:
                      "pointer",

                    fontSize:
                      22,
                  }}
                >
                  {menuOpen
                    ? "×"
                    : "☰"}
                </button>

                {menuOpen && (
                  <div
                    style={{
                      position:
                        "absolute",

                      top:
                        "calc(100% + 10px)",

                      right:
                        0,

                      width:
                        240,

                      padding:
                        10,

                      border:
                        "1px solid var(--border)",

                      borderRadius:
                        16,

                      background:
                        "#ffffff",

                      boxShadow:
                        "0 18px 45px rgba(15, 23, 42, 0.16)",
                    }}
                  >
                    <Link
                      href="/login?mode=signup&role=business"
                      style={
                        dropdownLinkStyle
                      }
                    >
                      🏢 Para negocios
                    </Link>

                    <Link
                      href="/login"
                      style={{
                        ...dropdownLinkStyle,

                        marginTop:
                          6,

                        background:
                          "var(--accent)",

                        color:
                          "#ffffff",
                      }}
                    >
                      Entrar
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </nav>
    </header>
  );
}