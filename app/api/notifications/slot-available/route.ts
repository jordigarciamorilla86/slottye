import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const resend =
  new Resend(
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
     * USUARIO AUTENTICADO
     * ==========================================================
     */

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "No autorizado",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ==========================================================
     * BOOKING
     * ==========================================================
     *
     * No recibimos businessId / slotId directamente.
     *
     * Recibimos bookingId y verificamos todo
     * desde servidor.
     */

    const {
      bookingId,
    }: {
      bookingId: string;
    } =
      await request.json();

    if (!bookingId) {
      return NextResponse.json(
        {
          error:
            "Falta bookingId",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================================
     * COMPROBAR RESERVA CANCELADA
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
          ),

          services (
            id,
            name
          ),

          slots (
            id,
            start_at,
            status
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
     * Solo el usuario que tenía esa reserva
     * puede provocar este aviso.
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
     * Debe estar realmente cancelada por
     * el usuario.
     */

    if (
      booking.status !==
      "CANCELLED_BY_USER"
    ) {
      return NextResponse.json(
        {
          error:
            "La reserva no está cancelada por el usuario",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Normalizamos relaciones.
     */

    const business =
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
        ? booking.services[0] ??
          null
        : booking.services;

    const slot =
      Array.isArray(
        booking.slots
      )
        ? booking.slots[0] ??
          null
        : booking.slots;

    if (
      !business ||
      !slot
    ) {
      return NextResponse.json(
        {
          error:
            "Datos de reserva incompletos",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================================
     * COMPROBACIONES DEL SLOT
     * ==========================================================
     */

    /*
     * La cancelación debería haber dejado
     * el slot AVAILABLE.
     */

    if (
      slot.status !==
      "AVAILABLE"
    ) {
      return NextResponse.json({
        sent: 0,
        reason:
          "El hueco ya no está disponible",
      });
    }

    /*
     * No notificamos huecos pasados.
     */

    if (
      new Date(
        slot.start_at
      ) <= new Date()
    ) {
      return NextResponse.json({
        sent: 0,
        reason:
          "El hueco ya ha pasado",
      });
    }

    /*
     * El negocio debe seguir activo.
     */

    if (
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
          booking.business_id
        )
        .eq(
          "email_enabled",
          true
        )
        /*
         * No enviamos al usuario
         * que acaba de cancelar.
         */
        .neq(
          "user_id",
          user.id
        );

    if (
      subscriptionsError
    ) {
      console.error(
        "Error loading subscriptions:",
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
     * DATOS DEL EMAIL
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
      );

    let sent = 0;

    /*
     * ==========================================================
     * ENVIAR
     * ==========================================================
     */

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
       * Creamos una notificación individual.
       */

      const {
        data: notification,
        error:
          notificationError,
      } =
        await admin
          .from(
            "notifications"
          )
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
                slot.id,

              booking_id:
                booking.id,

              service_id:
                booking.service_id,

              business_slug:
                business.slug,

              start_at:
                slot.start_at,

              reason:
                "USER_CANCELLATION",
            },
          })
          .select("id")
          .single();

      if (
        notificationError ||
        !notification
      ) {
        console.error(
          "Error creating notification:",
          notificationError
        );

        continue;
      }

      /*
       * ========================================================
       * EMAIL
       * ========================================================
       */

      const result =
        await resend.emails.send(
          {
            from:
              "Slottye <onboarding@resend.dev>",

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

          /*
           * Evita mandar dos veces el mismo
           * email al mismo suscriptor para
           * esta cancelación.
           */
          {
            idempotencyKey:
              `slot-available/${booking.id}/${subscription.user_id}`,
          }
        );

      /*
       * ========================================================
       * RESULTADO
       * ========================================================
       */

      if (result.error) {
        console.error(
          "Error sending slot available email:",
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
        slot.id,

      businessId:
        business.id,
    });
  } catch (error) {
    console.error(
      "Slot available notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error enviando notificaciones de disponibilidad",
      },
      {
        status: 500,
      }
    );
  }
}