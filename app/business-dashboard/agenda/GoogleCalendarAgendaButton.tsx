"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  businessId: string;
};

type ConnectionStatus = {
  connected: boolean;

  calendarEmail?:
    string | null;

  automaticSyncActive?:
    boolean;

  watchExpiresAt?:
    string | null;
};

type SyncResult = {
  success?: boolean;

  imported?: number;
  updated?: number;
  deleted?: number;
  conflicts?: number;

  skippedBecauseLocked?:
    boolean;

  error?: string;
};

function GoogleCalendarIcon() {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{
          display:
            "block",
  
          flexShrink:
            0,
        }}
      >
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="2.5"
          fill="#ffffff"
        />
  
        <path
          d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5V9H3V6.5A2.5 2.5 0 0 1 5.5 4Z"
          fill="#4285F4"
        />
  
        <path
          d="M3 9h5v12H5.5A2.5 2.5 0 0 1 3 18.5V9Z"
          fill="#34A853"
        />
  
        <path
          d="M8 9h13v9.5a2.5 2.5 0 0 1-2.5 2.5H8V9Z"
          fill="#FBBC04"
        />
  
        <path
          d="M8 9h8v8H8V9Z"
          fill="#4285F4"
        />
  
        <path
          d="M16 9h5v9.5a2.5 2.5 0 0 1-2.5 2.5H16V9Z"
          fill="#EA4335"
        />
  
        <text
          x="12"
          y="15.4"
          textAnchor="middle"
          fontSize="7.2"
          fontWeight="800"
          fill="#ffffff"
          fontFamily="Arial, sans-serif"
        >
          31
        </text>
      </svg>
    );
  }

