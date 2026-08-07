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
    serviceId?: unknown;
    slots?: unknown;
  };
  
  type SubmittedSlot = {
    start_at: string;
    end_at: string;
  };
  
  type CreatedSlot = {
    id: string;
    service_id: string | null;
    start_at: string;
    end_at: string;
    status: string;
  };
  
  type RpcResult = {
    created?: CreatedSlot[];
    created_count?: number;
    existing_count?: number;
    blocked_count?: number;
    invalid_count?: number;
  };
  
  /*
   * ============================================================
   * CREAR DISPONIBILIDADES EN BLOQUE
   * ============================================================
   */
  
  export async function POST(
    request:
      NextRequest
  ) {
    try {
      const supabase =
        await createClient();
  
      const admin =
        createAdminClient();
  
      /*
       * ==========================================================
       * SESIÓN
       * ==========================================================
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
       * ==========================================================
       * PERFIL
       * ==========================================================
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
        profileError
      ) {
        console.error(
          "Error checking bulk calendar user:",
          profileError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar la cuenta.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !profile ||
        profile.role !==
          "business"
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
  
      if (
        profile.is_blocked
      ) {
        return NextResponse.json(
          {
            error:
              "Tu cuenta está bloqueada.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ==========================================================
       * DATOS
       * ==========================================================
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
  
      const serviceId =
        typeof body.serviceId ===
        "string"
          ? body.serviceId.trim()
          : "";
  
      if (
        !businessId ||
        !serviceId
      ) {
        return NextResponse.json(
          {
            error:
              "Faltan datos para crear las disponibilidades.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !Array.isArray(
          body.slots
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Los huecos enviados no son válidos.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        body.slots.length ===
        0
      ) {
        return NextResponse.json(
          {
            error:
              "No se ha recibido ninguna disponibilidad.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        body.slots.length >
        500
      ) {
        return NextResponse.json(
          {
            error:
              "No puedes crear más de 500 huecos en una sola operación.",
          },
          {
            status:
              400,
          }
        );
      }
  
      /*
       * ==========================================================
       * VALIDAR HUECOS
       * ==========================================================
       */
  
      const slots:
        SubmittedSlot[] =
        [];
  
      for (
        const item of
        body.slots
      ) {
        if (
          typeof item !==
            "object" ||
          item ===
            null
        ) {
          return NextResponse.json(
            {
              error:
                "Uno de los huecos enviados no es válido.",
            },
            {
              status:
                400,
            }
          );
        }
  
        const candidate =
          item as {
            start_at?: unknown;
            end_at?: unknown;
          };
  
        if (
          typeof candidate.start_at !==
            "string" ||
          typeof candidate.end_at !==
            "string"
        ) {
          return NextResponse.json(
            {
              error:
                "Uno de los huecos enviados no tiene fechas válidas.",
            },
            {
              status:
                400,
            }
          );
        }
  
        const start =
          new Date(
            candidate.start_at
          );
  
        const end =
          new Date(
            candidate.end_at
          );
  
        if (
          !Number.isFinite(
            start.getTime()
          ) ||
          !Number.isFinite(
            end.getTime()
          ) ||
          end <=
            start
        ) {
          return NextResponse.json(
            {
              error:
                "Uno de los huecos enviados tiene un horario no válido.",
            },
            {
              status:
                400,
            }
          );
        }
  
        slots.push({
          start_at:
            start.toISOString(),
  
          end_at:
            end.toISOString(),
        });
      }
  
      /*
       * ==========================================================
       * COMPROBAR NEGOCIO
       * ==========================================================
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
          .maybeSingle();
  
      if (
        businessError
      ) {
        console.error(
          "Error checking bulk calendar business:",
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
              "El negocio no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        business.owner_id !==
        user.id
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permisos para modificar este calendario.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ==========================================================
       * RPC TRANSACCIONAL
       * ==========================================================
       */
  
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "create_calendar_slots_bulk",
          {
            p_business_id:
              business.id,
  
            p_service_id:
              serviceId,
  
            p_slots:
              slots,
          }
        );
  
      if (
        error
      ) {
        console.error(
          "Bulk calendar slots RPC error:",
          error
        );
  
        const message =
          error.message
            .toLowerCase();
  
        if (
          message.includes(
            "service does not belong"
          ) ||
          message.includes(
            "service is inactive"
          )
        ) {
          return NextResponse.json(
            {
              error:
                "El servicio seleccionado no es válido.",
            },
            {
              status:
                400,
            }
          );
        }
  
        if (
          message.includes(
            "not authorized"
          )
        ) {
          return NextResponse.json(
            {
              error:
                "No tienes permisos para modificar este calendario.",
            },
            {
              status:
                403,
            }
          );
        }
  
        if (
          message.includes(
            "not authenticated"
          )
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
  
        return NextResponse.json(
          {
            error:
              error.message ||
              "No se han podido crear las disponibilidades.",
          },
          {
            status:
              400,
          }
        );
      }
  
      /*
       * ==========================================================
       * NORMALIZAR RESPUESTA RPC
       * ==========================================================
       */
  
      const result =
        (
          data ??
          {}
        ) as RpcResult;
  
      return NextResponse.json({
        success:
          true,
  
        slots:
          result.created ??
          [],
  
        createdCount:
          result.created_count ??
          0,
  
        existingCount:
          result.existing_count ??
          0,
  
        blockedCount:
          result.blocked_count ??
          0,
  
        invalidCount:
          result.invalid_count ??
          0,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected bulk calendar creation error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al crear las disponibilidades.",
        },
        {
          status:
            500,
          }
        );
    }
  }