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
       * PERFIL BUSINESS ACTIVO
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
       * PROPIEDAD DEL NEGOCIO
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
          "Error checking Google Calendar disconnect business:",
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
              "No tienes permiso para desconectar esta integración.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ============================================================
       * CARGAR CONEXIÓN
       * ============================================================
       *
       * Necesitamos conservar estos datos antes de borrar
       * la fila de Supabase.
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
          "Error loading Google Calendar connection for disconnect:",
          connectionError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido cargar la conexión de Google Calendar.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * Si ya estaba desconectado,
       * consideramos la operación correcta.
       */
  
      if (
        !connection
      ) {
        return NextResponse.json({
          success:
            true,
  
          alreadyDisconnected:
            true,
        });
      }
  
      /*
       * ============================================================
       * ACCESS TOKEN ACTUAL
       * ============================================================
       *
       * getBusinessGoogleCalendarAccess() renueva el access token
       * automáticamente si fuera necesario.
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
         * No bloqueamos la desconexión si Google ya ha revocado
         * o invalidado las credenciales.
         */
  
        console.error(
          "Could not obtain Google access token during disconnect:",
          accessError
        );
      }
  
      /*
       * ============================================================
       * DETENER WATCH EN GOOGLE
       * ============================================================
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
              "Google Calendar channels.stop failed:",
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
          /*
           * Seguimos desconectando localmente.
           *
           * Como eliminaremos el channelId de nuestra base de datos,
           * cualquier aviso posterior de un canal antiguo será
           * ignorado por nuestro webhook.
           */
  
          console.error(
            "Could not stop Google Calendar watch during disconnect:",
            stopError
          );
        }
      }
  
      /*
       * ============================================================
       * ELIMINAR CONEXIÓN DE SLOTTYE
       * ============================================================
       */
  
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
          "Error deleting Google Calendar connection:",
          deleteError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido desconectar Google Calendar.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * ============================================================
       * REVOCAR AUTORIZACIÓN GOOGLE
       * ============================================================
       *
       * Esto es best-effort:
       *
       * Slottye ya está desconectado aunque Google responda
       * con error al revocar el token.
       *
       * Preferimos refresh_token porque representa la autorización
       * persistente concedida a Slottye.
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
              "Google OAuth revoke failed:",
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
            "Could not revoke Google OAuth token:",
            revokeError
          );
        }
      }
  
      return NextResponse.json({
        success:
          true,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected Google Calendar disconnect error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error desconectando Google Calendar.",
        },
        {
          status:
            500,
        }
      );
    }
  }