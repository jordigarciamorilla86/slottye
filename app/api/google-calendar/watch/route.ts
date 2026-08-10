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
    ensureGoogleCalendarWatch,
  } from "@/lib/google-calendar-watch";
  
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
       * CREAR / MANTENER WATCH
       * ============================================================
       *
       * Desde el dashboard solo renovamos si queda menos de 1 hora.
       */
  
      const result =
        await ensureGoogleCalendarWatch(
          business.id,
          {
            renewBeforeMs:
              60 * 60 * 1000,
          }
        );
  
      return NextResponse.json(
        result
      );
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
            error instanceof
              Error
              ? error.message
              : "No se ha podido activar la sincronización automática.",
        },
        {
          status:
            500,
        }
      );
    }
  }