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
  
  /*
   * ============================================================
   * CARGAR SEMANA DE AGENDA
   * ============================================================
   */
  
  export async function GET(
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
       * PARÁMETROS
       * ==========================================================
       */
  
      const businessId =
        request.nextUrl.searchParams.get(
          "businessId"
        );
  
        const startValue =
        request.nextUrl.searchParams.get(
          "start"
        );
      
      const endValue =
        request.nextUrl.searchParams.get(
          "end"
        );
      
      if (
        !businessId ||
        !startValue ||
        !endValue
      ) {
        return NextResponse.json(
          {
            error:
              "Faltan datos para cargar la agenda.",
          },
          {
            status:
              400,
          }
        );
      }
      
      const weekStart =
        new Date(
          startValue
        );
      
      const weekEnd =
        new Date(
          endValue
        );
      
      if (
        Number.isNaN(
          weekStart.getTime()
        ) ||
        Number.isNaN(
          weekEnd.getTime()
        ) ||
        weekEnd.getTime() <=
          weekStart.getTime()
      ) {
        return NextResponse.json(
          {
            error:
              "El rango de fechas no es válido.",
          },
          {
            status:
              400,
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
            is_admin,
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
          "Error checking agenda week user:",
          profileError
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido comprobar los permisos.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !profile
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
  
      const isAdmin =
        profile.is_admin ===
        true;
  
      if (
        profile.is_blocked &&
        !isAdmin
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
       * NEGOCIO
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
          "Error checking agenda week business:",
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
  
      /*
       * El propietario puede leer su propia agenda.
       * Super Admin puede leer cualquier agenda.
       */
  
      if (
        !isAdmin &&
        business.owner_id !==
          user.id
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permisos para consultar esta agenda.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ==========================================================
       * SLOTS DE LA SEMANA
       * ==========================================================
       */
  
      const {
        data:
          slots,
        error:
          slotsError,
      } =
        await admin
          .from(
            "slots"
          )
          .select(`
            id,
            service_id,
            start_at,
            end_at,
            status
          `)
          .eq(
            "business_id",
            business.id
          )
          .lt(
            "start_at",
            weekEnd.toISOString()
          )
          .gt(
            "end_at",
            weekStart.toISOString()
          )
          .order(
            "start_at"
          );
  
      if (
        slotsError
      ) {
        console.error(
          "Error loading agenda week slots:",
          slotsError
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido cargar las disponibilidades.",
          },
          {
            status:
              500,
          }
        );
      }
  
      const slotIds =
        (
          slots ??
          []
        ).map(
          (
            slot
          ) =>
            slot.id
        );
  
      /*
       * ==========================================================
       * RESERVAS ONLINE
       * ==========================================================
       */
  
      let bookings:
        unknown[] =
        [];
  
      if (
        slotIds.length >
        0
      ) {
        const {
          data,
          error,
        } =
          await admin
            .from(
              "bookings"
            )
            .select(`
              id,
              slot_id,
              user_id,
              service_id,
              status,
              cancelled_at,
  
              profiles (
                id,
                name,
                email
              ),
  
              services (
                id,
                name,
                duration_minutes
              ),
  
              slots (
                id,
                start_at,
                end_at,
                status
              )
            `)
            .eq(
              "business_id",
              business.id
            )
            .in(
              "slot_id",
              slotIds
            );
  
        if (
          error
        ) {
          console.error(
            "Error loading agenda week bookings:",
            error
          );
  
          return NextResponse.json(
            {
              error:
                "No se han podido cargar las reservas.",
            },
            {
              status:
                500,
            }
          );
        }
  
        bookings =
          (
            data ??
            []
          ).map(
            (
              booking
            ) => ({
              ...booking,
  
              profiles:
                Array.isArray(
                  booking.profiles
                )
                  ? booking
                      .profiles[0] ??
                    null
                  : booking.profiles,
  
              services:
                Array.isArray(
                  booking.services
                )
                  ? booking
                      .services[0] ??
                    null
                  : booking.services,
  
              slots:
                Array.isArray(
                  booking.slots
                )
                  ? booking
                      .slots[0] ??
                    null
                  : booking.slots,
            })
          );
      }
  
      /*
       * ==========================================================
       * BLOQUEOS + RESERVAS MANUALES
       * ==========================================================
       */
  
      const [
        blocksResult,
        manualResult,
      ] =
        await Promise.all([
          admin
            .from(
              "business_blocks"
            )
            .select(`
              id,
              start_at,
              end_at,
              reason
            `)
            .eq(
              "business_id",
              business.id
            )
            .lt(
              "start_at",
              weekEnd.toISOString()
            )
            .gt(
              "end_at",
              weekStart.toISOString()
            )
            .order(
              "start_at"
            ),
  
          admin
            .from(
              "manual_bookings"
            )
            .select(`
              id,
              business_id,
              service_id,
              customer_name,
              customer_phone,
              customer_email,
              start_at,
              end_at,
              notes,
              created_at,
              updated_at,
  
              services (
                id,
                name,
                duration_minutes
              )
            `)
            .eq(
              "business_id",
              business.id
            )
            .lt(
              "start_at",
              weekEnd.toISOString()
            )
            .gt(
              "end_at",
              weekStart.toISOString()
            )
            .order(
              "start_at"
            ),
        ]);
  
      if (
        blocksResult.error
      ) {
        console.error(
          "Error loading agenda week blocks:",
          blocksResult.error
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido cargar los bloqueos.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        manualResult.error
      ) {
        console.error(
          "Error loading agenda week manual bookings:",
          manualResult.error
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido cargar las reservas manuales.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * ==========================================================
       * NORMALIZAR RESERVAS MANUALES
       * ==========================================================
       */
  
      const manualBookings =
        (
          manualResult.data ??
          []
        ).map(
          (
            booking
          ) => ({
            ...booking,
  
            services:
              Array.isArray(
                booking.services
              )
                ? booking
                    .services[0] ??
                  null
                : booking.services,
          })
        );
  
      /*
       * ==========================================================
       * RESPUESTA
       * ==========================================================
       */
  
      return NextResponse.json({
        slots:
          slots ??
          [],
  
        bookings,
  
        blocks:
          blocksResult.data ??
          [],
  
        manualBookings,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected agenda week error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al cargar la agenda.",
        },
        {
          status:
            500,
        }
      );
    }
  }