"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  CircleCheck,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui";

type Props = {
  businessId: string;
};

type ConnectionStatus = {
  connected: boolean;
  calendarEmail?: string | null;

  automaticSyncActive?: boolean;

  watchExpiresAt?:
    string | null;
};

type SyncResult = {
  success?: boolean;

  imported?: number;
  updated?: number;
  deleted?: number;
  unchanged?: number;

  ignoredSlottye?: number;
  importedAllDay?: number;

  conflicts?: number;

  totalGoogleEvents?: number;

  syncMode?:
    | "full"
    | "incremental";

  skippedBecauseLocked?:
    boolean;

  error?: string;
};

type WatchResult = {
  success?: boolean;

  alreadyActive?: boolean;

  expiresAt?:
    string | null;

  error?: string;
};


function GoogleCalendarLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 23,
        height: 23,
        display: "block",
        transform: "translate(-50%, -50%)",
      }}
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="3"
        fill="#fff"
        stroke="#DADCE0"
      />
      <path
        fill="#4285F4"
        d="M3 8h18v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8Z"
      />
      <path
        fill="#34A853"
        d="M3 8h5v13H6a3 3 0 0 1-3-3V8Z"
      />
      <path
        fill="#FBBC04"
        d="M8 8h13v5H8V8Z"
      />
      <path
        fill="#EA4335"
        d="M16 8h5v5h-5V8Z"
      />
      <rect
        x="6"
        y="2.5"
        width="2"
        height="4"
        rx="1"
        fill="#5F6368"
      />
      <rect
        x="16"
        y="2.5"
        width="2"
        height="4"
        rx="1"
        fill="#5F6368"
      />
      <text
        x="12"
        y="17.1"
        textAnchor="middle"
        fontSize="7.4"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        31
      </text>
    </svg>
  );
}

