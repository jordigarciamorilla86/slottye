import {
  after,
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
  checkRateLimit,
} from "@/lib/api/rate-limit";


import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  writeAdminAuditLog,
} from "@/lib/admin/audit";

import {
  deleteBookingGoogleCalendarEvent,
} from "@/lib/google-calendar";

type BookingAction =
  | "cancel"
  | "complete"
  | "no_show";

type RequestBody = {
  bookingId?: unknown;
  action?: unknown;
};

type BookingStatusRpcError = {
  message?: string | null;
};

function bookingStatusRpcErrorResponse(
  error: BookingStatusRpcError,
  action: BookingAction
) {
  const message =
    typeof error.message ===
    "string"
      ? error.message.trim()
      : "";

  const normalized =
    message.toLocaleLowerCase(
      "es"
    );

  console.error(
    "Booking status RPC error:",
    {
      action,
      error,
    }
  );

  if (
    normalized ===
    "debes iniciar sesión"
  ) {
    return NextResponse.json(
      {
        error:
          "Debes iniciar sesión.",
      },
      {
        status:
          401,
      }
    );
  }

  if (
    normalized.includes(
      "bloquead"
    )
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

  if (
    normalized ===
      "no puedes cancelar esta reserva" ||
    normalized ===
      "no puedes modificar esta reserva"
  ) {
    return NextResponse.json(
      {
        error:
          "No tienes permisos para modificar esta reserva.",
      },
      {
        status:
          403,
      }
    );
  }

  if (
    normalized ===
    "la reserva no existe"
  ) {
    return NextResponse.json(
      {
        error:
          "La reserva no existe.",
      },
      {
        status:
          404,
      }
    );
  }

  if (
    normalized ===
    "el horario de la reserva no existe"
  ) {
    return NextResponse.json(
      {
        error:
          "El horario asociado a la reserva ya no existe.",
      },
      {
        status:
          409,
      }
    );
  }

  if (
    normalized ===
    "esta reserva ya no está activa"
  ) {
    return NextResponse.json(
      {
        error:
          "Esta reserva ya no está activa.",
      },
      {
        status:
          409,
      }
    );
  }

  if (
    normalized ===
    "no puedes completar una cita que todavía no ha comenzado"
  ) {
    return NextResponse.json(
      {
        error:
          "No puedes completar una cita que todavía no ha comenzado.",
      },
      {
        status:
          400,
      }
    );
  }

  if (
    normalized ===
    "no puedes marcar como no presentado antes de la cita"
  ) {
    return NextResponse.json(
      {
        error:
          "No puedes marcar como no presentado antes de la cita.",
      },
      {
        status:
          400,
      }
    );
  }

  return NextResponse.json(
    {
      error:
        action === "cancel"
          ? "No se ha podido cancelar la reserva."
          : action === "complete"
            ? "No se ha podido completar la reserva."
            : "No se ha podido marcar la reserva como no presentada.",
    },
    {
      status:
        500,
    }
  );
}

export async function POST(
  request:
    NextRequest
) {
  try {
    const supabase =
      await createClient();

    const admin =
      createAdminClient();

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

      const rateLimit =
        await checkRateLimit({
          identifier: user.id,
          prefix: "agenda-booking-status",
          limit: 30,
          window: "1 m",
        });

      if (!rateLimit.ok) {
        return NextResponse.json(
          { error: rateLimit.error },
          { status: rateLimit.status }
        );
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
        "Error checking booking status actor:",
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

    const bodyResult =
      await readJsonBody<RequestBody>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

    const bookingId =
      typeof body.bookingId ===
      "string"
        ? body.bookingId.trim()
        : "";

    const action =
      body.action as
        | BookingAction
        | undefined;

    if (
      !bookingId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador de la reserva.",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !isUuid(
        bookingId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador de la reserva no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      action !==
        "cancel" &&
      action !==
        "complete" &&
      action !==
        "no_show"
    ) {
      return NextResponse.json(
        {
          error:
            "La acción no es válida.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * CARGAR RESERVA Y NEGOCIO
     * ============================================================
     */

    const {
      data:
        booking,
      error:
        bookingError,
    } =
      await admin
        .from(
          "bookings"
        )
        .select(`
          id,
          business_id,
          user_id,
          service_id,
          slot_id,
          status,
          cancelled_at,

          slots (
            id,
            start_at,
            end_at,
            status
          )
        `)
        .eq(
          "id",
          bookingId
        )
        .maybeSingle();

    if (
      bookingError
    ) {
      console.error(
        "Error loading booking before status change:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la reserva.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !booking
    ) {
      return NextResponse.json(
        {
          error:
            "La reserva no existe.",
        },
        {
          status:
            404,
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
          booking.business_id
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error checking booking business:",
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
      !isAdmin &&
      business.owner_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para modificar esta reserva.",
        },
        {
          status:
            403,
        }
      );
    }

    if (
      booking.status !==
      "CONFIRMED"
    ) {
      return NextResponse.json(
        {
          error:
            "Solo se pueden modificar reservas confirmadas.",
        },
        {
          status:
            400,
        }
      );
    }

    const previousSlot =
      Array.isArray(
        booking.slots
      )
        ? booking.slots[0] ??
          null
        : booking.slots;

    /*
     * ============================================================
     * EJECUTAR RPC
     * ============================================================
     */

    let rpcError:
      {
        message:
          string;
      } |
      null =
      null;

    if (
      action ===
      "cancel"
    ) {
      const result =
        await supabase.rpc(
          "cancel_booking_by_business",
          {
            p_booking_id:
              booking.id,
          }
        );

      rpcError =
        result.error;
    }

    if (
      action ===
      "complete"
    ) {
      const result =
        await supabase.rpc(
          "complete_booking",
          {
            p_booking_id:
              booking.id,
          }
        );

      rpcError =
        result.error;
    }

    if (
      action ===
      "no_show"
    ) {
      const result =
        await supabase.rpc(
          "no_show_booking",
          {
            p_booking_id:
              booking.id,
          }
        );

      rpcError =
        result.error;
    }

    if (
      rpcError
    ) {
      return bookingStatusRpcErrorResponse(
        rpcError,
        action
      );
    }

    /*
* ============================================================
* GOOGLE CALENDAR
* ============================================================
*
* Solo eliminamos el evento cuando la reserva
* ha sido cancelada.
*
* Complete y no_show no deben eliminarlo.
*/

if (
action ===
"cancel"
) {
after(async () => {
  try {
    await deleteBookingGoogleCalendarEvent(
      booking.id
    );
  } catch (
    calendarError
  ) {
    console.error(
      "Booking cancelled but Google Calendar delete failed:",
      calendarError
    );
  }
});
}

    /*
     * ============================================================
     * AUDITORÍA ADMIN
     * ============================================================
     */

    if (
      isAdmin
    ) {
      let auditAction =
        "BOOKING_UPDATED";

      let description =
        `Se modificó una reserva de ${business.name}.`;

      if (
        action ===
        "cancel"
      ) {
        auditAction =
          "BOOKING_CANCELLED";

        description =
          `Se canceló una reserva de ${business.name}.`;
      }

      if (
        action ===
        "complete"
      ) {
        auditAction =
          "BOOKING_COMPLETED";

        description =
          `Se marcó como completada una reserva de ${business.name}.`;
      }

      if (
        action ===
        "no_show"
      ) {
        auditAction =
          "BOOKING_NO_SHOW";

        description =
          `Se marcó como no presentado al cliente de una reserva de ${business.name}.`;
      }

      try {
        await writeAdminAuditLog({
          adminUserId:
            user.id,

          action:
            auditAction,

          entityType:
            "BOOKING",

          entityId:
            booking.id,

          businessId:
            business.id,

          targetUserId:
            booking.user_id,

          description,

          oldValues: {
            status:
              booking.status,

            cancelled_at:
              booking.cancelled_at,

            service_id:
              booking.service_id,

            slot_id:
              booking.slot_id,

            start_at:
              previousSlot
                ?.start_at ??
              null,

            end_at:
              previousSlot
                ?.end_at ??
              null,
          },

          newValues: {
            action,
          },
        });
      } catch (
        auditError
      ) {
        console.error(
          "Error writing booking status audit:",
          auditError
        );
      }
    }

    return NextResponse.json({
      success:
        true,

      action,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected booking status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al modificar la reserva.",
      },
      {
        status:
          500,
      }
    );
  }
}
