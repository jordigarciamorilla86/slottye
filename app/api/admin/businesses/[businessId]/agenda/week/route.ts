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
  
  type Props = {
    params: Promise<{
      businessId: string;
    }>;
  };
  
  export async function GET(
    request: NextRequest,
    {
      params,
    }: Props
  ) {
    try {
      const {
        businessId,
      } =
        await params;
  
        const startValue =
        request.nextUrl.searchParams.get(
          "start"
        );
      
      const endValue =
        request.nextUrl.searchParams.get(
          "end"
        );
      
      if (
        !startValue ||
        !endValue
      ) {
        return NextResponse.json(
          {
            error:
              "Falta el rango de fechas de la semana.",
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
        !Number.isFinite(
          weekStart.getTime()
        ) ||
        !Number.isFinite(
          weekEnd.getTime()
        ) ||
        weekEnd <=
          weekStart
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
  
      const supabase =
        await createClient();
  
      const admin =
        createAdminClient();
  
      /*
       * ==========================================================
       * COMPROBAR SESIÓN
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
       * COMPROBAR ADMIN
       * ==========================================================
       */
  
      const {
        data:
          adminProfile,
        error:
          adminError,
      } =
        await admin
          .from(
            "profiles"
          )
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
        adminError
      ) {
        console.error(
          "Error checking admin agenda access:",
          adminError
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
        !adminProfile?.is_admin
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
            name
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
          "Error checking admin agenda business:",
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
       * ==========================================================
       * SLOTS
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
            businessId
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
          "Error loading admin agenda slots:",
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
              businessId
            )
            .in(
              "slot_id",
              slotIds
            );
  
        if (
          error
        ) {
          console.error(
            "Error loading admin agenda bookings:",
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
       * BLOQUEOS Y RESERVAS MANUALES
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
              businessId
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
              businessId
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
          "Error loading admin agenda blocks:",
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
          "Error loading admin manual bookings:",
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
        "Unexpected admin agenda week error:",
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