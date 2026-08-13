import {
  NextResponse,
} from "next/server";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";

import {
  createClient,
} from "@/lib/supabase/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

type RequestBody = {
  bookingId?: unknown;
};

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const admin =
      createAdminClient();

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

    const bookingId =
      typeof bodyResult.data
        .bookingId ===
        "string"
        ? bodyResult.data
            .bookingId.trim()
        : "";

    if (
      !bookingId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta bookingId.",
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

    /*
     * ============================================================
     * RATE LIMIT
     * ============================================================
     */

    const rateLimit =
      await checkRateLimit({
        identifier:
          user.id,

        prefix:
          "booking-cancelled",

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
     * RESERVA
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
          user_id,
          business_id,
          status,

          businesses (
            name
          ),

          services (
            name
          ),

          slots (
            start_at
          ),

          profiles (
            email,
            name
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
        "Error loading booking for cancellation notification:",
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
            "Reserva no encontrada.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * AUTORIZACIÓN
     * ============================================================
     *
     * Puede enviar esta notificación:
     *
     * - el propietario del negocio;
     * - un administrador de Slottye.
     */

    const [
      businessResult,
      adminProfileResult,
    ] =
      await Promise.all([
        admin
          .from(
            "businesses"
          )
          .select(`
            id,
            owner_id
          `)
          .eq(
            "id",
            booking.business_id
          )
          .maybeSingle(),

        admin
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
          .maybeSingle(),
      ]);

    if (
      businessResult.error
    ) {
      console.error(
        "Error checking cancellation business:",
        businessResult.error
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
      adminProfileResult.error
    ) {
      console.error(
        "Error checking cancellation administrator:",
        adminProfileResult.error
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la autorización.",
        },
        {
          status:
            500,
        }
      );
    }

    const businessAuthorization =
      businessResult.data;

    const isOwner =
      businessAuthorization
        ?.owner_id ===
      user.id;

    const isAdmin =
      adminProfileResult.data
        ?.is_admin ===
      true;

    if (
      !businessAuthorization ||
      (
        !isOwner &&
        !isAdmin
      )
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

    const cancellationActor:
      | "business"
      | "admin" =
      isAdmin
        ? "admin"
        : "business";

    /*
     * ============================================================
     * DATOS RELACIONADOS
     * ============================================================
     */

    const profile =
      Array.isArray(
        booking.profiles
      )
        ? booking
            .profiles[0] ??
          null
        : booking.profiles;

    const businessData =
      Array.isArray(
        booking.businesses
      )
        ? booking
            .businesses[0] ??
          null
        : booking.businesses;

    const service =
      Array.isArray(
        booking.services
      )
        ? booking
            .services[0] ??
          null
        : booking.services;

    const slot =
      Array.isArray(
        booking.slots
      )
        ? booking
            .slots[0] ??
          null
        : booking.slots;

    if (
      !profile?.email
    ) {
      return NextResponse.json(
        {
          error:
            "El cliente no tiene email.",
        },
        {
          status:
            400,
        }
      );
    }

    const businessName =
      businessData?.name ??
      "el negocio";

    const serviceName =
      service?.name ??
      "tu cita";

    const formattedDate =
      slot?.start_at
        ? new Intl.DateTimeFormat(
            "es-ES",
            {
              weekday:
                "long",

              day:
                "numeric",

              month:
                "long",

              year:
                "numeric",

              hour:
                "2-digit",

              minute:
                "2-digit",

              timeZone:
                "Europe/Madrid",
            }
          ).format(
            new Date(
              slot.start_at
            )
          )
        : "";

    /*
     * ============================================================
     * CREAR NOTIFICACIÓN
     * ============================================================
     *
     * El índice parcial:
     *
     * notifications_booking_cancellation_unique_active
     *
     * impide tener dos BOOKING_CANCELLATION activas
     * (PENDING/SENT) para la misma reserva.
     */

    const {
      data:
        notification,
      error:
        notificationError,
    } =
      await admin
        .from(
          "notifications"
        )
        .insert({
          user_id:
            booking.user_id,

          business_id:
            booking.business_id,

          booking_id:
            booking.id,

          type:
            "BOOKING_CANCELLATION",

          status:
            "PENDING",
        })
        .select(
          "id"
        )
        .single();

    if (
      notificationError
    ) {
      /*
       * PostgreSQL 23505:
       * ya existe una notificación activa.
       *
       * Consideramos la operación idempotente.
       */

      if (
        notificationError.code ===
        "23505"
      ) {
        return NextResponse.json({
          success:
            true,

          alreadySent:
            true,
        });
      }

      console.error(
        "Cancellation notification insert error:",
        notificationError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la notificación.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !notification
    ) {
      return NextResponse.json(
        {
          error:
            "No se pudo crear la notificación.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * RESEND
     * ============================================================
     */

    const resendApiKey =
      process.env
        .RESEND_API_KEY;

    if (
      !resendApiKey
    ) {
      console.error(
        "RESEND_API_KEY is not configured."
      );

      const {
        error:
          failedUpdateError,
      } =
        await admin
          .from(
            "notifications"
          )
          .update({
            status:
              "FAILED",
          })
          .eq(
            "id",
            notification.id
          );

      if (
        failedUpdateError
      ) {
        console.error(
          "Error marking cancellation notification as FAILED:",
          failedUpdateError
        );
      }

      return NextResponse.json(
        {
          error:
            "El servicio de correo no está configurado.",
        },
        {
          status:
            500,
        }
      );
    }

    const baseUrl =
      process.env
        .NEXT_PUBLIC_APP_URL ??
      "https://slottye.com";

    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${resendApiKey}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              from:
                "Slottye <reservas@slottye.com>",

              to: [
                profile.email,
              ],

              subject:
                `Tu cita en ${businessName} ha sido cancelada`,

              html: `
                <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-sizing:border-box;">

                    <div style="text-align:center;margin-bottom:30px;">
                      <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                        <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                      </div>
                    </div>

                    <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                      Tu cita ha sido cancelada
                    </h1>

                    <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                      Hola ${profile.name ?? ""},
                    </p>

                    <p style="margin:0 0 28px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                      ${
                        cancellationActor ===
                        "admin"
                          ? `Un administrador de Slottye ha cancelado tu cita en <strong style="color:#17171c;">${businessName}</strong>.`
                          : `<strong style="color:#17171c;">${businessName}</strong> ha cancelado tu cita.`
                      }
                    </p>

                    <div style="margin:24px 0;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;">
                      <div style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.7px;color:#b91c1c;">
                        CITA CANCELADA
                      </div>

                      <div style="font-size:17px;font-weight:800;line-height:1.4;color:#17171c;">
                        ${serviceName}
                      </div>

                      ${
                        formattedDate
                          ? `
                            <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#3f4652;">
                              <strong>Fecha y hora:</strong>
                              <br>
                              ${formattedDate}
                            </div>
                          `
                          : ""
                      }
                    </div>

                    <div style="text-align:center;margin:30px 0;">
                      <a
                        href="${baseUrl}/"
                        style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                      >
                        Buscar otra cita
                      </a>
                    </div>

                    <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                      Puedes entrar en Slottye para consultar otras citas disponibles.
                    </p>

                    <div style="margin-top:32px;padding-top:22px;border-top:1px solid #eeeeee;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#9a9da6;">
                        © 2026
                        <span style="color:#6c55f7;font-weight:700;">Slotty</span><span style="color:#22c55e;font-weight:700;">e</span>
                        · Reserva. Confirma. Listo.
                      </p>
                    </div>

                  </div>
                </div>
              `,
            }),
        }
      );

    /*
     * ============================================================
     * ERROR DE ENVÍO
     * ============================================================
     */

    if (
      !resendResponse.ok
    ) {
      console.error(
        "Resend cancellation email failed:",
        {
          status:
            resendResponse.status,

          statusText:
            resendResponse.statusText ||
            null,

          bookingId:
            booking.id,
        }
      );

      const {
        error:
          failedUpdateError,
      } =
        await admin
          .from(
            "notifications"
          )
          .update({
            status:
              "FAILED",
          })
          .eq(
            "id",
            notification.id
          );

      if (
        failedUpdateError
      ) {
        console.error(
          "Error marking cancellation notification as FAILED:",
          failedUpdateError
        );
      }

      return NextResponse.json(
        {
          error:
            "No se pudo enviar el email.",
        },
        {
          status:
            502,
        }
      );
    }

    /*
     * ============================================================
     * MARCAR COMO ENVIADA
     * ============================================================
     */

    const {
      error:
        sentUpdateError,
    } =
      await admin
        .from(
          "notifications"
        )
        .update({
          status:
            "SENT",

          sent_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          notification.id
        );

    if (
      sentUpdateError
    ) {
      /*
       * El correo YA se ha enviado.
       * No devolvemos un error que pueda provocar
       * un reintento y un segundo correo.
       */

      console.error(
        "Email sent but cancellation notification could not be marked as SENT:",
        sentUpdateError
      );
    }

    return NextResponse.json({
      success:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Booking cancellation notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al enviar la notificación.",
      },
      {
        status:
          500,
      }
    );
  }
}