export default function GoogleCalendarAgendaButton({
  businessId,
}: Props) {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    connected,
    setConnected,
  ] =
    useState(false);

  const [
    automaticSyncActive,
    setAutomaticSyncActive,
  ] =
    useState(false);

  const [
    calendarEmail,
    setCalendarEmail,
  ] =
    useState<
      string | null
    >(null);

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    syncing,
    setSyncing,
  ] =
    useState(false);

  const [
    disconnecting,
    setDisconnecting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const containerRef =
    useRef<
      HTMLDivElement | null
    >(null);

  /*
   * ============================================================
   * CARGAR ESTADO
   * ============================================================
   */

  async function loadStatus() {
    const response =
      await fetch(
        `/api/google-calendar/status?businessId=${encodeURIComponent(
          businessId
        )}`,
        {
          method:
            "GET",

          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        "No se ha podido comprobar Google Calendar."
      );
    }

    const data =
      (
        await response.json()
      ) as ConnectionStatus;

    setConnected(
      Boolean(
        data.connected
      )
    );

    setAutomaticSyncActive(
      Boolean(
        data.automaticSyncActive
      )
    );

    setCalendarEmail(
      data.calendarEmail ??
        null
    );

    return data;
  }

  /*
   * ============================================================
   * ESTADO INICIAL
   * ============================================================
   */

  useEffect(() => {
    let cancelled =
      false;

    async function run() {
      try {
        setLoading(
          true
        );

        const data =
          await fetch(
            `/api/google-calendar/status?businessId=${encodeURIComponent(
              businessId
            )}`,
            {
              method:
                "GET",

              cache:
                "no-store",
            }
          );

        if (
          !data.ok
        ) {
          return;
        }

        const result =
          (
            await data.json()
          ) as ConnectionStatus;

        if (
          cancelled
        ) {
          return;
        }

        setConnected(
          Boolean(
            result.connected
          )
        );

        setAutomaticSyncActive(
          Boolean(
            result.automaticSyncActive
          )
        );

        setCalendarEmail(
          result.calendarEmail ??
            null
        );
      } catch (
        statusError
      ) {
        console.error(
          "Agenda Google Calendar status:",
          statusError
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    run();

    return () => {
      cancelled =
        true;
    };
  }, [
    businessId,
  ]);

  /*
   * ============================================================
   * CERRAR AL HACER CLICK FUERA
   * ============================================================
   */

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        !containerRef.current
      ) {
        return;
      }

      if (
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
    };
  }, []);

  /*
   * ============================================================
   * CONECTAR
   * ============================================================
   */

  function connect() {
    window.location.href =
  `/api/google-calendar/connect?businessId=${encodeURIComponent(
    businessId
  )}&returnTo=${encodeURIComponent(
    "/business-dashboard/agenda"
  )}`;
  }

  /*
   * ============================================================
   * SINCRONIZAR AHORA
   * ============================================================
   */

  async function syncNow() {
    try {
      setSyncing(
        true
      );

      setError(
        null
      );

      setMessage(
        null
      );

      const response =
        await fetch(
          "/api/google-calendar/sync",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,
              }),
          }
        );

      const result =
        (
          await response.json()
        ) as SyncResult;

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "No se ha podido sincronizar Google Calendar."
        );
      }

      if (
        result.skippedBecauseLocked
      ) {
        setMessage(
          "La sincronización ya se está ejecutando."
        );

        return;
      }

      const changes =
        (
          result.imported ??
          0
        ) +
        (
          result.updated ??
          0
        ) +
        (
          result.deleted ??
          0
        );

      if (
        changes ===
        0
      ) {
        setMessage(
          "Google Calendar ya está sincronizado."
        );
      } else {
        setMessage(
          `Sincronización completada: ${changes} cambio${
            changes ===
            1
              ? ""
              : "s"
          }.`
        );
      }

      await loadStatus();
    } catch (
      syncError
    ) {
      console.error(
        "Agenda Google Calendar sync:",
        syncError
      );

      setError(
        syncError instanceof
          Error
          ? syncError.message
          : "No se ha podido sincronizar Google Calendar."
      );
    } finally {
      setSyncing(
        false
      );
    }
  }

  /*
   * ============================================================
   * DESCONECTAR
   * ============================================================
   */

  async function disconnect() {
    const confirmed =
      window.confirm(
        "¿Desconectar Google Calendar de Slottye?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setDisconnecting(
        true
      );

      setError(
        null
      );

      setMessage(
        null
      );

      const response =
        await fetch(
          "/api/google-calendar/disconnect",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,
              }),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "No se ha podido desconectar Google Calendar."
        );
      }

      setConnected(
        false
      );

      setAutomaticSyncActive(
        false
      );

      setCalendarEmail(
        null
      );

      setOpen(
        false
      );
    } catch (
      disconnectError
    ) {
      console.error(
        "Agenda Google Calendar disconnect:",
        disconnectError
      );

      setError(
        disconnectError instanceof
          Error
          ? disconnectError.message
          : "No se ha podido desconectar Google Calendar."
      );
    } finally {
      setDisconnecting(
        false
      );
    }
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  if (
    loading
  ) {
    return (
      <div
        style={{
          minWidth:
            160,

          height:
            40,

          border:
            "1px solid var(--border)",

          borderRadius:
            10,

          background:
            "#ffffff",

          opacity:
            0.65,
        }}
      />
    );
  }

  /*
   * ============================================================
   * NO CONECTADO
   * ============================================================
   */

  if (
    !connected
  ) {
    return (
      <>
        <button
          type="button"
          className="btn google-agenda-button"
          onClick={
            connect
          }
          aria-label="Conectar Google Calendar"
          title="Conectar Google Calendar"
        >
          <GoogleCalendarIcon />
  
          <span className="google-agenda-desktop">
            Conectar Google Calendar
          </span>
        </button>
  
        <style jsx>{`
          .google-agenda-button {
            min-height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            white-space: nowrap;
            padding: 8px 12px;
          }
  
          .google-agenda-desktop {
            font-size: 13px;
            font-weight: 800;
          }
  
          @media (max-width: 700px) {
            .google-agenda-button {
              width: 42px;
              height: 42px;
              min-height: 42px;
              padding: 0;
              border-radius: 11px;
            }
  
            .google-agenda-desktop {
              display: none;
            }
          }
        `}</style>
      </>
    );
  }

  /*
   * ============================================================
   * CONECTADO
   * ============================================================
   */

  return (
    <div
      ref={
        containerRef
      }
      style={{
        position:
          "relative",
      }}
    >
      <button
  type="button"
  className="btn google-agenda-button"
  onClick={() =>
    setOpen(
      (
        value
      ) =>
        !value
    )
  }
  aria-expanded={
    open
  }
  aria-label="Google Calendar"
  title="Google Calendar"
>
  <GoogleCalendarIcon />

  <span className="google-agenda-desktop google-agenda-label">
    Google Calendar
  </span>

  <span className="google-agenda-desktop google-agenda-status">
    {automaticSyncActive
      ? "✓ Conectado"
      : "Conectado"}
  </span>

  <span
    className="google-agenda-arrow"
    aria-hidden="true"
  >
    {open
      ? "▲"
      : "▼"}
  </span>

  <style jsx>{`
    .google-agenda-button {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      white-space: nowrap;
      padding: 8px 12px;
      background: #ffffff;
    }

    .google-agenda-label {
      font-size: 13px;
      font-weight: 800;
    }

    .google-agenda-status {
      display: inline-flex;
      align-items: center;
      padding: 3px 7px;
      border-radius: 999px;
      background: ${automaticSyncActive
        ? "#dcfce7"
        : "#fef3c7"};
      color: ${automaticSyncActive
        ? "#166534"
        : "#92400e"};
      font-size: 11px;
      font-weight: 800;
    }

    .google-agenda-arrow {
      margin-left: 2px;
      font-size: 10px;
      color: #64748b;
    }

    @media (max-width: 700px) {
      .google-agenda-button {
        width: 44px;
        height: 42px;
        min-height: 42px;
        padding: 0;
        gap: 0;
        border-radius: 11px;
      }

      .google-agenda-desktop,
      .google-agenda-arrow {
        display: none;
      }
    }
  `}</style>
</button>

      {open && (
        <div
          style={{
            position:
              "absolute",

            top:
              "calc(100% + 8px)",

            right:
              0,

            zIndex:
             2000,

            width:
              300,

            padding:
              14,

            border:
              "1px solid var(--border)",

            borderRadius:
              14,

            background:
              "#ffffff",

            boxShadow:
              "0 14px 38px rgba(15, 23, 42, 0.14)",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                8,

              marginBottom:
                5,

              fontSize:
                13,

              fontWeight:
                800,

              color:
                automaticSyncActive
                  ? "#166534"
                  : "#92400e",
            }}
          >
            <span>
              {automaticSyncActive
                ? "●"
                : "○"}
            </span>

            <span>
              {automaticSyncActive
                ? "Sincronización automática activa"
                : "Google Calendar conectado"}
            </span>
          </div>

          {calendarEmail && (
            <div
              className="muted"
              style={{
                fontSize:
                  12,

                overflow:
                  "hidden",

                textOverflow:
                  "ellipsis",

                whiteSpace:
                  "nowrap",

                marginBottom:
                  12,
              }}
            >
              {calendarEmail}
            </div>
          )}

          <div
            style={{
              height:
                1,

              background:
                "var(--border)",

              margin:
                "10px 0",
            }}
          />

          <button
            type="button"
            onClick={
              syncNow
            }
            disabled={
              syncing ||
              disconnecting
            }
            style={{
              width:
                "100%",

              padding:
                "9px 8px",

              border:
                0,

              borderRadius:
                8,

              background:
                "transparent",

              textAlign:
                "left",

              cursor:
                syncing
                  ? "default"
                  : "pointer",

              fontSize:
                13,

              fontWeight:
                700,
            }}
          >
            🔄{" "}
            {syncing
              ? "Sincronizando..."
              : "Sincronizar ahora"}
          </button>

          <a
            href="https://calendar.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:
                "block",

              padding:
                "9px 8px",

              borderRadius:
                8,

              color:
                "inherit",

              textDecoration:
                "none",

              fontSize:
                13,

              fontWeight:
                700,
            }}
          >
            ↗ Abrir Google Calendar
          </a>

          <button
            type="button"
            onClick={
              disconnect
            }
            disabled={
              syncing ||
              disconnecting
            }
            style={{
              width:
                "100%",

              padding:
                "9px 8px",

              border:
                0,

              borderRadius:
                8,

              background:
                "transparent",

              color:
                "#b91c1c",

              textAlign:
                "left",

              cursor:
                disconnecting
                  ? "default"
                  : "pointer",

              fontSize:
                13,

              fontWeight:
                700,
            }}
          >
            {disconnecting
              ? "Desconectando..."
              : "Desconectar Google Calendar"}
          </button>

          {message && (
            <div
              style={{
                marginTop:
                  10,

                padding:
                  "8px 10px",

                borderRadius:
                  8,

                background:
                  "#f0fdf4",

                color:
                  "#166534",

                fontSize:
                  12,

                lineHeight:
                  1.4,
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop:
                  10,

                padding:
                  "8px 10px",

                borderRadius:
                  8,

                background:
                  "#fef2f2",

                color:
                  "#b91c1c",

                fontSize:
                  12,

                lineHeight:
                  1.4,
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}