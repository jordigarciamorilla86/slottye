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
  
  type RouteContext = {
    params: Promise<{
      businessId: string;
    }>;
  };
  
  type SubmittedDay = {
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    open_time_2: string | null;
    close_time_2: string | null;
    closed: boolean;
  };
  
  const TIME_PATTERN =
    /^([01]\d|2[0-3]):[0-5]\d$/;
  
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
        admin: null,
  
        response:
          NextResponse.json(
            {
              error:
                "No autorizado.",
            },
            {
              status:
                401,
            }
          ),
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
        admin: null,
  
        response:
          NextResponse.json(
            {
              error:
                "No autorizado.",
            },
            {
              status:
                403,
            }
          ),
      };
    }
  
    return {
      admin,
      response:
        null,
    };
  }
  
  function validTime(
    value: string | null
  ) {
    return (
      typeof value ===
        "string" &&
      TIME_PATTERN.test(
        value
      )
    );
  }
  
  export async function PUT(
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
        admin,
        response:
          authorizationResponse,
      } =
        await requireAdmin();
  
      if (
        authorizationResponse ||
        !admin
      ) {
        return authorizationResponse;
      }
  
      const body =
        await request.json();
  
      const submittedDays =
        body.days as
          | SubmittedDay[]
          | undefined;
  
      if (
        !Array.isArray(
          submittedDays
        ) ||
        submittedDays.length !==
          7
      ) {
        return NextResponse.json(
          {
            error:
              "Debes enviar los siete días de la semana.",
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
  
      if (businessError) {
        console.error(
          "Error checking admin hours business:",
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
  
      const usedDays =
        new Set<number>();
  
      for (
        const day of
        submittedDays
      ) {
        if (
          !Number.isInteger(
            day.day_of_week
          ) ||
          day.day_of_week <
            0 ||
          day.day_of_week >
            6 ||
          usedDays.has(
            day.day_of_week
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Los días enviados no son válidos.",
            },
            {
              status:
                400,
            }
          );
        }
  
        usedDays.add(
          day.day_of_week
        );
  
        if (day.closed) {
          continue;
        }
  
        if (
          !validTime(
            day.open_time
          ) ||
          !validTime(
            day.close_time
          ) ||
          day.open_time! >=
            day.close_time!
        ) {
          return NextResponse.json(
            {
              error:
                `El primer tramo del día ${day.day_of_week + 1} no es válido.`,
            },
            {
              status:
                400,
            }
          );
        }
  
        const hasSecondShift =
          day.open_time_2 !==
            null ||
          day.close_time_2 !==
            null;
  
        if (
          hasSecondShift &&
          (
            !validTime(
              day.open_time_2
            ) ||
            !validTime(
              day.close_time_2
            ) ||
            day.open_time_2! >=
              day.close_time_2!
          )
        ) {
          return NextResponse.json(
            {
              error:
                `El segundo tramo del día ${day.day_of_week + 1} no es válido.`,
            },
            {
              status:
                400,
            }
          );
        }
  
        if (
          hasSecondShift &&
          day.open_time_2! <
            day.close_time!
        ) {
          return NextResponse.json(
            {
              error:
                `Los tramos del día ${day.day_of_week + 1} se solapan.`,
            },
            {
              status:
                400,
            }
          );
        }
      }
  
      const rows =
        submittedDays
          .sort(
            (
              first,
              second
            ) =>
              first.day_of_week -
              second.day_of_week
          )
          .map(
            (
              day
            ) => ({
              business_id:
                businessId,
  
              day_of_week:
                day.day_of_week,
  
              open_time:
                day.closed
                  ? null
                  : day.open_time,
  
              close_time:
                day.closed
                  ? null
                  : day.close_time,
  
              open_time_2:
                day.closed
                  ? null
                  : day.open_time_2,
  
              close_time_2:
                day.closed
                  ? null
                  : day.close_time_2,
  
              closed:
                day.closed,
            })
          );
  
      /*
       * Se usa upsert para evitar borrar primero
       * todo el horario y dejar el negocio sin datos
       * si después fallase la inserción.
       *
       * Debe existir una restricción única sobre:
       * business_id + day_of_week
       */
  
      const {
        data:
          savedHours,
        error:
          saveError,
      } =
        await admin
          .from(
            "business_hours"
          )
          .upsert(
            rows,
            {
              onConflict:
                "business_id,day_of_week",
            }
          )
          .select(`
            id,
            day_of_week,
            open_time,
            close_time,
            open_time_2,
            close_time_2,
            closed
          `)
          .order(
            "day_of_week"
          );
  
      if (saveError) {
        console.error(
          "Error saving admin business hours:",
          saveError
        );
  
        return NextResponse.json(
          {
            error:
              saveError.message ||
              "No se ha podido guardar el horario.",
          },
          {
            status:
              500,
          }
        );
      }
  
      return NextResponse.json({
        hours:
          savedHours ??
          [],
      });
    } catch (error) {
      console.error(
        "Unexpected admin business hours error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al guardar el horario.",
        },
        {
          status:
            500,
        }
      );
    }
  }