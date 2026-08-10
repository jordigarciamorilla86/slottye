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
  
  export async function GET(
    request: NextRequest
  ) {
    try {
      const businessId =
        request.nextUrl.searchParams
          .get(
            "businessId"
          )
          ?.trim() ??
        "";
  
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
          "Error checking Google Calendar status business:",
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
              "No tienes permiso para consultar esta integración.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ============================================================
       * CONEXIÓN GOOGLE CALENDAR
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
            id,
            google_account_email,
            google_calendar_id,
            connected_at,
  
            watch_channel_id,
            watch_resource_id,
            watch_expires_at
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
          "Error loading Google Calendar connection:",
          connectionError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar Google Calendar.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * ============================================================
       * ESTADO DE SINCRONIZACIÓN AUTOMÁTICA
       * ============================================================
       */
  
      let automaticSyncActive =
        false;
  
      if (
        connection
          ?.watch_channel_id &&
        connection
          .watch_resource_id &&
        connection
          .watch_expires_at
      ) {
        const expiresAt =
          new Date(
            connection
              .watch_expires_at
          ).getTime();
  
        automaticSyncActive =
          Number.isFinite(
            expiresAt
          ) &&
          expiresAt >
            Date.now();
      }
  
      return NextResponse.json({
        connected:
          Boolean(
            connection
          ),
  
        calendarEmail:
          connection
            ?.google_account_email ??
          null,
  
        calendarId:
          connection
            ?.google_calendar_id ??
          null,
  
        connectedAt:
          connection
            ?.connected_at ??
          null,
  
        automaticSyncActive,
  
        watchExpiresAt:
          connection
            ?.watch_expires_at ??
          null,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected Google Calendar status error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error comprobando Google Calendar.",
        },
        {
          status:
            500,
        }
      );
    }
  }