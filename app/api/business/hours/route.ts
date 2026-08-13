import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

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

function validTime(
  value:
    string | null
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
  request:
    NextRequest
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
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
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
     * COMPROBAR CUENTA ACTIVA DE NEGOCIO
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
      profileError
    ) {
      console.error(
        "Error checking business hours profile:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar tu cuenta.",
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
     * ============================================================
     * NEGOCIO DEL PROPIETARIO
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
          "owner_id",
          user.id
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error checking business hours owner:",
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
            "No se ha encontrado tu negocio.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * DATOS RECIBIDOS
     * ============================================================
     */

    const bodyResult =
      await readJsonBody<{
        days?: unknown;
      }>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const submittedDays =
      bodyResult.data
        .days;

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

    const days =
      submittedDays as
        SubmittedDay[];

    /*
     * ============================================================
     * VALIDACIÓN
     * ============================================================
     */

    const usedDays =
      new Set<number>();

    for (
      const day of
      days
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

      if (
        typeof day.closed !==
          "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "El estado de uno de los días no es válido.",
          },
          {
            status:
              400,
          }
        );
      }

      if (
        day.closed
      ) {
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

    /*
     * ============================================================
     * NORMALIZAR
     * ============================================================
     */

    const rows =
      [...days]
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
     * ============================================================
     * GUARDAR DE FORMA TRANSACCIONAL
     * ============================================================
     *
     * PostgreSQL valida y guarda los siete días dentro
     * de una única transacción.
     *
     * Si falla cualquier día, no se guarda ninguno.
     */

    const {
      data:
        savedHours,
      error:
        saveError,
    } =
      await admin.rpc(
        "save_business_hours_transactional",
        {
          p_business_id:
            business.id,

          p_days:
            rows,
        }
      );

    if (
      saveError
    ) {
      console.error(
        "Error saving business hours transactionally:",
        saveError
      );

      let errorMessage =
        "No se ha podido guardar el horario.";

      let status =
        500;

      const message =
        typeof saveError.message ===
          "string"
          ? saveError.message
          : "";

      if (
        message.includes(
          "SEVEN_DAYS_REQUIRED"
        ) ||
        message.includes(
          "INVALID_DAY_SET"
        )
      ) {
        errorMessage =
          "Debes configurar correctamente los siete días de la semana.";

        status =
          400;
      } else if (
        message.includes(
          "INVALID_FIRST_SHIFT"
        )
      ) {
        errorMessage =
          "Uno de los primeros tramos horarios no es válido.";

        status =
          400;
      } else if (
        message.includes(
          "INVALID_SECOND_SHIFT"
        )
      ) {
        errorMessage =
          "Uno de los segundos tramos horarios no es válido.";

        status =
          400;
      } else if (
        message.includes(
          "OVERLAPPING_SHIFTS"
        )
      ) {
        errorMessage =
          "Hay horarios que se solapan.";

        status =
          400;
      } else if (
        message.includes(
          "BUSINESS_NOT_FOUND"
        )
      ) {
        errorMessage =
          "No se ha encontrado tu negocio.";

        status =
          404;
      }

      return NextResponse.json(
        {
          error:
            errorMessage,
        },
        {
          status,
        }
      );
    }

    return NextResponse.json({
      hours:
        savedHours ??
        [],
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business hours error:",
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