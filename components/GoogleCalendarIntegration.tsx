"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

export default function GoogleCalendarIntegration({
  businessId,
}: Props) {
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
    window.location.href =
      `/api/google-calendar/connect?businessId=${encodeURIComponent(
        businessId
      )}`;
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

  if (
    loading
  ) {
    return (
      <div className="panel">
        <div className="kicker">
          Google Calendar
        </div>

        <p
          className="muted"
          style={{
            marginTop:
              8,

            marginBottom:
              0,
          }}
        >
          Comprobando conexión...
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="kicker">
        Google Calendar
      </div>

      <h3
        style={{
          marginTop:
            8,

          marginBottom:
            6,
        }}
      >
        📅 Sincronización
      </h3>

      {connected ? (
        <>
          <p
            style={{
              marginTop:
                0,

              marginBottom:
                6,

              fontWeight:
                700,
            }}
          >
            ✓ Google Calendar conectado
          </p>

          {calendarEmail && (
            <p
              className="muted"
              style={{
                marginTop:
                  0,

                marginBottom:
                  10,

                fontSize:
                  13,
              }}
            >
              {calendarEmail}
            </p>
          )}

          {automaticSyncActive ? (
            <div
              style={{
                marginTop:
                  12,

                marginBottom:
                  14,

                padding:
                  "10px 12px",

                borderRadius:
                  10,

                background:
                  "#f0fdf4",

                border:
                  "1px solid #bbf7d0",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,

                  fontWeight:
                    700,

                  color:
                    "#166534",
                }}
              >
                ✓ Sincronización automática activa
              </div>

              <div
                style={{
                  marginTop:
                    4,

                  fontSize:
                    12,

                  lineHeight:
                    1.45,

                  color:
                    "#166534",
                }}
              >
                Los cambios realizados
                en Google Calendar se
                sincronizarán
                automáticamente con
                Slottye.
              </div>

              {watchExpiresAt && (
                <div
                  style={{
                    marginTop:
                      4,

                    fontSize:
                      11,

                    opacity:
                      0.75,

                    color:
                      "#166534",
                  }}
                >
                  Canal activo
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                marginTop:
                  12,

                marginBottom:
                  14,
              }}
            >
              <p
                className="muted"
                style={{
                  marginTop:
                    0,

                  marginBottom:
                    10,

                  fontSize:
                    13,

                  lineHeight:
                    1.5,
                }}
              >
                La sincronización
                automática todavía no
                está activa.
              </p>

              <button
                type="button"
                className="btn primary"
                onClick={
                  activateAutomaticSync
                }
                disabled={
                  watchLoading
                }
              >
                {watchLoading
                  ? "Activando..."
                  : "Activar sincronización automática"}
              </button>
            </div>
          )}

          <p
            className="muted"
            style={{
              marginTop:
                0,

              marginBottom:
                14,

              fontSize:
                13,

              lineHeight:
                1.5,
            }}
          >
            Los eventos de Google
            Calendar se reflejan como
            bloqueos en la agenda de
            Slottye.
          </p>

          <div
            style={{
              display:
                "flex",

              gap:
                10,

              flexWrap:
                "wrap",
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={
                syncNow
              }
              disabled={
                syncLoading ||
                watchLoading
              }
            >
              {syncLoading
                ? "Sincronizando..."
                : "Sincronizar ahora"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={
                disconnect
              }
              disabled={
                syncLoading ||
                watchLoading
              }
            >
              Desconectar
            </button>
          </div>
        </>
      ) : (
        <>
          <p
            className="muted"
            style={{
              marginTop:
                0,

              marginBottom:
                14,

              lineHeight:
                1.5,
            }}
          >
            Conecta tu calendario
            para sincronizar las
            reservas, bloqueos y tu
            agenda con Google
            Calendar.
          </p>

          <button
            type="button"
            className="btn"
            onClick={
              connect
            }
          >
            Conectar Google Calendar
          </button>
        </>
      )}

      {message && (
        <p
          style={{
            marginTop:
              12,

            marginBottom:
              0,

            fontSize:
              13,

            color:
              "#166534",
          }}
        >
          {message}
        </p>
      )}

      {error && (
        <p
          style={{
            marginTop:
              12,

            marginBottom:
              0,

            fontSize:
              13,

            color:
              "#b91c1c",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}