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
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  deleteBookingGoogleCalendarEvent,
  updateBookingGoogleCalendarEvent,
} from "@/lib/google-calendar";

type RequestBody = {
  action?: unknown;
  bookingId?: unknown;
  newSlotId?: unknown;
};

/*
 * ============================================================
 * OBTENER RESERVA DEL USUARIO
 * ============================================================
 */

async function getOwnedBooking({
  admin,
  bookingId,
  userId,
}: {
  admin:
    ReturnType<
      typeof createAdminClient
    >;

  bookingId:
    string;

  userId:
    string;
}) {
  return admin
    .from(
      "bookings"
    )
    .select(`
      id,
      user_id,
      business_id,
      service_id,
      slot_id,
      status,
      cancelled_at,

      slots (
        id,
        start_at,
        end_at,
        status
      ),

      businesses (
        id,
        allow_cancellations,
        min_cancellation_notice_hours
      )
    `)
    .eq(
      "id",
      bookingId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();
}

type BookingAction =
  | "cancel"
  | "reschedule";

function bookingRpcErrorResponse(
  error: {
    message?: string | null;
  },
  action: BookingAction
) {
  const message =
    typeof error.message === "string"
      ? error.message.trim()
      : "";

  const normalized =
    message.toLocaleLowerCase("es");

  console.error(
    "Customer booking RPC error:",
    { action, error }
  );

  if (normalized === "debes iniciar sesión") {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  if (normalized.includes("bloquead")) {
    return NextResponse.json(
      { error: "Tu cuenta está bloqueada." },
      { status: 403 }
    );
  }

  if (
    normalized === "no puedes cancelar esta reserva" ||
    normalized === "no puedes modificar esta reserva"
  ) {
    return NextResponse.json(
      {
        error:
          "No tienes permisos para modificar esta reserva.",
      },
      { status: 403 }
    );
  }

  if (
    normalized === "la reserva no existe" ||
    normalized === "el horario de la reserva no existe" ||
    normalized === "la cita actual no existe" ||
    normalized === "el negocio no existe" ||
    normalized === "la nueva cita no existe"
  ) {
    return NextResponse.json(
      { error: message },
      { status: 404 }
    );
  }

  if (
    normalized === "esta reserva ya no está activa" ||
    normalized === "la nueva cita ya no está disponible" ||
    normalized.includes("coincide con un horario bloqueado") ||
    normalized.includes("coincide con una reserva manual")
  ) {
    return NextResponse.json(
      { error: message },
      { status: 409 }
    );
  }

  if (
    normalized === "este negocio no permite cancelaciones online" ||
    normalized === "esta cita ya no se puede cancelar" ||
    normalized.startsWith("esta cita requiere al menos ") ||
    normalized === "esta cita ya no se puede modificar" ||
    normalized === "este negocio no permite modificar las citas" ||
    normalized.startsWith("esta cita solo se puede cambiar con al menos ") ||
    normalized === "selecciona una cita diferente" ||
    normalized === "la nueva cita pertenece a otro negocio" ||
    normalized === "la nueva cita pertenece a otro servicio" ||
    normalized === "no puedes seleccionar una cita pasada" ||
    normalized.startsWith("la nueva cita requiere al menos ") ||
    normalized.startsWith("no puedes reservar con más de ")
  ) {
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error:
        action === "cancel"
          ? "No se ha podido cancelar la reserva."
          : "No se ha podido reprogramar la reserva.",
    },
    { status: 500 }
  );
}

/*
 * ============================================================
 * COMPROBAR POLÍTICA DE CAMBIOS / CANCELACIÓN
 * ============================================================
 */

function validateCancellationPolicy(
  booking: {
    slots:
      | {
          id: string;
          start_at: string;
          end_at: string;
          status: string;
        }
      | {
          id: string;
          start_at: string;
          end_at: string;
          status: string;
        }[]
      | null;

    businesses:
      | {
          id: string;
          allow_cancellations: boolean;
          min_cancellation_notice_hours: number;
        }
      | {
          id: string;
          allow_cancellations: boolean;
          min_cancellation_notice_hours: number;
        }[]
      | null;
  }
) {
  const slot =
    Array.isArray(
      booking.slots
    )
      ? booking.slots[0] ??
        null
      : booking.slots;

  const business =
    Array.isArray(
      booking.businesses
    )
      ? booking.businesses[0] ??
        null
      : booking.businesses;

  if (
    !slot ||
    !business
  ) {
    return {
      success:
        false,

      error:
        "No se ha podido comprobar la información de la cita.",
    };
  }

  if (
    !business.allow_cancellations
  ) {
    return {
      success:
        false,

      error:
        "Este negocio no permite cambios ni cancelaciones online.",
    };
  }

  const startAt =
    new Date(
      slot.start_at
    );

  if (
    Number.isNaN(
      startAt.getTime()
    )
  ) {
    return {
      success:
        false,

      error:
        "La fecha de la cita no es válida.",
    };
  }

  const noticeHours =
    Math.max(
      0,
      business
        .min_cancellation_notice_hours ??
        0
    );

  const deadline =
    new Date(
      startAt.getTime() -
        noticeHours *
          60 *
          60 *
          1000
    );

  if (
    new Date() >
    deadline
  ) {
    return {
      success:
        false,

      error:
        noticeHours >
        0
          ? `Ya no puedes cambiar ni cancelar esta cita. Este negocio requiere al menos ${noticeHours} horas de antelación.`
          : "Esta cita ya no se puede cambiar ni cancelar.",
    };
  }

  return {
    success:
      true,

    slot,

    business,
  };
}

/*
 * ============================================================
 * CONSULTAR HUECOS PARA REPROGRAMAR
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

    const bookingId =
      request.nextUrl.searchParams.get(
        "bookingId"
      );

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

    if (!isUuid(bookingId)) {
      return NextResponse.json(
        {
          error:
            "El identificador de la reserva no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        booking,
      error:
        bookingError,
    } =
      await getOwnedBooking({
        admin,
        bookingId,
        userId:
          user.id,
      });

    if (
      bookingError
    ) {
      console.error(
        "Error loading booking for reschedule:",
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

    const policy =
      validateCancellationPolicy(
        booking
      );

    if (
      !policy.success
    ) {
      return NextResponse.json(
        {
          error:
            policy.error,
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !booking.business_id ||
      !booking.service_id
    ) {
      return NextResponse.json(
        {
          error:
            "La reserva no tiene la información necesaria para buscar alternativas.",
        },
        {
          status:
            400,
        }
      );
    }

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
          start_at,
          end_at
        `)
        .eq(
          "business_id",
          booking.business_id
        )
        .eq(
          "service_id",
          booking.service_id
        )
        .eq(
          "status",
          "AVAILABLE"
        )
        .gte(
          "start_at",
          new Date()
            .toISOString()
        )
        .neq(
          "id",
          booking.slot_id
        )
        .order(
          "start_at",
          {
            ascending:
              true,
          }
        );

    if (
      slotsError
    ) {
      console.error(
        "Error loading reschedule slots:",
        slotsError
      );

      return NextResponse.json(
        {
          error:
            "No se han podido cargar las citas disponibles.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      slots:
        slots ??
        [],
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected account booking availability error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al consultar las citas disponibles.",
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
 * CANCELAR / REPROGRAMAR
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
     * USUARIO
     * ==========================================================
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
     * ==========================================================
     * COMPROBAR BLOQUEO
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
        "Error checking customer booking profile:",
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
     * BODY
     * ==========================================================
     */

    const bodyResult =
      await readJsonBody<RequestBody>(
        request
      );

    if (!bodyResult.ok) {
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
      body.action;

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

    if (!isUuid(bookingId)) {
      return NextResponse.json(
        {
          error:
            "El identificador de la reserva no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !==
        "cancel" &&
      action !==
        "reschedule"
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
     * ==========================================================
     * RESERVA REAL DEL USUARIO
     * ==========================================================
     */

    const {
      data:
        booking,
      error:
        bookingError,
    } =
      await getOwnedBooking({
        admin,
        bookingId,
        userId:
          user.id,
      });

    if (
      bookingError
    ) {
      console.error(
        "Error loading customer booking:",
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

    /*
     * No confiamos únicamente en la UI.
     * La política se vuelve a comprobar en servidor.
     */

    const policy =
      validateCancellationPolicy(
        booking
      );

    if (
      !policy.success
    ) {
      return NextResponse.json(
        {
          error:
            policy.error,
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ==========================================================
     * CANCELAR
     * ==========================================================
     */

    if (
      action ===
      "cancel"
    ) {
      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "cancel_booking",
          {
            p_booking_id:
              booking.id,
          }
        );

      if (
      rpcError
    ) {
      return bookingRpcErrorResponse(
        rpcError,
        "cancel"
      );
    }

      /*
* ============================================================
* GOOGLE CALENDAR
* ============================================================
*/

try {
await deleteBookingGoogleCalendarEvent(
  booking.id
);
} catch (
calendarError
) {
console.error(
  "Customer booking cancelled but Google Calendar delete failed:",
  calendarError
);
}

      return NextResponse.json({
        success:
          true,

        action:
          "cancel",

        bookingId:
          booking.id,

        oldSlotId:
          booking.slot_id,
      });
    }

    /*
     * ==========================================================
     * REPROGRAMAR
     * ==========================================================
     */

    const newSlotId =
      typeof body.newSlotId ===
      "string"
        ? body.newSlotId.trim()
        : "";

    if (
      !newSlotId
    ) {
      return NextResponse.json(
        {
          error:
            "Selecciona una nueva cita.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!isUuid(newSlotId)) {
      return NextResponse.json(
        {
          error:
            "El identificador de la nueva cita no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * No aceptamos simplemente cualquier UUID enviado
     * desde el navegador.
     *
     * El nuevo slot:
     * - debe existir;
     * - pertenecer al mismo negocio;
     * - pertenecer al mismo servicio;
     * - estar AVAILABLE;
     * - estar en el futuro.
     */

    const {
      data:
        newSlot,
      error:
        newSlotError,
    } =
      await admin
        .from(
          "slots"
        )
        .select(`
          id,
          business_id,
          service_id,
          start_at,
          end_at,
          status
        `)
        .eq(
          "id",
          newSlotId
        )
        .maybeSingle();

    if (
      newSlotError
    ) {
      console.error(
        "Error checking customer reschedule slot:",
        newSlotError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la nueva cita.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !newSlot
    ) {
      return NextResponse.json(
        {
          error:
            "La cita seleccionada ya no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    if (
      newSlot.business_id !==
        booking.business_id ||
      newSlot.service_id !==
        booking.service_id ||
      newSlot.status !==
        "AVAILABLE"
    ) {
      return NextResponse.json(
        {
          error:
            "La cita seleccionada ya no está disponible.",
        },
        {
          status:
            409,
        }
      );
    }

    if (
      new Date(
        newSlot.start_at
      ) <=
      new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes cambiar la reserva a una fecha pasada.",
        },
        {
          status:
            400,
        }
      );
    }

    const oldSlotId =
      booking.slot_id;

    if (
      !oldSlotId
    ) {
      return NextResponse.json(
        {
          error:
            "No se ha podido identificar la cita anterior.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      error:
        rpcError,
    } =
      await supabase.rpc(
        "reschedule_booking",
        {
          p_booking_id:
            booking.id,

          p_new_slot_id:
            newSlot.id,
        }
      );

    if (
      rpcError
    ) {
      return bookingRpcErrorResponse(
        rpcError,
        "reschedule"
      );
    }

/*
* ==========================================================
* GOOGLE CALENDAR
* ==========================================================
*
* La reserva ya está reprogramada en Slottye.
* Si Google falla, no deshacemos el cambio.
*/

try {
await updateBookingGoogleCalendarEvent(
  booking.id
);
} catch (
calendarError
) {
console.error(
  "Booking rescheduled but Google Calendar sync failed:",
  calendarError
);
}


    return NextResponse.json({
      success:
        true,

      action:
        "reschedule",

      bookingId:
        booking.id,

      oldSlotId,

      newSlot: {
        id:
          newSlot.id,

        start_at:
          newSlot.start_at,

        end_at:
          newSlot.end_at,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected account booking management error:",
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