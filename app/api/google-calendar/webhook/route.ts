import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  syncGoogleCalendarToSlottye,
} from "@/lib/google-calendar-sync";

function noContent() {
  return new NextResponse(
    null,
    {
      status:
        204,
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin =
      createAdminClient();

    /*
     * ============================================================
     * HEADERS GOOGLE
     * ============================================================
     */

    const channelId =
      request.headers.get(
        "x-goog-channel-id"
      )?.trim() ?? "";

    const channelToken =
      request.headers.get(
        "x-goog-channel-token"
      )?.trim() ?? "";

    const resourceId =
      request.headers.get(
        "x-goog-resource-id"
      )?.trim() ?? "";

    const resourceState =
      request.headers.get(
        "x-goog-resource-state"
      )?.trim() ?? "";

    const messageNumber =
      request.headers.get(
        "x-goog-message-number"
      )?.trim() ?? "";

    if (
      !channelId ||
      !resourceId
    ) {
      return new NextResponse(
        null,
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * BUSCAR CANAL
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
          watch_channel_id,
          watch_resource_id,
          watch_channel_token,
          watch_expires_at
        `)
        .eq(
          "watch_channel_id",
          channelId
        )
        .maybeSingle();

    if (
      connectionError
    ) {
      console.error(
        "Google Calendar webhook channel lookup error:",
        connectionError
      );

      return new NextResponse(
        null,
        {
          status:
            500,
        }
      );
    }

    /*
     * Google puede enviar el primer "sync"
     * antes de que hayamos guardado el canal.
     */

    if (
      !connection
    ) {
      return noContent();
    }

    /*
     * ============================================================
     * VALIDAR EXPIRACIÓN DEL WATCH
     * ============================================================
     */

    if (
      connection.watch_expires_at
    ) {
      const expiresAt =
        new Date(
          connection.watch_expires_at
        );

      if (
        Number.isFinite(
          expiresAt.getTime()
        ) &&
        expiresAt <=
          new Date()
      ) {
        return noContent();
      }
    }

    /*
     * ============================================================
     * VALIDAR RESOURCE ID
     * ============================================================
     */

    if (
      connection.watch_resource_id &&
      connection.watch_resource_id !==
        resourceId
    ) {
      console.warn(
        "Google Calendar webhook resource mismatch:",
        {
          businessId:
            connection.business_id,
        }
      );

      return new NextResponse(
        null,
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * VALIDAR CHANNEL TOKEN
     * ============================================================
     */

    if (
      !connection.watch_channel_token ||
      connection.watch_channel_token !==
        channelToken
    ) {
      console.warn(
        "Google Calendar webhook token mismatch:",
        {
          businessId:
            connection.business_id,
        }
      );

      return new NextResponse(
        null,
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * VALIDAR ESTADO DEL RECURSO
     * ============================================================
     *
     * Para Calendar watch, los estados relevantes son:
     * - sync
     * - exists
     * - not_exists
     *
     * Si Google enviara otro valor, no iniciamos una sincronización.
     */

    if (
      resourceState !==
        "sync" &&
      resourceState !==
        "exists" &&
      resourceState !==
        "not_exists"
    ) {
      console.warn(
        "Google Calendar webhook received unknown resource state:",
        {
          businessId:
            connection.business_id,

          resourceState,
        }
      );

      return noContent();
    }

    /*
     * ============================================================
     * NOTIFICACIÓN INICIAL
     * ============================================================
     */

    if (
      resourceState ===
      "sync"
    ) {
      console.log(
        "Google Calendar watch active:",
        {
          businessId:
            connection.business_id,

          messageNumber:
            messageNumber ||
            null,
        }
      );

      return noContent();
    }

    /*
     * ============================================================
     * CAMBIO REAL → SINCRONIZACIÓN INCREMENTAL
     * ============================================================
     */

    console.log(
      "Google Calendar change notification received:",
      {
        businessId:
          connection.business_id,

        resourceState,

        messageNumber:
          messageNumber ||
          null,
      }
    );

    try {
      const result =
        await syncGoogleCalendarToSlottye(
          connection.business_id
        );

      if (
        result.skippedBecauseLocked
      ) {
        console.log(
          "Google Calendar sync skipped because another sync is running:",
          {
            businessId:
              connection.business_id,
          }
        );
      }
    } catch (
      syncError
    ) {
      console.error(
        "Google Calendar webhook sync failed:",
        {
          businessId:
            connection.business_id,

          error:
            syncError,
        }
      );

      /*
       * Devolvemos 500 para que Google pueda reintentar
       * si la sincronización ha fallado realmente.
       */
      return new NextResponse(
        null,
        {
          status:
            500,
        }
      );
    }

    return noContent();
  } catch (
    error
  ) {
    console.error(
      "Unexpected Google Calendar webhook error:",
      error
    );

    return new NextResponse(
      null,
      {
        status:
          500,
      }
    );
  }
}