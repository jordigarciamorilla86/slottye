import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";


const resend = new Resend(
  process.env.RESEND_API_KEY
);

type RequestBody = {
  bookingId?: unknown;
  oldSlotId?: unknown;
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
     * ==========================================================
     * USUARIO
     * ==========================================================
     */

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error: "No autorizado",
        },
        {
          status: 401,
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

    const bookingId =
      typeof bodyResult.data
        .bookingId ===
        "string"
        ? bodyResult.data
            .bookingId.trim()
        : "";

    const oldSlotId =
      typeof bodyResult.data
        .oldSlotId ===
        "string"
        ? bodyResult.data
            .oldSlotId.trim()
        : "";

    if (
      !bookingId ||
      !oldSlotId
    ) {
      return NextResponse.json(
        {
          error:
            "Datos incompletos",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isUuid(
        bookingId
      ) ||
      !isUuid(
        oldSlotId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Los identificadores de la reserva o del hueco no son válidos.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================================
     * RATE LIMIT
     * ==========================================================
     */

    const rateLimit =
      await checkRateLimit({
        identifier:
          user.id,

        prefix:
          "rescheduled-slot-available",

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
     * ==========================================================
     * RESERVA ACTUAL
     * ==========================================================
     */

    const {
      data: booking,
      error: bookingError,
    } =
      await admin
        .from("bookings")
        .select(`
          id,
          user_id,
          business_id,
          service_id,
          slot_id,
          status,

          businesses (
            id,
            name,
            slug,
            active
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
        "Error loading booking for rescheduled slot notification:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la reserva",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !booking
    ) {
      return NextResponse.json(
        {
          error:
            "Reserva no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Solo el propietario de la reserva.
     */

    if (
      booking.user_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Reserva no autorizada",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * La reserva debe seguir activa.
     */

    if (
      booking.status !==
      "CONFIRMED"
    ) {
      return NextResponse.json(
        {
          error:
            "La reserva no está confirmada",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * El slot antiguo no puede ser
     * el slot nuevo.
     */

    if (
      booking.slot_id ===
      oldSlotId
    ) {
      return NextResponse.json(
        {
          sent: 0,
          reason:
            "La cita no ha cambiado de hueco",
        }
      );
    }

    /*
     * ==========================================================
     * SLOT LIBERADO
     * ==========================================================
     */

    const {
      data: oldSlot,
      error: slotError,
    } =
      await admin
        .from("slots")
        .select(`
          id,
          business_id,
          service_id,
          start_at,
          status,

          services (
            id,
            name
          )
        `)
        .eq(
          "id",
          oldSlotId
        )
        .maybeSingle();

    if (
      slotError
    ) {
      console.error(
        "Error loading previous slot for rescheduled slot notification:",
        slotError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el hueco anterior",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !oldSlot
    ) {
      return NextResponse.json(
        {
          error:
            "No se ha encontrado el hueco anterior",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Debe pertenecer al mismo negocio.
     */

    if (
      oldSlot.business_id !==
      booking.business_id
    ) {
      return NextResponse.json(
        {
          error:
            "El hueco no pertenece al negocio de la reserva",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Y al mismo servicio.
     */

    if (
      oldSlot.service_id !==
      booking.service_id
    ) {
      return NextResponse.json(
        {
          error:
            "El hueco no pertenece al servicio de la reserva",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Debe haber quedado AVAILABLE.
     */

    if (
      oldSlot.status !==
      "AVAILABLE"
    ) {
      return NextResponse.json({
        sent: 0,
        reason:
          "El hueco anterior ya no está disponible",
      });
    }

    /*
     * No avisamos de citas pasadas.
     */

    if (
      new Date(
        oldSlot.start_at
      ) <= new Date()
    ) {
      return NextResponse.json({
        sent: 0,
        reason:
          "El hueco anterior ya ha pasado",
      });
    }

    /*
     * ==========================================================
     * NEGOCIO
     * ==========================================================
     */

    const business =
      Array.isArray(
        booking.businesses
      )
        ? booking.businesses[0] ??
          null
        : booking.businesses;

    if (
      !business ||
      !business.active
    ) {
      return NextResponse.json({
        sent: 0,
        reason:
          "Negocio inactivo",
      });
    }

    /*
     * ==========================================================
     * SERVICIO
     * ==========================================================
     */

    const service =
      Array.isArray(
        oldSlot.services
      )
        ? oldSlot.services[0] ??
          null
        : oldSlot.services;

    /*
     * ==========================================================
     * SUSCRIPTORES
     * ==========================================================
     */

    const {
      data: subscriptions,
      error:
        subscriptionsError,
    } =
      await admin
        .from(
          "business_subscriptions"
        )
        .select(`
          user_id,

          profiles (
            email,
            name
          )
        `)
        .eq(
          "business_id",
          business.id
        )
        .eq(
          "email_enabled",
          true
        )
        /*
         * El usuario que acaba de cambiar
         * la cita no necesita el aviso.
         */
        .neq(
          "user_id",
          user.id
        );

    if (
      subscriptionsError
    ) {
      console.error(
        "Error cargando suscriptores:",
        subscriptionsError
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron cargar los suscriptores",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !subscriptions?.length
    ) {
      return NextResponse.json({
        sent: 0,
      });
    }

    /*
     * ==========================================================
     * EMAIL
     * ==========================================================
     */

    const baseUrl =
      process.env
        .NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const formattedDate =
      new Intl.DateTimeFormat(
        "es-ES",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone:
            "Europe/Madrid",
        }
      ).format(
        new Date(
          oldSlot.start_at
        )
      );

    let sent = 0;

    for (
      const subscription of
      subscriptions
    ) {
      const subscriberProfile =
        Array.isArray(
          subscription.profiles
        )
          ? subscription
              .profiles[0] ??
            null
          : subscription.profiles;

      if (
        !subscriberProfile?.email
      ) {
        continue;
      }

      /*
       * Creamos notificación.
       */

      const {
        data: notification,
        error:
          notificationError,
      } =
        await admin
          .from("notifications")
          .insert({
            user_id:
              subscription.user_id,

            business_id:
              business.id,

            type:
              "SLOT_AVAILABLE",

            status:
              "PENDING",

            subject:
              `Se ha liberado una cita en ${business.name}`,

            metadata: {
              slot_id:
                oldSlot.id,

              booking_id:
                booking.id,

              service_id:
                booking.service_id,

              business_slug:
                business.slug,

              start_at:
                oldSlot.start_at,

              reason:
                "BOOKING_RESCHEDULED",
            },
          })
          .select("id")
          .single();

      if (
        notificationError
      ) {
        if (
          notificationError.code ===
          "23505"
        ) {
          /*
           * Ya existe una notificación activa para
           * esta misma liberación concreta.
           */
          continue;
        }

        console.error(
          "Error creando notificación:",
          notificationError
        );

        continue;
      }

      if (
        !notification
      ) {
        console.error(
          "Notification insert returned no row."
        );

        continue;
      }

      /*
       * Enviar correo.
       */

      const result =
        await resend.emails.send(
          {
            from:
              "Slottye <reservas@slottye.com>",

            to:
              subscriberProfile.email,

            subject:
              `Nueva cita disponible en ${business.name}`,

            html: `
              <div
                style="
                  margin:0;
                  padding:40px 20px;
                  background:#f6f7fb;
                  font-family:Arial,Helvetica,sans-serif;
                  color:#17171c;
                "
              >
                <div
                  style="
                    max-width:560px;
                    margin:0 auto;
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-radius:16px;
                    padding:40px;
                  "
                >
                  <div
                    style="
                      text-align:center;
                      margin-bottom:30px;
                    "
                  >
                    <div
                      style="
                        font-size:32px;
                        font-weight:800;
                        letter-spacing:0.5px;
                      "
                    >
                      <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                    </div>
                  </div>

                  <h1
                    style="
                      margin:0 0 16px;
                      text-align:center;
                      font-size:24px;
                      line-height:1.3;
                      color:#17171c;
                    "
                  >
                    Se ha liberado una cita
                  </h1>

                  <p
                    style="
                      margin:0 0 12px;
                      text-align:center;
                      font-size:15px;
                      line-height:1.6;
                      color:#60646f;
                    "
                  >
                    Hola${
                      subscriberProfile.name
                        ? ` ${subscriberProfile.name}`
                        : ""
                    },
                  </p>

                  <p
                    style="
                      margin:0 0 28px;
                      text-align:center;
                      font-size:15px;
                      line-height:1.6;
                      color:#60646f;
                    "
                  >
                    Se acaba de liberar una cita en
                    <strong style="color:#17171c;">${business.name}</strong>.
                  </p>

                  <div
                    style="
                      margin:24px 0;
                      padding:20px;
                      background:#f0fdf4;
                      border:1px solid #bbf7d0;
                      border-radius:12px;
                    "
                  >
                    <div
                      style="
                        margin-bottom:10px;
                        font-size:12px;
                        font-weight:700;
                        letter-spacing:0.5px;
                        color:#166534;
                      "
                    >
                      CITA DISPONIBLE
                    </div>

                    ${
                      service?.name
                        ? `
                          <div
                            style="
                              font-size:16px;
                              font-weight:700;
                              color:#17171c;
                            "
                          >
                            ${service.name}
                          </div>
                        `
                        : ""
                    }

                    <div
                      style="
                        margin-top:14px;
                        font-size:15px;
                        line-height:1.6;
                        color:#30343b;
                      "
                    >
                      📅 ${formattedDate}
                    </div>
                  </div>

                  <div
                    style="
                      text-align:center;
                      margin:30px 0;
                    "
                  >
                    <a
                      href="${baseUrl}/business/${business.slug}"
                      style="
                        display:inline-block;
                        background:#6c55f7;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                        padding:14px 26px;
                        border-radius:10px;
                      "
                    >
                      Reservar esta cita
                    </a>
                  </div>

                  <p
                    style="
                      margin:28px 0 0;
                      text-align:center;
                      font-size:13px;
                      line-height:1.6;
                      color:#8a8f9c;
                    "
                  >
                    Este horario vuelve a estar disponible y puede reservarlo cualquier usuario.
                  </p>

                  <p
                    style="
                      margin:16px 0 0;
                      text-align:center;
                      font-size:13px;
                      line-height:1.6;
                      color:#8a8f9c;
                    "
                  >
                    Recibes este correo porque estás suscrito a ${business.name} en Slottye.
                  </p>

                  <div
                    style="
                      margin-top:32px;
                      padding-top:22px;
                      border-top:1px solid #eeeeee;
                      text-align:center;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:12px;
                        color:#9a9da6;
                      "
                    >
                      © 2026
                      <span style="color:#6c55f7;font-weight:700;">Slotty</span><span style="color:#22c55e;font-weight:700;">e</span>
                      · Reserva. Confirma. Listo.
                    </p>
                  </div>
                </div>
              </div>
            `,
          },
          {
            idempotencyKey:
              `rescheduled-slot/${booking.id}/${oldSlot.id}/${subscription.user_id}`,
          }
        );

      if (result.error) {
        console.error(
          "Error enviando aviso de hueco liberado:",
          result.error
        );

        const {
          error:
            failedStatusError,
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
          failedStatusError
        ) {
          console.error(
            "Rescheduled slot email failed and notification could not be marked FAILED:",
            failedStatusError
          );
        }

        continue;
      }

      const {
        error:
          sentStatusError,
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
        sentStatusError
      ) {
        /*
         * El email ya se ha enviado.
         * Registramos el fallo interno, pero no intentamos
         * reenviarlo aquí.
         */
        console.error(
          "Rescheduled slot email sent but notification could not be marked SENT:",
          sentStatusError
        );
      }

      sent++;
    }

    return NextResponse.json({
      sent,
      slotId:
        oldSlot.id,
    });
  } catch (error) {
    console.error(
      "Rescheduled slot notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error enviando avisos de disponibilidad",
      },
      {
        status: 500,
      }
    );
  }
}