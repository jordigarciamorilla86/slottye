import {
    NextResponse,
  } from "next/server";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    ensureGoogleCalendarWatch,
  } from "@/lib/google-calendar-watch";
  
  const RENEW_BEFORE_MS =
    48 * 60 * 60 * 1000;
  
  export async function GET(
    request: Request
  ) {
    try {
      /*
       * ============================================================
       * AUTORIZACIÓN VERCEL CRON
       * ============================================================
       */
  
      const authHeader =
        request.headers.get(
          "authorization"
        );
  
      if (
        !process.env
          .CRON_SECRET ||
        authHeader !==
          `Bearer ${process.env.CRON_SECRET}`
      ) {
        return NextResponse.json(
          {
            error:
              "No autorizado",
          },
          {
            status:
              401,
          }
        );
      }
  
      const admin =
        createAdminClient();
  
      /*
       * ============================================================
       * CONEXIONES A RENOVAR
       * ============================================================
       *
       * Renovamos con 48 h de margen para que un cron diario tenga
       * tiempo de sobra aunque una ejecución se retrase o falle.
       *
       * También incluimos conexiones que todavía no tienen watch.
       */
  
      const renewBefore =
        new Date(
          Date.now() +
            RENEW_BEFORE_MS
        );
  
      const {
        data:
          connections,
        error:
          connectionsError,
      } =
        await admin
          .from(
            "business_google_calendar_connections"
          )
          .select(`
            business_id,
            watch_channel_id,
            watch_resource_id,
            watch_expires_at
          `)
          .or(
            `watch_expires_at.is.null,watch_expires_at.lte.${renewBefore.toISOString()}`
          );
  
      if (
        connectionsError
      ) {
        console.error(
          "Google Calendar watch cron load error:",
          connectionsError
        );
  
        return NextResponse.json(
          {
            error:
              connectionsError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
      let renewed =
        0;
  
      let activated =
        0;
  
      let alreadyActive =
        0;
  
      let failed =
        0;
  
      for (
        const connection of
          connections ??
          []
      ) {
        try {
          const result =
            await ensureGoogleCalendarWatch(
              connection.business_id,
              {
                renewBeforeMs:
                  RENEW_BEFORE_MS,
              }
            );
  
          if (
            result.alreadyActive
          ) {
            alreadyActive++;
  
            continue;
          }
  
          if (
            result.renewed
          ) {
            renewed++;
          } else {
            activated++;
          }
        } catch (
          watchError
        ) {
          failed++;
  
          console.error(
            "Google Calendar watch cron renewal error:",
            {
              businessId:
                connection.business_id,
  
              error:
                watchError,
            }
          );
        }
      }
  
      return NextResponse.json({
        success:
          true,
  
        found:
          connections?.length ??
          0,
  
        renewed,
        activated,
        alreadyActive,
        failed,
      });
    } catch (
      error
    ) {
      console.error(
        "Google Calendar watch cron error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Error interno",
        },
        {
          status:
            500,
        }
      );
    }
  }