import {
    randomBytes,
    randomUUID,
  } from "node:crypto";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    getBusinessGoogleCalendarAccess,
  } from "@/lib/google-calendar";
  
  type GoogleWatchResponse = {
    kind?: string;
    id?: string;
    resourceId?: string;
    resourceUri?: string;
    token?: string;
    expiration?: string;
  
    error?: {
      message?: string;
    };
  };
  
  export type EnsureGoogleCalendarWatchOptions = {
    /*
     * Si al canal actual le queda más tiempo que este margen,
     * no se renueva.
     *
     * Dashboard: 1 hora.
     * Cron: 48 horas.
     */
    renewBeforeMs?: number;
  };
  
  export type EnsureGoogleCalendarWatchResult = {
    success: true;
    alreadyActive: boolean;
    renewed: boolean;
    expiresAt: string | null;
  };
  
  const WATCH_TTL_SECONDS =
    7 * 24 * 60 * 60;
  
  const DEFAULT_RENEW_BEFORE_MS =
    60 * 60 * 1000;
  
  export async function ensureGoogleCalendarWatch(
    businessId: string,
    options:
      EnsureGoogleCalendarWatchOptions =
      {}
  ): Promise<
    EnsureGoogleCalendarWatchResult
  > {
    const admin =
      createAdminClient();
  
    const renewBeforeMs =
      Math.max(
        0,
        options.renewBeforeMs ??
          DEFAULT_RENEW_BEFORE_MS
      );
  
    /*
     * ============================================================
     * URL PÚBLICA DE SLOTTYE
     * ============================================================
     */
  
    const configuredAppUrl =
      process.env
        .NEXT_PUBLIC_APP_URL
        ?.trim()
        .replace(
          /\/+$/,
          ""
        ) ??
      "";
  
    if (
      !configuredAppUrl
    ) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL no está configurada."
      );
    }
  
    let appUrl:
      URL;
  
    try {
      appUrl =
        new URL(
          configuredAppUrl
        );
    } catch {
      throw new Error(
        "NEXT_PUBLIC_APP_URL no es una URL válida."
      );
    }
  
    if (
      appUrl.protocol !==
      "https:"
    ) {
      throw new Error(
        "Google Calendar requiere una URL HTTPS pública."
      );
    }
  
    const webhookUrl =
      `${configuredAppUrl}/api/google-calendar/webhook`;
  
    /*
     * ============================================================
     * ACCESO GOOGLE
     * ============================================================
     */
  
    const googleAccess =
      await getBusinessGoogleCalendarAccess(
        businessId
      );
  
    if (
      !googleAccess
    ) {
      throw new Error(
        "Google Calendar no está conectado."
      );
    }
  
    const {
      accessToken,
      calendarId,
    } =
      googleAccess;
  
    /*
     * ============================================================
     * WATCH ACTUAL
     * ============================================================
     */
  
    const {
      data:
        currentConnection,
      error:
        currentConnectionError,
    } =
      await admin
        .from(
          "business_google_calendar_connections"
        )
        .select(`
          business_id,
          watch_channel_id,
          watch_resource_id,
          watch_channel_token,
          watch_expires_at
        `)
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();
  
    if (
      currentConnectionError
    ) {
      throw currentConnectionError;
    }
  
    if (
      !currentConnection
    ) {
      throw new Error(
        "Google Calendar no está conectado."
      );
    }
  
    /*
     * Si el canal todavía tiene suficiente margen,
     * no hacemos nada.
     */
  
    if (
      currentConnection
        .watch_channel_id &&
      currentConnection
        .watch_resource_id &&
      currentConnection
        .watch_expires_at
    ) {
      const expiresAt =
        new Date(
          currentConnection
            .watch_expires_at
        ).getTime();
  
      if (
        Number.isFinite(
          expiresAt
        ) &&
        expiresAt >
          Date.now() +
            renewBeforeMs
      ) {
        return {
          success:
            true,
  
          alreadyActive:
            true,
  
          renewed:
            false,
  
          expiresAt:
            currentConnection
              .watch_expires_at,
        };
      }
    }
  
    /*
     * ============================================================
     * CREAR NUEVO CANAL
     * ============================================================
     */
  
    const channelId =
      randomUUID();
  
    const channelToken =
      randomBytes(
        32
      ).toString(
        "hex"
      );
  
    const watchResponse =
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events/watch`,
        {
          method:
            "POST",
  
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
  
            "Content-Type":
              "application/json",
          },
  
          body:
            JSON.stringify({
              id:
                channelId,
  
              type:
                "web_hook",
  
              address:
                webhookUrl,
  
              token:
                channelToken,
  
              params: {
                ttl:
                  String(
                    WATCH_TTL_SECONDS
                  ),
              },
            }),
        }
      );
  
    const watchResult =
      (
        await watchResponse.json()
      ) as GoogleWatchResponse;
  
    if (
      !watchResponse.ok ||
      !watchResult.id ||
      !watchResult.resourceId
    ) {
      console.error(
        "Google Calendar events.watch error:",
        watchResult
      );
  
      throw new Error(
        watchResult.error
          ?.message ??
          "No se ha podido activar la sincronización automática."
      );
    }
  
    /*
     * ============================================================
     * EXPIRACIÓN
     * ============================================================
     */
  
    let expiresAt:
      string | null =
      null;
  
    if (
      watchResult.expiration
    ) {
      const expirationMs =
        Number(
          watchResult.expiration
        );
  
      if (
        Number.isFinite(
          expirationMs
        )
      ) {
        expiresAt =
          new Date(
            expirationMs
          ).toISOString();
      }
    }
  
    /*
     * ============================================================
     * GUARDAR NUEVO CANAL
     * ============================================================
     */
  
    const {
      error:
        saveError,
    } =
      await admin
        .from(
          "business_google_calendar_connections"
        )
        .update({
          watch_channel_id:
            watchResult.id,
  
          watch_resource_id:
            watchResult.resourceId,
  
          watch_channel_token:
            channelToken,
  
          watch_expires_at:
            expiresAt,
  
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "business_id",
          businessId
        );
  
    if (
      saveError
    ) {
      console.error(
        "Error saving Google Calendar watch:",
        saveError
      );
  
      /*
       * El canal nuevo existe en Google pero no se ha podido
       * persistir. Intentamos pararlo para no dejarlo huérfano.
       */
  
      try {
        await fetch(
          "https://www.googleapis.com/calendar/v3/channels/stop",
          {
            method:
              "POST",
  
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
  
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                id:
                  watchResult.id,
  
                resourceId:
                  watchResult.resourceId,
              }),
          }
        );
      } catch (
        stopError
      ) {
        console.error(
          "Could not stop orphan Google Calendar watch:",
          stopError
        );
      }
  
      throw saveError;
    }
  
    /*
     * ============================================================
     * PARAR CANAL ANTERIOR
     * ============================================================
     *
     * Primero guardamos el nuevo. Solo después retiramos el viejo.
     */
  
    if (
      currentConnection
        .watch_channel_id &&
      currentConnection
        .watch_resource_id &&
      currentConnection
        .watch_channel_id !==
        watchResult.id
    ) {
      try {
        const stopResponse =
          await fetch(
            "https://www.googleapis.com/calendar/v3/channels/stop",
            {
              method:
                "POST",
  
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
  
                "Content-Type":
                  "application/json",
              },
  
              body:
                JSON.stringify({
                  id:
                    currentConnection
                      .watch_channel_id,
  
                  resourceId:
                    currentConnection
                      .watch_resource_id,
                }),
            }
          );
  
        if (
          !stopResponse.ok &&
          stopResponse.status !==
            404
        ) {
          console.error(
            "Could not stop previous Google Calendar watch:",
            stopResponse.status
          );
        }
      } catch (
        stopError
      ) {
        console.error(
          "Could not stop previous Google Calendar watch:",
          stopError
        );
      }
    }
  
    return {
      success:
        true,
  
      alreadyActive:
        false,
  
      renewed:
        Boolean(
          currentConnection
            .watch_channel_id &&
          currentConnection
            .watch_resource_id
        ),
  
      expiresAt,
    };
  }