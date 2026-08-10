import {
    randomBytes,
    randomUUID,
  } from "node:crypto";
  
  import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    getBusinessGoogleCalendarAccess,
  } from "@/lib/google-calendar";
  
  type RequestBody = {
    businessId?: unknown;
  };
  
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
  
  const WATCH_TTL_SECONDS =
    7 * 24 * 60 * 60;
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const supabase =
        await createClient();
  
      const admin =
        createAdminClient();
  
      /*
       * ============================================================
       * USUARIO
       * ============================================================
       */
  
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();
  
      if (
        !user
      ) {
        return NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              401,
          }
        );
      }
  
      /*
       * ============================================================
       * BODY
       * ============================================================
       */
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
      const businessId =
        typeof body.businessId ===
          "string"
          ? body.businessId.trim()
          : "";
  
      if (
        !businessId
      ) {
        return NextResponse.json(
          {
            error:
              "Falta el identificador del negocio.",
          },
          {
            status:
              400,
          }
        );
      }
  
      /*
       * ============================================================
       * PERFIL
       * ============================================================
       */
  
      const {
        data:
          profile,
        error:
          profileError,
      } =
        await admin
          .from(
            "profiles"
          )
          .select(`
            id,
            role,
            is_blocked
          `)
          .eq(
            "id",
            user.id
          )
          .maybeSingle();
  
      if (
        profileError ||
        !profile ||
        profile.role !==
          "business" ||
        profile.is_blocked
      ) {
        return NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ============================================================
       * NEGOCIO
       * ============================================================
       */
  
      const {
        data:
          business,
        error:
          businessError,
      } =
        await admin
          .from(
            "businesses"
          )
          .select(`
            id,
            owner_id
          `)
          .eq(
            "id",
            businessId
          )
          .eq(
            "owner_id",
            user.id
          )
          .maybeSingle();
  
      if (
        businessError
      ) {
        console.error(
          "Google Calendar watch business error:",
          businessError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar el negocio.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !business
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permisos para este negocio.",
          },
          {
            status:
              403,
          }
        );
      }
  
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
        return NextResponse.json(
          {
            error:
              "NEXT_PUBLIC_APP_URL no está configurada.",
          },
          {
            status:
              500,
          }
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
        return NextResponse.json(
          {
            error:
              "NEXT_PUBLIC_APP_URL no es una URL válida.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * Google Calendar exige HTTPS para
       * los webhooks de producción.
       */
  
      if (
        appUrl.protocol !==
        "https:"
      ) {
        return NextResponse.json(
          {
            error:
              "Google Calendar requiere una URL HTTPS pública.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const webhookUrl =
        `${configuredAppUrl}/api/google-calendar/webhook`;
  
      /*
       * ============================================================
       * CREDENCIALES GOOGLE
       * ============================================================
       */
  
      const googleAccess =
        await getBusinessGoogleCalendarAccess(
          business.id
        );
  
      if (
        !googleAccess
      ) {
        return NextResponse.json(
          {
            error:
              "Google Calendar no está conectado.",
          },
          {
            status:
              400,
          }
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
            business.id
          )
          .maybeSingle();
  
      if (
        currentConnectionError
      ) {
        throw currentConnectionError;
      }
  
      /*
       * Si ya tenemos un canal con más de una hora
       * de validez restante, no creamos otro.
       */
  
      if (
        currentConnection
          ?.watch_channel_id &&
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
              60 * 60 * 1000
        ) {
          return NextResponse.json({
            success:
              true,
  
            alreadyActive:
              true,
  
            expiresAt:
              currentConnection
                .watch_expires_at,
          });
        }
      }
  
      /*
       * ============================================================
       * NUEVO CANAL
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
  
      /*
       * ============================================================
       * EVENTS.WATCH
       * ============================================================
       */
  
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
  
        return NextResponse.json(
          {
            error:
              watchResult.error
                ?.message ??
              "No se ha podido activar la sincronización automática.",
          },
          {
            status:
              502,
          }
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
       * GUARDAR CANAL
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
            business.id
          );
  
      if (
        saveError
      ) {
        console.error(
          "Error saving Google Calendar watch:",
          saveError
        );
  
        /*
         * El canal ya existe en Google pero no hemos
         * podido guardar su relación.
         *
         * Intentamos detenerlo para no dejar un canal
         * huérfano.
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
  
        return NextResponse.json(
          {
            error:
              "No se ha podido guardar la sincronización automática.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * ============================================================
       * PARAR CANAL ANTERIOR
       * ============================================================
       *
       * Primero creamos y guardamos el nuevo.
       * Después intentamos retirar el anterior.
       */
  
      if (
        currentConnection
          ?.watch_channel_id &&
        currentConnection
          .watch_resource_id &&
        (
          currentConnection
            .watch_channel_id !==
            watchResult.id
        )
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
  
      return NextResponse.json({
        success:
          true,
  
        alreadyActive:
          false,
  
        expiresAt,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected Google Calendar watch error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "No se ha podido activar la sincronización automática.",
        },
        {
          status:
            500,
        }
      );
    }
  }