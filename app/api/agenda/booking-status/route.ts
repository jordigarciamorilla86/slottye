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
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
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
        return NextResponse.json(
          {
            error:
              rpcError.message,
          },
          {
            status:
              400,
          }
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