export default function GoogleCalendarIntegration({
  businessId,
}: Props) {
  const router = useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    syncLoading,
    setSyncLoading,
  ] =
    useState(false);

  const [
    watchLoading,
    setWatchLoading,
  ] =
    useState(false);

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
    watchExpiresAt,
    setWatchExpiresAt,
  ] =
    useState<
      string | null
    >(null);

  const [
    calendarEmail,
    setCalendarEmail,
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

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  /*
   * ============================================================
   * CARGAR ESTADO
   * ============================================================
   */

  const loadStatus =
    useCallback(
      async () => {
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

        setCalendarEmail(
          data.calendarEmail ??
            null
        );

        setAutomaticSyncActive(
          Boolean(
            data.automaticSyncActive
          )
        );

        setWatchExpiresAt(
          data.watchExpiresAt ??
            null
        );

        return data;
      },
      [
        businessId,
      ]
    );

  /*
   * ============================================================
   * COMPROBAR ESTADO INICIAL
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

        setError(
          null
        );

        const data =
          await loadStatus();

        if (
          cancelled
        ) {
          return;
        }

        /*
         * ========================================================
         * AUTOACTIVAR WATCH
         * ========================================================
         *
         * Si Google ya está conectado pero todavía
         * no existe un watch activo, intentamos activarlo.
         */

        if (
          data.connected &&
          !data.automaticSyncActive
        ) {
          try {
            const response =
              await fetch(
                "/api/google-calendar/watch",
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

            const watchResult =
              (
                await response.json()
              ) as WatchResult;

            if (
              !response.ok
            ) {
              console.error(
                "Google Calendar automatic watch activation:",
                watchResult
              );

              return;
            }

            if (
              cancelled
            ) {
              return;
            }

            setAutomaticSyncActive(
              true
            );

            setWatchExpiresAt(
              watchResult.expiresAt ??
                null
            );
          } catch (
            watchError
          ) {
            console.error(
              "Google Calendar automatic watch activation:",
              watchError
            );
          }
        }
      } catch (
        statusError
      ) {
        console.error(
          "Google Calendar status:",
          statusError
        );

        if (
          !cancelled
        ) {
          setError(
            "No se ha podido comprobar el estado de Google Calendar."
          );
        }
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
    loadStatus,
  ]);

  /*
   * ============================================================
   * CONECTAR
   * ============================================================
   */

  function connect() {
    router.push(
      `/api/google-calendar/connect?businessId=${encodeURIComponent(
        businessId
      )}`
    );
  }

  /*
   * ============================================================
   * ACTIVAR SINCRONIZACIÓN AUTOMÁTICA
   * ============================================================
   */

  async function activateAutomaticSync() {
    try {
      setWatchLoading(
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
          "/api/google-calendar/watch",
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
        ) as WatchResult;

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "No se ha podido activar la sincronización automática."
        );
      }

      setAutomaticSyncActive(
        true
      );

      setWatchExpiresAt(
        result.expiresAt ??
          null
      );

      if (
        result.alreadyActive
      ) {
        setMessage(
          "La sincronización automática ya estaba activa."
        );
      } else {
        setMessage(
          "Sincronización automática activada."
        );
      }
    } catch (
      watchError
    ) {
      console.error(
        "Google Calendar watch:",
        watchError
      );

      setError(
        watchError instanceof
          Error
          ? watchError.message
          : "No se ha podido activar la sincronización automática."
      );
    } finally {
      setWatchLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * SINCRONIZAR MANUALMENTE
   * ============================================================
   */

  async function syncNow() {
    try {
      setSyncLoading(
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

      const parts:
        string[] =
        [];

      if (
        result.imported
      ) {
        parts.push(
          `${result.imported} nuevos`
        );
      }

      if (
        result.updated
      ) {
        parts.push(
          `${result.updated} actualizados`
        );
      }

      if (
        result.deleted
      ) {
        parts.push(
          `${result.deleted} eliminados`
        );
      }

      if (
        result.conflicts
      ) {
        parts.push(
          `${result.conflicts} con conflicto`
        );
      }

      if (
        parts.length ===
        0
      ) {
        setMessage(
          "Google Calendar ya está sincronizado."
        );
      } else {
        setMessage(
          `Sincronización completada: ${parts.join(
            ", "
          )}.`
        );
      }
    } catch (
      syncError
    ) {
      console.error(
        "Google Calendar sync:",
        syncError
      );

      setError(
        syncError instanceof
          Error
          ? syncError.message
          : "No se ha podido sincronizar Google Calendar."
      );
    } finally {
      setSyncLoading(
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
    try {
      setLoading(
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

      setWatchExpiresAt(
        null
      );

      setCalendarEmail(
        null
      );
    } catch (
      disconnectError
    ) {
      console.error(
        "Google Calendar disconnect:",
        disconnectError
      );

      setError(
        "No se ha podido desconectar Google Calendar."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  if (loading) {
    return (
      <div className="gcal10">
        <div className="gcal10-head">
          <span className="gcal10-icon">
            <RefreshCw size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <strong>Google Calendar</strong>
            <span>Comprobando conexión...</span>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="gcal10">
      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Desconectar Google Calendar"
        description="Los eventos de Google dejarán de sincronizarse y de bloquear disponibilidad en Slottye."
        variant="warning"
        confirmLabel="Desconectar"
        onConfirm={async () => {
          setConfirmDisconnect(false);
          await disconnect();
        }}
      />
      <div className="gcal10-head">
        <div className="gcal10-brand">
          <span className={connected ? "gcal10-icon is-connected" : "gcal10-icon"}>
            {connected ? (
              <GoogleCalendarLogo />
            ) : (
              <Unplug size={19} strokeWidth={2} aria-hidden="true" />
            )}
          </span>

          <div>
            <strong>Google Calendar</strong>
            <span>Agenda y sincronización</span>
          </div>
        </div>

        <span className={connected ? "gcal10-status is-connected" : "gcal10-status"}>
          {connected ? "Conectado" : "No conectado"}
        </span>
      </div>

      {connected ? (
        <>
          <div className="gcal10-connected">
            <div className="gcal10-info">
              <strong>
                {automaticSyncActive
                  ? "Sincronización automática activa"
                  : "Sincronización manual"}
              </strong>
              <span>
                {calendarEmail ? `${calendarEmail} · ` : ""}
                Los eventos externos bloquean disponibilidad en Slottye.
                {automaticSyncActive && watchExpiresAt
                  ? ` Renovación programada antes del ${new Date(
                      watchExpiresAt
                    ).toLocaleDateString("es-ES")}.`
                  : ""}
              </span>
            </div>

            {automaticSyncActive && (
              <span className="gcal10-auto">
                <CircleCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                Automática
              </span>
            )}
          </div>

          {!automaticSyncActive && (
            <button
              type="button"
              className="btn gcal10-activate"
              onClick={activateAutomaticSync}
              disabled={watchLoading}
            >
              {watchLoading
                ? "Activando..."
                : "Activar sincronización automática"}
            </button>
          )}

          <div className="gcal10-actions">
            <button
              type="button"
              className="btn primary"
              onClick={syncNow}
              disabled={syncLoading || watchLoading}
            >
              <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
              {syncLoading ? "Sincronizando..." : "Sincronizar ahora"}
            </button>

            <button
              type="button"
              className="btn gcal10-disconnect"
              onClick={() => setConfirmDisconnect(true)}
              disabled={syncLoading || watchLoading}
            >
              Desconectar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="gcal10-copy">
            Conecta tu calendario para reflejar eventos externos como bloqueos y
            mantener coordinada la disponibilidad.
          </p>
          <button type="button" className="btn primary gcal10-connect" onClick={connect}>
            Conectar Google Calendar
          </button>
        </>
      )}

      {message && <div className="gcal10-message is-success">{message}</div>}
      {error && <div className="gcal10-message is-error">{error}</div>}

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .gcal10 { min-width: 0; height: 100%; display: flex; flex-direction: column; }

  .gcal10-head, .gcal10-brand, .gcal10-actions {
    display: flex;
    align-items: center;
  }

  .gcal10-head {
    justify-content: space-between;
    gap: 10px;
  }

  .gcal10-brand {
    gap: 9px;
    min-width: 0;
  }

  .gcal10-icon {
    position: relative;
  
    width: 38px;
    height: 38px;
    min-width: 38px;
    min-height: 38px;
    flex: 0 0 38px;
  
    display: block;
  
    padding: 0;
    overflow: hidden;
  
    border: 1px solid #e8e5ef;
    border-radius: 11px;
    background: #f8f6ff;
  }
  
  .gcal10-icon.is-connected {
    background: #f8f6ff;
    border-color: #e8e5ef;
  }
  

  .gcal10-brand strong, .gcal10-brand span,
  .gcal10-head > div > strong, .gcal10-head > div > span {
    display: block;
  }

  .gcal10-brand strong, .gcal10-head > div > strong {
    font-size: 15px;
  }

  .gcal10-brand span, .gcal10-head > div > span {
    margin-top: 1px;
    color: var(--muted);
    font-size: 13px;
  }

  .gcal10-status, .gcal10-auto {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
    padding: 4px 7px;
    border-radius: 999px;
    background: #f1eff5;
    color: #716d78;
    font-size: 12px;
    font-weight: 800;
  }

  .gcal10-status.is-connected, .gcal10-auto {
    background: #e9f8ee;
    color: #237549;
  }

  .gcal10-connected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    padding: 10px;
    border: 1px solid #ebe8f0;
    border-radius: 10px;
    background: #fff;
  }

  .gcal10-info { min-width: 0; }
  .gcal10-info strong, .gcal10-info span { display: block; }
  .gcal10-info strong { font-size: 14px; }
  .gcal10-info span {
    margin-top: 2px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.35;
  }

  .gcal10-copy {
    margin: 11px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }

  .gcal10-actions {
    gap: 7px;
    margin-top: auto;
    padding-top: 9px;
    flex-wrap: wrap;
  }

  .gcal10-actions .btn, .gcal10-connect, .gcal10-activate {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 40px;
    padding: 8px 11px;
    font-size: 13px;
  }

  .gcal10-connect, .gcal10-activate { margin-top: 10px; }
  .gcal10-disconnect { color: #b42318; }

  .gcal10-message {
    margin-top: 9px;
    padding: 7px 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
  }

  .gcal10-message.is-success { background: #edf9f1; color: #237549; }
  .gcal10-message.is-error { background: #fff0f0; color: #b42318; }

  @media (max-width: 560px) {
    .gcal10-connected {
      align-items: flex-start;
      flex-direction: column;
    }

    .gcal10-actions .btn {
      flex: 1 1 140px;
    }

    .gcal10-connect, .gcal10-activate {
      width: 100%;
    }
  }
`;
