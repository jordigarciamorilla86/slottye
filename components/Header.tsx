"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  name: string | null;
  role: string | null;
};

export function Header() {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    loggedIn,
    setLoggedIn,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
    null
  );

  /*
   * ============================================================
   * CARGAR USUARIO + PERFIL
   * ============================================================
   */

  useEffect(() => {
    async function loadSession() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setLoggedIn(false);
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoggedIn(true);

      const {
        data: profileData,
        error,
      } =
        await supabase
          .from("profiles")
          .select(`
            name,
            role
          `)
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Error loading profile:",
          error
        );
      }

      setProfile(
        profileData ??
          null
      );

      setLoading(false);
    }

    loadSession();

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

          if (!user) {
            setLoggedIn(
              false
            );

            setProfile(
              null
            );

            return;
          }

          setLoggedIn(
            true
          );

          const {
            data:
              profileData,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(`
                name,
                role
              `)
              .eq(
                "id",
                user.id
              )
              .maybeSingle();

          setProfile(
            profileData ??
              null
          );
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  async function handleLogout() {
    await supabase.auth.signOut();

    setLoggedIn(false);
    setProfile(null);

    router.push("/");
    router.refresh();
  }

  /*
   * ============================================================
   * TEXTO DEL USUARIO
   * ============================================================
   */

  const displayName =
    profile?.name
      ?.trim() || null;

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <header className="shell header">
      <Link
        className="logo"
        href="/"
        aria-label="Slottye - Inicio"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          textDecoration:
            "none",
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
            width: 34,
            height: 34,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            color: "var(--accent)",
          }}
        >
          Slotty
          <span
            style={{
              color: "#62c985",
            }}
          >
            e
          </span>
        </span>
      </Link>

      <nav className="nav">
        {!loading &&
        loggedIn ? (
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
              className="btn secondary"
              href={
                profile?.role ===
                "business"
                  ? "/business-dashboard"
                  : "/account"
              }
            >
              {profile?.role ===
              "business"
                ? "Panel negocio"
                : "Mi panel"}
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
        ) : !loading ? (
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
        ) : null}
      </nav>
    </header>
  );
}