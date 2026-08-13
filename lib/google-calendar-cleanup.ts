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
  } catch {
    /*
     * No bloqueamos la limpieza si Google ya ha
     * invalidado o revocado las credenciales.
     *
     * Tampoco registramos aquí el error completo para evitar
     * que detalles sensibles de OAuth terminen en logs.
     */

    console.error(
      "Could not obtain Google access token during cleanup."
    );
  }

  /*
   * ============================================================
   * DETENER WATCH
   * ============================================================
   *
   * Best effort.
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
          }
        );
      }
    } catch {
      console.error(
        "Could not stop Google Calendar watch during cleanup."
      );
    }
  }

  /*
   * ============================================================
   * REVOCAR AUTORIZACIÓN GOOGLE
   * ============================================================
   *
   * También es best effort.
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
          }
        );
      }
    } catch {
      console.error(
        "Could not revoke Google OAuth token during cleanup."
      );
    }
  }

  /*
   * ============================================================
   * ELIMINAR CONEXIÓN LOCAL
   * ============================================================
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