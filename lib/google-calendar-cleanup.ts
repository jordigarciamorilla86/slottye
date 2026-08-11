import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    getBusinessGoogleCalendarAccess,
  } from "@/lib/google-calendar";
  
  type AdminClient =
    ReturnType<
      typeof createAdminClient
    >;
  
  type CleanupOptions = {
    admin: AdminClient;
    businessId: string;
  
    /*
     * true:
     * elimina también la conexión local de Slottye.
     *
     * false:
     * Google queda desconectado externamente,
     * pero dejamos que otro proceso elimine la fila.
     *
     * En account/delete usamos false porque el CASCADE
     * eliminará la conexión dentro de la transacción.
     */
    deleteLocalConnection?: boolean;
  };
  
  type CleanupResult =
    | {
        success: true;
        alreadyDisconnected?: boolean;
      }
    | {
        success: false;
        error: string;
      };
  
  export async function cleanupBusinessGoogleCalendar({
    admin,
    businessId,
    deleteLocalConnection = true,
  }: CleanupOptions): Promise<CleanupResult> {
    /*
     * ============================================================
     * CARGAR CONEXIÓN
     * ============================================================
     */
  
    const {
      data:
        connection,
      error:
        connectionError,
    } =
      await admin
        .from(
          "business_google_calendar_connections"
        )
        .select(`
          business_id,
          refresh_token,
          access_token,
          watch_channel_id,
          watch_resource_id
        `)
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();
  
    if (
      connectionError
    ) {
      console.error(
        "Error loading Google Calendar connection for cleanup:",
        connectionError
      );
  
      return {
        success:
          false,
  
        error:
          "No se ha podido cargar la conexión de Google Calendar.",
      };
    }
  
    /*
     * No existe integración.
     * No hay nada que limpiar.
     */
  
    if (
      !connection
    ) {
      return {
        success:
          true,
  
        alreadyDisconnected:
          true,
      };
    }
  
    /*
     * ============================================================
     * ACCESS TOKEN ACTUAL
     * ============================================================
     *
     * Esta función renueva automáticamente el access token
     * mediante refresh_token si fuera necesario.
     */
  
    let currentAccessToken:
      string | null =
      null;
  
    try {
      const googleAccess =
        await getBusinessGoogleCalendarAccess(
          businessId
        );
  
      currentAccessToken =
        googleAccess
          ?.accessToken ??
        null;
    } catch (
      accessError
    ) {
      /*
       * No bloqueamos la limpieza si Google ya ha
       * invalidado o revocado las credenciales.
       */
  
      console.error(
        "Could not obtain Google access token during cleanup:",
        accessError
      );
    }
  
    /*
     * ============================================================
     * DETENER WATCH
     * ============================================================
     *
     * Best effort.
     *
     * No impedimos una desconexión o eliminación de cuenta
     * porque Google no permita detener un watch antiguo.
     */
  
    if (
      currentAccessToken &&
      connection.watch_channel_id &&
      connection.watch_resource_id
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
                  `Bearer ${currentAccessToken}`,
  
                "Content-Type":
                  "application/json",
              },
  
              body:
                JSON.stringify({
                  id:
                    connection.watch_channel_id,
  
                  resourceId:
                    connection.watch_resource_id,
                }),
            }
          );
  
        if (
          !stopResponse.ok &&
          stopResponse.status !==
            404 &&
          stopResponse.status !==
            410
        ) {
          console.error(
            "Google Calendar channels.stop failed during cleanup:",
            {
              status:
                stopResponse.status,
  
              body:
                await stopResponse.text(),
            }
          );
        }
      } catch (
        stopError
      ) {
        console.error(
          "Could not stop Google Calendar watch during cleanup:",
          stopError
        );
      }
    }
  
    /*
     * ============================================================
     * REVOCAR AUTORIZACIÓN GOOGLE
     * ============================================================
     *
     * También es best effort.
     *
     * Preferimos refresh_token porque representa la
     * autorización persistente concedida a Slottye.
     */
  
    const tokenToRevoke =
      connection.refresh_token ||
      connection.access_token ||
      currentAccessToken;
  
    if (
      tokenToRevoke
    ) {
      try {
        const revokeResponse =
          await fetch(
            "https://oauth2.googleapis.com/revoke",
            {
              method:
                "POST",
  
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded",
              },
  
              body:
                new URLSearchParams({
                  token:
                    tokenToRevoke,
                }),
            }
          );
  
        if (
          !revokeResponse.ok
        ) {
          console.error(
            "Google OAuth revoke failed during cleanup:",
            {
              status:
                revokeResponse.status,
  
              body:
                await revokeResponse.text(),
            }
          );
        }
      } catch (
        revokeError
      ) {
        console.error(
          "Could not revoke Google OAuth token during cleanup:",
          revokeError
        );
      }
    }
  
    /*
     * ============================================================
     * ELIMINAR CONEXIÓN LOCAL
     * ============================================================
     *
     * En una desconexión normal: sí.
     *
     * Durante account/delete: no.
     * La conexión desaparecerá mediante ON DELETE CASCADE
     * dentro de delete_account_data_transactional.
     */
  
    if (
      deleteLocalConnection
    ) {
      const {
        error:
          deleteError,
      } =
        await admin
          .from(
            "business_google_calendar_connections"
          )
          .delete()
          .eq(
            "business_id",
            businessId
          );
  
      if (
        deleteError
      ) {
        console.error(
          "Error deleting Google Calendar connection during cleanup:",
          deleteError
        );
  
        return {
          success:
            false,
  
          error:
            "No se ha podido desconectar Google Calendar.",
        };
      }
    }
  
    return {
      success:
        true,
    };
  }