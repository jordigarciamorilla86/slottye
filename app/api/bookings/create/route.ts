import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  syncBookingToGoogleCalendar,
} from "@/lib/google-calendar";

import {
  POST as sendBookingConfirmation,
} from "@/app/api/notifications/booking-confirmed/route";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";

type RequestBody = {
  slotId?: unknown;
};



function mapBookingError(
  message: string
) {
  /*
   * ============================================================
   * ERRORES FUNCIONALES DE book_slot()
   * ============================================================
   *
   * Nunca devolvemos directamente al navegador un error
   * desconocido de PostgreSQL/Supabase.
   */

  if (
    message ===
    "Debes iniciar sesión para reservar"
  ) {
    return {
      status:
        401,

      message:
        "Debes iniciar sesión para reservar.",
    };
  }

  if (
    message ===
    "La cita no existe"
  ) {
    return {
      status:
        404,

      message:
        "La cita ya no existe.",
    };
  }

  if (
    message ===
    "Esta cita ya no está disponible"
  ) {
    return {
      status:
        409,

      message:
        "Esta cita ya no está disponible.",
    };
  }

  if (
    message ===
    "No puedes reservar una cita pasada"
  ) {
    return {
      status:
        400,

      message:
        "No puedes reservar una cita pasada.",
    };
  }

  if (
    message ===
    "El negocio asociado a esta cita no existe"
  ) {
    return {
      status:
        404,

      message:
        "El negocio asociado a esta cita ya no está disponible.",
    };
  }

  /*
   * Los siguientes mensajes incluyen valores variables:
   *
   * Esta cita requiere al menos X horas...
   * Solo puedes reservar con un máximo de X días...
   *
   * Son mensajes funcionales controlados por nuestra RPC,
   * así que podemos mostrarlos.
   */

  if (
    message.startsWith(
      "Esta cita requiere al menos "
    )
  ) {
    return {
      status:
        400,

      message:
        `${message}.`,
    };
  }

  if (
    message.startsWith(
      "Solo puedes reservar con un máximo de "
    )
  ) {
    return {
      status:
        400,

      message:
        `${message}.`,
    };
  }

  /*
   * assert_active_user() puede rechazar una cuenta bloqueada.
   *
   * No exponemos aquí el texto interno que devuelva la función.
   */

  if (
    message
      .toLowerCase()
      .includes(
        "blocked"
      ) ||
    message
      .toLowerCase()
      .includes(
        "bloquead"
      )
  ) {
    return {
      status:
        403,

      message:
        "Tu cuenta no puede realizar reservas.",
    };
  }

  return null;
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    /*
     * ============================================================
     * USUARIO AUTENTICADO
     * ============================================================
     */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth
        .getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Debes iniciar sesión para reservar.",
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

    /*
     * ============================================================
     * SLOT
     * ============================================================
     */

    const slotId =
      typeof body.slotId ===
        "string"
        ? body.slotId.trim()
        : "";

    if (
      !slotId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta la cita que quieres reservar.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        slotId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La cita indicada no es válida.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * RESERVAR
     * ============================================================
     *
     * Toda la atomicidad está dentro de book_slot():
     *
     * - auth.uid();
     * - assert_active_user();
     * - SELECT slot FOR UPDATE;
     * - comprobar AVAILABLE;
     * - impedir citas pasadas;
     * - comprobar antelación mínima;
     * - comprobar antelación máxima;
     * - INSERT booking;
     * - slot -> BOOKED.
     *
     * Si cualquiera de esas operaciones falla,
     * PostgreSQL revierte toda la transacción.
     */

    const {
      data:
        bookingId,
      error:
        bookingError,
    } =
      await supabase.rpc(
        "book_slot",
        {
          p_slot_id:
            slotId,
        }
      );

    if (
      bookingError
    ) {
      const mappedError =
        mapBookingError(
          bookingError.message
        );

      if (
        mappedError
      ) {
        return NextResponse.json(
          {
            error:
              mappedError.message,
          },
          {
            status:
              mappedError.status,
          }
        );
      }

      /*
       * Error inesperado de PostgreSQL/Supabase.
       *
       * Se registra en servidor, pero NO se filtra
       * el mensaje técnico al usuario.
       */

      console.error(
        "Unexpected book_slot RPC error:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido completar la reserva.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !bookingId
    ) {
      console.error(
        "book_slot returned no booking id",
        {
          slotId,
          userId:
            user.id,
        }
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido crear la reserva.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * GOOGLE CALENDAR
     * ============================================================
     *
     * Google Calendar es un efecto secundario.
     *
     * Una reserva correcta NO debe fallar ni deshacerse
     * porque Google Calendar tenga una incidencia.
     */

    let calendarSynced =
      false;

    try {
      const calendarResult =
        await syncBookingToGoogleCalendar(
          bookingId
        );

      calendarSynced =
        calendarResult.synced;
    } catch (
      calendarError
    ) {
      console.error(
        "Booking created but Google Calendar sync failed:",
        calendarError
      );
    }

    const rateLimit =
      await checkRateLimit({
        identifier:
          user.id,

        prefix:
          "booking-create",

        limit:
          10,

        window:
          "1 m",
      });

    if (
      !rateLimit.ok
    ) {
      return NextResponse.json(
        {
          error:
            rateLimit.error,
        },
        {
          status:
            rateLimit.status,
        }
      );
    }

    /*
     * ============================================================
     * CONFIRMACIÓN POR EMAIL
     * ============================================================
     *
     * La confirmación se inicia en el servidor, dentro del mismo
     * flujo que ha creado la reserva. Así no depende de que el
     * navegador permanezca abierto ni de una segunda petición del
     * cliente.
     *
     * La ruta de notificación conserva sus comprobaciones de usuario,
     * rate limit e idempotencia. Un fallo de correo nunca invalida una
     * reserva que book_slot() ya ha confirmado.
     */

    let confirmationSent =
      false;

    try {
      const confirmationResponse =
        await sendBookingConfirmation(
          new Request(
            new URL(
              "/api/notifications/booking-confirmed",
              request.url
            ),
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  bookingId,
                }),
            }
          )
        );

      confirmationSent =
        confirmationResponse.ok;

      if (
        !confirmationResponse.ok
      ) {
        console.error(
          "Booking created but confirmation notification failed:",
          {
            bookingId,
            status:
              confirmationResponse.status,
          }
        );
      }
    } catch (
      confirmationError
    ) {
      console.error(
        "Booking created but confirmation notification failed:",
        confirmationError
      );
    }

    /*
     * ============================================================
     * OK
     * ============================================================
     */

    return NextResponse.json({
      bookingId,
      calendarSynced,
      confirmationSent,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected booking create error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al reservar.",
      },
      {
        status:
          500,
      }
    );
  }
}
