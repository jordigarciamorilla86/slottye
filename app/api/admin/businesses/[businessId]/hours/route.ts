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
  writeAdminAuditLog,
} from "@/lib/admin/audit";

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
      success:
        false as const,

      admin:
        null,

      user:
        null,

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
    profileError ||
    !profile?.is_admin
  ) {
    return {
      success:
        false as const,

      admin:
        null,

      user:
        null,

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
    success:
      true as const,

    admin,
    user,

    response:
      null,
  };
}

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
    NextRequest,
  {
    params,
  }:
    RouteContext
) {
  try {
    const {
      businessId,
    } =
      await params;

    const authorization =
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const {
      admin,
      user,
    } =
      authorization;

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
          name,
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

    /*
     * ============================================================
     * HORARIO ANTERIOR
     * ============================================================
     */

    const {
      data:
        previousHours,
      error:
        previousHoursError,
    } =
      await admin
        .from(
          "business_hours"
        )
        .select(`
          day_of_week,
          open_time,
          close_time,
          open_time_2,
          close_time_2,
          closed
        `)
        .eq(
          "business_id",
          business.id
        )
        .order(
          "day_of_week"
        );

    if (
      previousHoursError
    ) {
      console.error(
        "Error loading previous business hours:",
        previousHoursError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el horario actual.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * DATOS RECIBIDOS
     * ============================================================
     */

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

    /*
     * ============================================================
     * VALIDACIÓN
     * ============================================================
     */

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
      [...submittedDays]
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
              business.id,

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
     * GUARDAR
     * ============================================================
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

    if (
      saveError
    ) {
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

    /*
     * ============================================================
     * AUDITORÍA
     * ============================================================
     */

    await writeAdminAuditLog({
      adminUserId:
        user.id,

      action:
        "BUSINESS_HOURS_UPDATED",

      entityType:
        "BUSINESS_HOURS",

      entityId:
        business.id,

      businessId:
        business.id,

      targetUserId:
        business.owner_id,

      description:
        `Se modificó el horario habitual de ${business.name}.`,

      oldValues: {
        hours:
          previousHours ??
          [],
      },

      newValues: {
        hours:
          savedHours ??
          [],
      },
    });

    return NextResponse.json({
      hours:
        savedHours ??
        [],
    });
  } catch (
    error
  ) {
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