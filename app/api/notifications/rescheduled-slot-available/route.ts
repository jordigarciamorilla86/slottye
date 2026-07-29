import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

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
    } =
      await supabase.auth.getUser();

    if (!user) {
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

    const {
      bookingId,
      oldSlotId,
    }: {
      bookingId: string;
      oldSlotId: string;
    } =
      await request.json();

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
      bookingError ||
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
      slotError ||
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
        notificationError ||
        !notification
      ) {
        console.error(
          "Error creando notificación:",
          notificationError
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
                  font-family:Arial,sans-serif;
                  max-width:600px;
                  margin:auto;
                  color:#111827;
                "
              >
                <h1>
                  Se ha liberado una cita
                </h1>

                <p>
                  Hola${
                    subscriberProfile.name
                      ? ` ${subscriberProfile.name}`
                      : ""
                  },
                </p>

                <p>
                  Se acaba de liberar una cita en
                  <strong>${business.name}</strong>.
                </p>

                <div
                  style="
                    margin:24px 0;
                    padding:18px;
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    background:#f9fafb;
                  "
                >
                  ${
                    service?.name
                      ? `
                        <div
                          style="
                            font-size:18px;
                            font-weight:bold;
                            margin-bottom:8px;
                          "
                        >
                          ${service.name}
                        </div>
                      `
                      : ""
                  }

                  <div
                    style="
                      font-size:16px;
                    "
                  >
                    📅 ${formattedDate}
                  </div>
                </div>

                <p>
                  Este horario vuelve a estar disponible
                  y puede reservarlo cualquier usuario.
                </p>

                <p
                  style="
                    margin-top:28px;
                  "
                >
                  <a
                    href="${baseUrl}/business/${business.slug}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#6955ff;
                      color:white;
                      text-decoration:none;
                      border-radius:10px;
                      font-weight:bold;
                    "
                  >
                    Reservar esta cita
                  </a>
                </p>

                <p
                  style="
                    margin-top:30px;
                    font-size:12px;
                    color:#6b7280;
                  "
                >
                  Recibes este correo porque estás
                  suscrito a ${business.name} en Slottye.
                </p>
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

        continue;
      }

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