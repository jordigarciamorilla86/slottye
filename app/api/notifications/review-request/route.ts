import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type RequestBody = {
  bookingId?:
    string;
};

export async function POST(
  request:
    Request
) {
  try {
    const supabase =
      await createClient();

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
            "No autorizado",
        },
        {
          status:
            401,
        }
      );
    }

    const {
      bookingId,
    } =
      (
        await request.json()
      ) as RequestBody;

    if (
      !bookingId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta bookingId",
        },
        {
          status:
            400,
        }
      );
    }

    const admin =
      createAdminClient();

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
          service_id,
          status,

          slots (
            start_at,
            end_at
          ),

          services (
            name,
            duration_minutes
          ),

          businesses (
            id,
            name,
            slug,
            owner_id
          ),

          profiles (
            name,
            email
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
      console.error(
        "Error loading completed booking:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "Reserva no encontrada",
        },
        {
          status:
            404,
        }
      );
    }

    const business =
      Array.isArray(
        booking.businesses
      )
        ? booking.businesses[0]
        : booking.businesses;

    const clientProfile =
      Array.isArray(
        booking.profiles
      )
        ? booking.profiles[0]
        : booking.profiles;

    const service =
      Array.isArray(
        booking.services
      )
        ? booking.services[0]
        : booking.services;

    const slot =
      Array.isArray(
        booking.slots
      )
        ? booking.slots[0]
        : booking.slots;

    /*
     * La solicitud solo puede enviarla
     * el propietario del negocio.
     */
    if (
      !business ||
      business.owner_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          error:
            "No autorizado",
        },
        {
          status:
            403,
        }
      );
    }

    if (
      booking.status !==
        "COMPLETED"
    ) {
      return NextResponse.json(
        {
          error:
            "La reserva todavía no está completada",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !clientProfile?.email
    ) {
      return NextResponse.json(
        {
          error:
            "El cliente no tiene email",
        },
        {
          status:
            400,
        }
      );
    }

    const serviceName =
      service?.name ??
      "Cita";

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
        : null;

    /*
     * Evitamos enviar varias solicitudes
     * para la misma reserva.
     */
    const {
      data:
        existingNotification,
    } =
      await admin
        .from(
          "notifications"
        )
        .select(
          "id,status"
        )
        .eq(
          "booking_id",
          booking.id
        )
        .eq(
          "user_id",
          booking.user_id
        )
        .eq(
          "type",
          "REVIEW_REQUEST"
        )
        .in(
          "status",
          [
            "PENDING",
            "SENT",
          ]
        )
        .maybeSingle();

    if (
      existingNotification
    ) {
      return NextResponse.json({
        success:
          true,

        duplicate:
          true,
      });
    }

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
            "REVIEW_REQUEST",

          status:
            "PENDING",

          subject:
            `¿Qué tal fue tu visita a ${business.name}?`,

          metadata: {
            service:
              serviceName,

            completed_booking_id:
              booking.id,

            start_at:
              slot?.start_at ??
              null,
          },
        })
        .select(
          "id"
        )
        .single();

    if (
      notificationError ||
      !notification
    ) {
      console.error(
        "Error creating review notification:",
        notificationError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la notificación",
        },
        {
          status:
            500,
        }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://slottye.com";

    const reviewUrl =
      `${siteUrl}/account/bookings?review=${encodeURIComponent(
        booking.id
      )}`;

    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.RESEND_API_KEY}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              from:
                "Slottye <reservas@slottye.com>",

              to: [
                clientProfile.email,
              ],

              subject:
                `¿Qué tal fue tu visita a ${business.name}?`,

              html: `
                <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-sizing:border-box;">

                    <div style="text-align:center;margin-bottom:30px;">
                      <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                        <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                      </div>
                    </div>

                    <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                      ¿Qué tal fue tu visita?
                    </h1>

                    <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                      Hola ${clientProfile.name ?? ""},
                    </p>

                    <p style="margin:0 0 28px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                      Esperamos que tu cita en
                      <strong style="color:#17171c;">${business.name}</strong>
                      haya ido muy bien.
                    </p>

                    <div style="margin:24px 0;padding:20px;background:#faf5ff;border:1px solid #ddd6fe;border-radius:12px;">
                      <div style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.7px;color:#6d28d9;">
                        TU EXPERIENCIA
                      </div>

                      <div style="font-size:17px;font-weight:800;line-height:1.4;color:#17171c;">
                        ${serviceName}
                      </div>

                      ${
                        formattedDate
                          ? `
                            <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#3f4652;">
                              <strong>Fecha y hora:</strong><br>
                              ${formattedDate}
                            </div>
                          `
                          : ""
                      }

                      <div style="margin-top:18px;text-align:center;font-size:28px;letter-spacing:4px;color:#f59e0b;">
                        ★★★★★
                      </div>
                    </div>

                    <p style="margin:0 0 8px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                      Tu opinión ayuda a otros usuarios y al negocio a seguir mejorando.
                    </p>

                    <p style="margin:0;text-align:center;font-size:14px;line-height:1.6;color:#8a8f9c;">
                      Solo te llevará un minuto.
                    </p>

                    <div style="text-align:center;margin:30px 0;">
                      <a
                        href="${reviewUrl}"
                        style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                      >
                        Dejar una reseña
                      </a>
                    </div>

                    <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                      También puedes valorar la cita más adelante desde
                      <strong>Mi Slottye → Mis citas → Historial</strong>.
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

    if (
      !resendResponse.ok
    ) {
      const resendError =
        await resendResponse.text();

      console.error(
        "Resend review request error:",
        resendError
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

      return NextResponse.json(
        {
          error:
            "La reserva se completó, pero no se pudo enviar la solicitud de reseña",
        },
        {
          status:
            500,
        }
      );
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

    return NextResponse.json({
      success:
        true,

      reviewEmailSent:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Review request notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error enviando la solicitud de reseña",
      },
      {
        status:
          500,
      }
    );
  }
}
