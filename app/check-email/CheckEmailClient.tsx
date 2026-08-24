"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string | null;
  role: string | null;
};

type MessageType =
  | "success"
  | "error"
  | null;

const RESEND_COOLDOWN_SECONDS =
  60;

export default function CheckEmailClient({
  email,
  role,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    cooldown,
    setCooldown,
  ] =
    useState(0);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      null
    );

  useEffect(() => {
    if (
      cooldown <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setCooldown(
            (current) =>
              Math.max(
                current - 1,
                0
              )
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    cooldown,
  ]);

  function translateResendError(
    value: string
  ) {
    const text =
      value.toLowerCase();

    if (
      text.includes(
        "email rate limit"
      ) ||
      text.includes(
        "rate limit"
      ) ||
      text.includes(
        "too many requests"
      )
    ) {
      return "Has solicitado demasiados correos. Espera unos minutos antes de volver a intentarlo.";
    }

    if (
      text.includes(
        "invalid email"
      )
    ) {
      return "La dirección de correo electrónico no es válida.";
    }

    return "No se ha podido volver a enviar el correo de confirmación. Espera unos minutos.";
  }

  async function resendEmail() {
    if (
      !email ||
      sending ||
      cooldown > 0
    ) {
      return;
    }

    setSending(
      true
    );

    setMessage(
      ""
    );

    setMessageType(
      null
    );

    const destination =
      role ===
      "business"
        ? "/business-dashboard/create"
        : "/account";

    const emailRedirectTo =
      `${window.location.origin}/auth/callback` +
      `?role=${
        role ===
        "business"
          ? "business"
          : "customer"
      }` +
      `&next=${encodeURIComponent(
        destination
      )}`;

    const {
      error,
    } =
      await supabase.auth.resend({
        type:
          "signup",

        email,

        options: {
          emailRedirectTo,
        },
      });

    if (
      error
    ) {
      setMessage(
        translateResendError(
          error.message
        )
      );

      setMessageType(
        "error"
      );

      setSending(
        false
      );

      return;
    }

    setMessage(
      "Te hemos enviado un nuevo correo de confirmación."
    );

    setMessageType(
      "success"
    );

    setCooldown(
      RESEND_COOLDOWN_SECONDS
    );

    setSending(
      false
    );
  }

  return (
    <section
      className="auth-card auth-check-email"
      style={{
        textAlign:
          "center",
      }}
    >
      <div
        className="auth-email-icon"
        style={{
          fontSize:
            48,

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
        Te hemos enviado un enlace para confirmar tu cuenta.
      </p>

      {email && (
        <div
          className="auth-email-address"
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

      <div
        className="auth-notice"
        style={{
          marginTop:
            18,

          padding:
            "14px 16px",

          borderRadius:
            14,

          background:
            "#fffbeb",

          border:
            "1px solid #fde68a",

          color:
            "#92400e",

          lineHeight:
            1.55,

          textAlign:
            "left",
        }}
      >
        <strong>
          ¿No encuentras el correo?
        </strong>

        <div
          className={`auth-alert ${messageType === "error" ? "auth-alert-error" : "auth-alert-success"}`}
          style={{
            marginTop:
              5,
          }}
        >
          Revisa también las carpetas de spam, correo no deseado y promociones.
        </div>
      </div>

      <p
        className="muted"
        style={{
          marginTop:
            18,
        }}
      >
        Abre el mensaje de Slottye y pulsa el enlace de confirmación.
      </p>

      {role ===
        "business" && (
        <p className="muted">
          Después de confirmar tu cuenta podrás crear la ficha de tu negocio e importarla desde Google Maps si quieres.
        </p>
      )}

      {message && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginTop:
              18,

            padding:
              "13px 15px",

            borderRadius:
              12,

            background:
              messageType ===
              "error"
                ? "#fef2f2"
                : "#f0fdf4",

            border:
              messageType ===
              "error"
                ? "1px solid #fecaca"
                : "1px solid #bbf7d0",

            color:
              messageType ===
              "error"
                ? "#b91c1c"
                : "#166534",

            fontWeight:
              700,

            lineHeight:
              1.5,
          }}
        >
          {messageType ===
          "error"
            ? "⚠️ "
            : "✓ "}

          {message}
        </div>
      )}

      <div
        className="auth-resend"
        style={{
          marginTop:
            22,

          paddingTop:
            20,

          borderTop:
            "1px solid var(--border)",
        }}
      >
        <p
          className="muted"
          style={{
            marginTop:
              0,

            marginBottom:
              12,
          }}
        >
          ¿No lo has recibido?
        </p>

        <button
          type="button"
          className="btn"
          onClick={
            resendEmail
          }
          disabled={
            !email ||
            sending ||
            cooldown >
              0
          }
          style={{
            opacity:
              !email ||
              sending ||
              cooldown >
                0
                ? 0.6
                : 1,

            cursor:
              !email ||
              sending ||
              cooldown >
                0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {sending
            ? "Enviando..."
            : cooldown >
                0
              ? `Volver a enviar en ${cooldown} s`
              : "Volver a enviar el correo"}
        </button>
      </div>

      <div
        className="auth-actions"
        style={{
          display:
            "flex",

          justifyContent:
            "center",

          gap:
            10,

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
  );
}
