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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

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
     *
     * Esta ruta puede enviar hasta dos emails mediante Resend,
     * por lo que limitamos las llamadas por usuario autenticado.
     */

    const rateLimit =
      await checkRateLimit({
        identifier:
          user.id,

        prefix:
          "booking-confirmed",

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

    const admin = createAdminClient();

    /*
     * Cargamos toda la información necesaria.
     */
    const { data: booking, error: bookingError } =
      await admin
        .from("bookings")
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
            email,
            address,
            city,
            owner_id
          ),

          profiles (
            name,
            email
          )
        `)
        .eq("id", bookingId)
        .maybeSingle();

    if (
      bookingError
    ) {
      console.error(
        "Error loading booking:",
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
     * El usuario que llama a esta API
     * debe ser quien hizo la reserva.
     */
    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "La reserva no está confirmada" },
        { status: 400 }
      );
    }

    const clientProfile =
      Array.isArray(booking.profiles)
        ? booking.profiles[0]
        : booking.profiles;

    const business =
      Array.isArray(booking.businesses)
        ? booking.businesses[0]
        : booking.businesses;

    const service =
      Array.isArray(booking.services)
        ? booking.services[0]
        : booking.services;

    const slot =
      Array.isArray(booking.slots)
        ? booking.slots[0]
        : booking.slots;

    if (
      !clientProfile?.email ||
      !business ||
      !slot?.start_at
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan datos para enviar la confirmación",
        },
        { status: 400 }
      );
    }

    /*
     * Buscamos también el email del propietario
     * como alternativa al email público del negocio.
     */
    let ownerEmail: string | null = null;

    if (
      business.owner_id
    ) {
      const {
        data:
          ownerProfile,
        error:
          ownerProfileError,
      } =
        await admin
          .from(
            "profiles"
          )
          .select(
            "email"
          )
          .eq(
            "id",
            business.owner_id
          )
          .maybeSingle();

      if (
        ownerProfileError
      ) {
        console.error(
          "Error loading business owner email:",
          ownerProfileError
        );
      } else {
        ownerEmail =
          ownerProfile?.email ??
          null;
      }
    }

    const businessEmail =
      business.email || ownerEmail;

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
          timeZone: "Europe/Madrid",
        }
      ).format(
        new Date(slot.start_at)
      );

    const serviceName =
      service?.name ?? "Cita";

    const fullAddress = [
      business.address,
      business.city,
    ]
      .filter(Boolean)
      .join(" · ");

    /*
     * Evitamos duplicar la confirmación
     * si la llamada se repite.
     */
    const {
      data:
        existingNotification,
      error:
        existingNotificationError,
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
          "BOOKING_CONFIRMATION"
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
      existingNotificationError
    ) {
      console.error(
        "Error checking existing booking confirmation:",
        existingNotificationError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el estado de la notificación.",
        },
        {
          status:
            500,
        }
      );
    }

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

    /*
     * Creamos la notificación del cliente.
     */
    const {
      data: notification,
      error: notificationError,
    } = await admin
      .from("notifications")
      .insert({
        user_id: booking.user_id,
        business_id: booking.business_id,
        booking_id: booking.id,
        type: "BOOKING_CONFIRMATION",
        status: "PENDING",
        subject: `Cita confirmada en ${business.name}`,
        metadata: {
          service: serviceName,
          start_at: slot.start_at,
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
        return NextResponse.json({
          success:
            true,

          duplicate:
            true,
        });
      }

      console.error(
        "Error creating notification:",
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
          "Error marking booking confirmation as FAILED:",
          failedStatusError
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

    /*
     * ======================================================
     * EMAIL AL CLIENTE
     * ======================================================
     */

    const clientResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from:
            "Slottye <reservas@slottye.com>",

          to: [
            clientProfile.email,
          ],

          subject:
            `Cita confirmada en ${business.name}`,

          html: `
            <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
              <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-sizing:border-box;">

                <div style="text-align:center;margin-bottom:30px;">
                  <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                    <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                  </div>
                </div>

                <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                  ¡Tu cita está confirmada!
                </h1>

                <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Hola ${clientProfile.name ?? ""},
                </p>

                <p style="margin:0 0 28px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Tu reserva en <strong style="color:#17171c;">${business.name}</strong> se ha realizado correctamente.
                </p>

                <div style="margin:24px 0;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                  <div style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.7px;color:#15803d;">
                    DATOS DE LA CITA
                  </div>

                  <div style="font-size:17px;font-weight:800;line-height:1.4;color:#17171c;">
                    ${serviceName}
                  </div>

                  <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#3f4652;">
                    <strong>Fecha y hora:</strong><br>
                    ${formattedDate}
                    ${
                      fullAddress
                        ? `<br><br><strong>Dirección:</strong><br>${fullAddress}`
                        : ""
                    }
                  </div>
                </div>

                <div style="text-align:center;margin:30px 0;">
                  <a
                    href="${baseUrl}/account/bookings"
                    style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                  >
                    Ver mis citas
                  </a>
                </div>

                <p style="margin:0 0 10px;text-align:center;font-size:14px;line-height:1.6;color:#60646f;">
                  También te enviaremos un recordatorio antes de la cita.
                </p>

                <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                  Puedes consultar o cancelar la reserva desde <strong>Mi Slottye → Mis citas</strong>.
                </p>

                <div style="margin-top:32px;padding-top:22px;border-top:1px solid #eeeeee;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9a9da6;">
                    © 2026 <span style="color:#6c55f7;font-weight:700;">Slotty</span><span style="color:#22c55e;font-weight:700;">e</span>
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
      !clientResponse.ok
    ) {
      console.error(
        "Resend client confirmation error:",
        {
          status:
            clientResponse.status,

          statusText:
            clientResponse.statusText ||
            null,

          bookingId:
            booking.id,
        }
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
          "Client email failed and confirmation could not be marked FAILED:",
          failedStatusError
        );
      }

      return NextResponse.json(
        {
          error:
            "La reserva existe pero no se pudo enviar el email al cliente.",
        },
        {
          status:
            502,
        }
      );
    }

    /*
     * La confirmación del cliente ya está enviada.
     */

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
       * El email YA ha salido.
       * Registramos el fallo, pero no provocamos un reintento
       * que pudiera enviar un segundo correo al cliente.
       */

      console.error(
        "Client confirmation email sent but notification could not be marked SENT:",
        sentStatusError
      );
    }

    /*
     * ======================================================
     * EMAIL AL NEGOCIO
     * ======================================================
     */

    let businessEmailSent = false;

    if (businessEmail) {
      const businessResponse =
        await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${resendApiKey}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              from:
                "Slottye <reservas@slottye.com>",

              to: [
                businessEmail,
              ],

              subject:
                `Nueva reserva en Slottye · ${serviceName}`,

              html: `
                <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-sizing:border-box;">

                    <div style="text-align:center;margin-bottom:30px;">
                      <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                        <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                      </div>
                    </div>

                    <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                      Nueva reserva recibida
                    </h1>

                    <p style="margin:0 0 28px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                      Has recibido una nueva reserva a través de Slottye.
                    </p>

                    <div style="margin:24px 0;padding:20px;background:#f3e8ff;border:1px solid #e9d5ff;border-radius:12px;">
                      <div style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.7px;color:#6d28d9;">
                        DATOS DE LA RESERVA
                      </div>

                      <div style="font-size:17px;font-weight:800;line-height:1.4;color:#17171c;">
                        ${serviceName}
                      </div>

                      <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#3f4652;">
                        <strong>Fecha y hora:</strong><br>
                        ${formattedDate}
                        <br><br>
                        <strong>Cliente:</strong><br>
                        ${clientProfile.name ?? "Cliente"}
                        <br>
                        ${clientProfile.email}
                      </div>
                    </div>

                    <div style="text-align:center;margin:30px 0;">
                      <a
                        href="${baseUrl}/business-dashboard/agenda"
                        style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                      >
                        Gestionar reserva
                      </a>
                    </div>

                    <p style="margin:0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                      También puedes gestionarla desde <strong>Mi panel → Agenda</strong>.
                    </p>

                    <div style="margin-top:32px;padding-top:22px;border-top:1px solid #eeeeee;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#9a9da6;">
                        © 2026 <span style="color:#6c55f7;font-weight:700;">Slotty</span><span style="color:#22c55e;font-weight:700;">e</span>
                        · Reserva. Confirma. Listo.
                      </p>
                    </div>

                  </div>
                </div>
              `,
            }),
          }
        );

      businessEmailSent =
        businessResponse.ok;

      if (
        !businessResponse.ok
      ) {
        console.error(
          "Resend business confirmation error:",
          {
            status:
              businessResponse.status,

            statusText:
              businessResponse.statusText ||
              null,

            bookingId:
              booking.id,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      clientEmailSent: true,
      businessEmailSent,
    });
  } catch (error) {
    console.error(
      "Booking confirmation notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error enviando la confirmación",
      },
      { status: 500 }
    );
  }
}