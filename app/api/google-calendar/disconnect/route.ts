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
       * ELIMINAR CONEXIÓN
       * ============================================================
       *
       * Importante:
       *
       * Por ahora NO revocamos el token en Google.
       * Eliminamos únicamente las credenciales guardadas
       * por Slottye.
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