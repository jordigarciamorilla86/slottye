"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    setLoggedIn(false);

    router.push("/");
    router.refresh();
  }

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
          textDecoration: "none",
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />

          <path
            d="M7 3V7M17 3V7M3 10H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M8 15L11 18L16.5 12.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span>
          Slot<span>tye</span>
        </span>
      </Link>

      <nav className="nav">
        {!loading && loggedIn ? (
          <>
            <Link
              className="btn secondary"
              href="/account"
            >
              Mi panel
            </Link>

            <button
              type="button"
              className="btn primary"
              onClick={handleLogout}
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