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
  updateBookingGoogleCalendarEvent,
  updateManualBookingGoogleCalendarEvent,
  updateBlockGoogleCalendarEvent,
} from "@/lib/google-calendar";

type RequestBody = {
  type?: unknown;
  eventId?: unknown;
  startAt?: unknown;
  endAt?: unknown;
};

type EventSnapshot = {
  id: string;
  businessId: string;

  serviceId?: string | null;

  startAt: string;
  endAt: string;

  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: string | null;

  reason?: string | null;
};

/*
 * ============================================================
 * VALIDAR FECHA
 * ============================================================
 */

function validDate(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/*
 * ============================================================
 * RESPUESTA DE ERROR RPC
 * ============================================================
 */

function rpcErrorResponse(
  error: {
    message?: string | null;
    code?: string | null;
    details?: string | null;
    hint?: string | null;
  }
) {
  const message =
    typeof error.message === "string"
      ? error.message
      : "";

  const normalized =
    message.toLocaleLowerCase("es");

  if (
    normalized.includes("debes iniciar sesión")
  ) {
    return NextResponse.json(
      {
        error: "Debes iniciar sesión.",
      },
      {
        status: 401,
      }
    );
  }

  if (
    normalized.includes("cuenta está bloqueada") ||
    normalized.includes("cuenta bloqueada") ||
    normalized.includes("usuario bloqueado")
  ) {
    return NextResponse.json(
      {
        error: "Tu cuenta está bloqueada.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    normalized.includes("no puedes modificar") ||
    normalized.includes("no tienes permisos")
  ) {
    return NextResponse.json(
      {
        error:
          "No tienes permisos para modificar este evento.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    normalized.includes("no existe")
  ) {
    return NextResponse.json(
      {
        error:
          "El evento solicitado no existe.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    normalized.includes("coincide con") ||
    normalized.includes("ya está ocupado") ||
    normalized.includes("contiene historial")
  ) {
    return NextResponse.json(
      {
        error:
          "El nuevo horario entra en conflicto con otro evento o contiene historial.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes("no es válido") ||
    normalized.includes("fecha pasada") ||
    normalized.includes("ya no está activa") ||
    normalized.includes("selecciona un horario diferente") ||
    normalized.includes("solo se pueden mover") ||
    normalized.includes("no está activo") ||
    normalized.includes("no pertenece al negocio")
  ) {
    return NextResponse.json(
      {
        error:
          "No se puede mover el evento al horario solicitado.",
      },
      {
        status: 400,
      }
    );
  }

  return NextResponse.json(
    {
      error:
        "No se ha podido modificar el horario del evento.",
    },
    {
      status: 500,
    }
  );
}

/*
 * ============================================================
 * MOVER EVENTO
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
        prefix: "agenda-move",
        limit: 60,
        window: "1 m",
      });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status }
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
        "Error checking agenda actor:",
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

    /*
     * Un administrador puede actuar sobre cualquier negocio.
     * Un propietario bloqueado no puede modificar su agenda.
     */

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
     * BODY
     * ==========================================================
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

    const type =
      body.type;

    const eventId =
      typeof body.eventId ===
      "string"
        ? body.eventId
            .trim()
        : "";

    const start =
      validDate(
        body.startAt
      );

    const end =
      validDate(
        body.endAt
      );

    if (
      type !==
        "booking" &&
      type !==
        "manual" &&
      type !==
        "block" &&
      type !==
        "slot"
    ) {
      return NextResponse.json(
        {
          error:
            "El tipo de evento no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !eventId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del evento.",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !isUuid(
        eventId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del evento no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !start ||
      !end ||
      end <=
        start
    ) {
      return NextResponse.json(
        {
          error:
            "El nuevo horario no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      end <=
      new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes mover el evento completamente al pasado.",
        },
        {
          status:
            400,
        }
      );
    }

    const startAt =
      start.toISOString();

    const endAt =
      end.toISOString();

    /*
     * ==========================================================
     * CARGAR EVENTO ACTUAL
     * ==========================================================
     */

    let snapshot:
      EventSnapshot |
      null =
      null;

    /*
     * ----------------------------------------------------------
     * RESERVA ONLINE
     * ----------------------------------------------------------
     */

    if (
      type ===
      "booking"
    ) {
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
            service_id,
            status,

            slots (
              id,
              start_at,
              end_at
            )
          `)
          .eq(
            "id",
            eventId
          )
          .maybeSingle();

      if (
        bookingError
      ) {
        console.error(
          "Error loading booking before agenda move:",
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
              "Solo se pueden mover reservas confirmadas.",
          },
          {
            status:
              400,
          }
        );
      }

      const currentSlot =
        Array.isArray(
          booking.slots
        )
          ? booking
              .slots[0] ??
            null
          : booking.slots;

      if (
        !currentSlot
      ) {
        return NextResponse.json(
          {
            error:
              "La reserva no tiene un horario asociado.",
          },
          {
            status:
              409,
          }
        );
      }

      snapshot = {
        id:
          booking.id,

        businessId:
          booking.business_id,

        serviceId:
          booking.service_id,

        startAt:
          currentSlot.start_at,

        endAt:
          currentSlot.end_at,
      };
    }

    /*
     * ----------------------------------------------------------
     * RESERVA MANUAL
     * ----------------------------------------------------------
     */

    if (
      type ===
      "manual"
    ) {
      const {
        data:
          manual,
        error:
          manualError,
      } =
        await admin
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
            notes
          `)
          .eq(
            "id",
            eventId
          )
          .maybeSingle();

      if (
        manualError
      ) {
        console.error(
          "Error loading manual booking before agenda move:",
          manualError
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar la reserva manual.",
          },
          {
            status:
              500,
          }
        );
      }

      if (
        !manual
      ) {
        return NextResponse.json(
          {
            error:
              "La reserva manual no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      snapshot = {
        id:
          manual.id,

        businessId:
          manual.business_id,

        serviceId:
          manual.service_id,

        startAt:
          manual.start_at,

        endAt:
          manual.end_at,

        customerName:
          manual.customer_name,

        customerPhone:
          manual.customer_phone,

        customerEmail:
          manual.customer_email,

        notes:
          manual.notes,
      };
    }

    /*
     * ----------------------------------------------------------
     * BLOQUEO
     * ----------------------------------------------------------
     */

    if (
      type ===
      "block"
    ) {
      const {
        data:
          block,
        error:
          blockError,
      } =
        await admin
          .from(
            "business_blocks"
          )
          .select(`
            id,
            business_id,
            start_at,
            end_at,
            reason
          `)
          .eq(
            "id",
            eventId
          )
          .maybeSingle();

      if (
        blockError
      ) {
        console.error(
          "Error loading block before agenda move:",
          blockError
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar el bloqueo.",
          },
          {
            status:
              500,
          }
        );
      }

      if (
        !block
      ) {
        return NextResponse.json(
          {
            error:
              "El bloqueo no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      snapshot = {
        id:
          block.id,

        businessId:
          block.business_id,

        startAt:
          block.start_at,

        endAt:
          block.end_at,

        reason:
          block.reason,
      };
    }

    /*
     * ----------------------------------------------------------
     * DISPONIBILIDAD
     * ----------------------------------------------------------
     */

    if (
      type ===
      "slot"
    ) {
      const {
        data:
          slot,
        error:
          slotError,
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
            eventId
          )
          .maybeSingle();

      if (
        slotError
      ) {
        console.error(
          "Error loading slot before agenda move:",
          slotError
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar la disponibilidad.",
          },
          {
            status:
              500,
          }
        );
      }

      if (
        !slot
      ) {
        return NextResponse.json(
          {
            error:
              "La disponibilidad no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      if (
        slot.status !==
        "AVAILABLE"
      ) {
        return NextResponse.json(
          {
            error:
              "Solo se pueden mover disponibilidades libres.",
          },
          {
            status:
              400,
          }
        );
      }

      snapshot = {
        id:
          slot.id,

        businessId:
          slot.business_id,

        serviceId:
          slot.service_id,

        startAt:
          slot.start_at,

        endAt:
          slot.end_at,
      };
    }

    if (
      !snapshot
    ) {
      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el evento.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ==========================================================
     * COMPROBAR NEGOCIO Y AUTORIZACIÓN
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
          name,
          owner_id
        `)
        .eq(
          "id",
          snapshot.businessId
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error checking agenda move business:",
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

    const isOwner =
      business.owner_id ===
      user.id;

    if (
      !isAdmin &&
      !isOwner
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para modificar este evento.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ==========================================================
     * EJECUTAR RPC CON LA SESIÓN REAL
     * ==========================================================
     *
     * Importante:
     * usamos el cliente autenticado `supabase`
     * para conservar auth.uid() dentro de las RPC.
     * El cliente admin se usa solamente para comprobaciones
     * y lectura segura de informaciÃ³n.
     * ==========================================================
     */

    let rpcError:
      {
        message:
          string;
      } |
      null =
      null;

    /*
     * ----------------------------------------------------------
     * BOOKING
     * ----------------------------------------------------------
     */

    if (
      type ===
      "booking"
    ) {
      const result =
        await supabase.rpc(
          "business_move_booking_to_time",
          {
            p_booking_id:
              snapshot.id,

            p_start_at:
              startAt,

            p_end_at:
              endAt,
          }
        );

      rpcError =
        result.error;
    }

    /*
     * ----------------------------------------------------------
     * MANUAL
     * ----------------------------------------------------------
     */

    if (
      type ===
      "manual"
    ) {
      const result =
        await supabase.rpc(
          "update_manual_booking",
          {
            p_booking_id:
              snapshot.id,

            p_service_id:
              snapshot.serviceId ??
              null,

            p_customer_name:
              snapshot.customerName ??
              "",

            p_customer_phone:
              snapshot.customerPhone ??
              "",

            p_customer_email:
              snapshot.customerEmail ??
              "",

            p_start_at:
              startAt,

            p_end_at:
              endAt,

            p_notes:
              snapshot.notes ??
              "",
          }
        );

      rpcError =
        result.error;
    }

    /*
     * ----------------------------------------------------------
     * BLOCK
     * ----------------------------------------------------------
     */

    if (
      type ===
      "block"
    ) {
      const result =
        await supabase.rpc(
          "update_agenda_block",
          {
            p_block_id:
              snapshot.id,

            p_start_at:
              startAt,

            p_end_at:
              endAt,

            p_reason:
              snapshot.reason ??
              "",
          }
        );

      rpcError =
        result.error;
    }

    /*
     * ----------------------------------------------------------
     * SLOT
     * ----------------------------------------------------------
     */

    if (
      type ===
      "slot"
    ) {
      const result =
        await supabase.rpc(
          "update_agenda_slot",
          {
            p_slot_id:
              snapshot.id,

            p_service_id:
              snapshot.serviceId,

            p_start_at:
              startAt,

            p_end_at:
              endAt,
          }
        );

      rpcError =
        result.error;
    }

    if (
      rpcError
    ) {
      console.error(
        "Agenda move RPC error:",
        {
          type,
          eventId,
          error:
            rpcError,
        }
      );

      return rpcErrorResponse(
        rpcError
      );
    }

    /*
* ==========================================================
* GOOGLE CALENDAR
* ==========================================================
*
* Solo las reservas online tienen actualmente
* sincronización con Google Calendar.
*/

if (
type ===
"booking"
) {
try {
  await updateBookingGoogleCalendarEvent(
    snapshot.id
  );
} catch (
  calendarError
) {
  console.error(
    "Agenda booking moved but Google Calendar sync failed:",
    calendarError
  );
}
}

if (
type ===
"manual"
) {
try {
  await updateManualBookingGoogleCalendarEvent(
    snapshot.id
  );
} catch (
  calendarError
) {
  console.error(
    "Manual booking moved but Google Calendar sync failed:",
    calendarError
  );
}
}

if (
type ===
"block"
) {
try {
  await updateBlockGoogleCalendarEvent(
    snapshot.id
  );
} catch (
  calendarError
) {
  console.error(
    "Agenda block moved but Google Calendar sync failed:",
    calendarError
  );
}
}

    /*
     * ==========================================================
     * AUDITORÍA ADMINISTRATIVA
     * ==========================================================
     */

    if (
      isAdmin
    ) {
      let action =
        "AGENDA_EVENT_MOVED";

      let entityType =
        "AGENDA_EVENT";

      if (
        type ===
        "booking"
      ) {
        action =
          "BOOKING_RESCHEDULED";

        entityType =
          "BOOKING";
      }

      if (
        type ===
        "manual"
      ) {
        action =
          "MANUAL_BOOKING_MOVED";

        entityType =
          "MANUAL_BOOKING";
      }

      if (
        type ===
        "block"
      ) {
        action =
          "BUSINESS_BLOCK_MOVED";

        entityType =
          "BUSINESS_BLOCK";
      }

      if (
        type ===
        "slot"
      ) {
        action =
          "AGENDA_SLOT_MOVED";

        entityType =
          "SLOT";
      }

      try {
        await writeAdminAuditLog({
          adminUserId:
            user.id,

          action,

          entityType,

          entityId:
            snapshot.id,

          businessId:
            business.id,

          targetUserId:
            business.owner_id,

          description:
            `Se modificó el horario de un evento de la agenda de ${business.name}.`,

          oldValues: {
            type,

            start_at:
              snapshot.startAt,

            end_at:
              snapshot.endAt,
          },

          newValues: {
            type,

            start_at:
              startAt,

            end_at:
              endAt,
          },
        });
      } catch (
        auditError
      ) {
        /*
         * La modificación ya se ha realizado.
         * No devolvemos error al navegador por un fallo
         * posterior escribiendo la auditorÃ­a.
         */

        console.error(
          "Error writing agenda move admin audit:",
          auditError
        );
      }
    }

    /*
     * ==========================================================
     * RESPUESTA
     * ==========================================================
     */

    return NextResponse.json({
      success:
        true,

      type,

      eventId:
        snapshot.id,

      businessId:
        business.id,

      previousStartAt:
        snapshot.startAt,

      previousEndAt:
        snapshot.endAt,

      newStartAt:
        startAt,

      newEndAt:
        endAt,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected agenda move error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al modificar la agenda.",
      },
      {
        status:
          500,
      }
    );
  }
}
