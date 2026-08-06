import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { createClient } from "@/lib/supabase/server";
  import { createAdminClient } from "@/lib/supabase/admin";
  
  type RouteContext = {
    params: Promise<{
      businessId: string;
    }>;
  };
  
  async function requireAdmin() {
    const supabase =
      await createClient();
  
    const admin =
      createAdminClient();
  
    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();
  
    if (!user) {
      return {
        error: NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              401,
          }
        ),
        admin: null,
      };
    }
  
    const {
      data:
        profile,
      error:
        profileError,
    } =
      await admin
        .from("profiles")
        .select(`
          id,
          is_admin
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();
  
    if (
      profileError ||
      !profile?.is_admin
    ) {
      return {
        error: NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              403,
          }
        ),
        admin: null,
      };
    }
  
    return {
      error: null,
      admin,
    };
  }
  
  /*
   * ============================================================
   * CREAR SERVICIO
   * ============================================================
   */
  
  export async function POST(
    request: NextRequest,
    {
      params,
    }: RouteContext
  ) {
    try {
      const {
        businessId,
      } =
        await params;
  
      const {
        error:
          authorizationError,
        admin,
      } =
        await requireAdmin();
  
      if (
        authorizationError ||
        !admin
      ) {
        return authorizationError;
      }
  
      const {
        name,
        description,
        durationMinutes,
      } =
        await request.json();
  
      const normalizedName =
        typeof name ===
        "string"
          ? name.trim()
          : "";
  
      const normalizedDescription =
        typeof description ===
        "string"
          ? description.trim()
          : "";
  
      const normalizedDuration =
        Number(
          durationMinutes
        );
  
      if (!normalizedName) {
        return NextResponse.json(
          {
            error:
              "El nombre del servicio es obligatorio.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !Number.isInteger(
          normalizedDuration
        ) ||
        normalizedDuration <=
          0 ||
        normalizedDuration >
          1440
      ) {
        return NextResponse.json(
          {
            error:
              "La duración del servicio no es válida.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const {
        data:
          business,
        error:
          businessError,
      } =
        await admin
          .from("businesses")
          .select("id")
          .eq(
            "id",
            businessId
          )
          .maybeSingle();
  
      if (
        businessError
      ) {
        console.error(
          "Error checking admin service business:",
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
  
      if (!business) {
        return NextResponse.json(
          {
            error:
              "El negocio no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      const {
        data:
          service,
        error:
          serviceError,
      } =
        await admin
          .from("services")
          .insert({
            business_id:
              businessId,
  
            name:
              normalizedName,
  
            description:
              normalizedDescription ||
              null,
  
            duration_minutes:
              normalizedDuration,
  
            active:
              true,
          })
          .select(`
            id,
            name,
            description,
            duration_minutes,
            active
          `)
          .single();
  
      if (
        serviceError ||
        !service
      ) {
        console.error(
          "Error creating admin service:",
          serviceError
        );
  
        return NextResponse.json(
          {
            error:
              serviceError?.message ??
              "No se ha podido crear el servicio.",
          },
          {
            status:
              500,
          }
        );
      }
  
      return NextResponse.json({
        service,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected admin service creation error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado.",
        },
        {
          status:
            500,
        }
      );
    }
  }
  
  /*
   * ============================================================
   * ACTIVAR O DESACTIVAR
   * ============================================================
   */
  
  export async function PATCH(
    request: NextRequest,
    {
      params,
    }: RouteContext
  ) {
    try {
      const {
        businessId,
      } =
        await params;
  
      const {
        error:
          authorizationError,
        admin,
      } =
        await requireAdmin();
  
      if (
        authorizationError ||
        !admin
      ) {
        return authorizationError;
      }
  
      const {
        serviceId,
        active,
      } =
        await request.json();
  
      if (
        typeof serviceId !==
          "string" ||
        typeof active !==
          "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "Datos incompletos.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const {
        data:
          service,
        error:
          serviceError,
      } =
        await admin
          .from("services")
          .update({
            active,
          })
          .eq(
            "id",
            serviceId
          )
          .eq(
            "business_id",
            businessId
          )
          .select(`
            id,
            name,
            description,
            duration_minutes,
            active
          `)
          .maybeSingle();
  
      if (
        serviceError
      ) {
        console.error(
          "Error changing admin service status:",
          serviceError
        );
  
        return NextResponse.json(
          {
            error:
              serviceError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
      if (!service) {
        return NextResponse.json(
          {
            error:
              "El servicio no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      return NextResponse.json({
        service,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected admin service update error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado.",
        },
        {
          status:
            500,
        }
      );
    }
  }