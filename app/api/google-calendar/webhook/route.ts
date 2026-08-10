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
        if (
          resourceState ===
          "sync"
        ) {
          return new NextResponse(
            null,
            {
              status:
                204,
            }
          );
        }
  
        /*
         * Para canales desconocidos devolvemos 204.
         * No queremos provocar reintentos inútiles.
         */
        return new NextResponse(
          null,
          {
            status:
              204,
          }
        );
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
            channelId,
            resourceId,
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
            channelId,
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
  
            channelId,
  
            messageNumber,
          }
        );
  
        return new NextResponse(
          null,
          {
            status:
              204,
          }
        );
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
  
          channelId,
  
          resourceState,
  
          messageNumber,
        }
      );
  
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
  
            channelId,
          }
        );
      }
  
      /*
       * Google solo necesita una respuesta 2xx.
       */
      return new NextResponse(
        null,
        {
          status:
            204,
        }
      );
    } catch (
      error
    ) {
      console.error(
        "Unexpected Google Calendar webhook error:",
        error
      );
  
      /*
       * Un 500 permite que Google pueda reintentar.
       */
      return new NextResponse(
        null,
        {
          status:
            500,
        }
      );
    }
  }