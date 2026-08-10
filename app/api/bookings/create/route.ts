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
  
  type RequestBody = {
    slotId?: unknown;
  };
  
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
      } =
        await supabase.auth.getUser();
  
      if (
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
       * SLOT
       * ============================================================
       */
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
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
  
      /*
       * ============================================================
       * RESERVAR
       * ============================================================
       *
       * Toda la atomicidad sigue dentro de book_slot:
       *
       * - bloqueo FOR UPDATE;
       * - validaciones;
       * - INSERT booking;
       * - slot → BOOKED.
       */
  
      const {
        data:
          bookingId,
        error,
      } =
        await supabase.rpc(
          "book_slot",
          {
            p_slot_id:
              slotId,
          }
        );
  
      if (
        error
      ) {
        return NextResponse.json(
          {
            error:
              error.message,
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !bookingId
      ) {
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
       * Calendar es un efecto secundario.
       *
       * Una reserva correcta NO debe fallar ni deshacerse porque
       * Google tenga una incidencia.
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
  
      return NextResponse.json({
        bookingId,
        calendarSynced,
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