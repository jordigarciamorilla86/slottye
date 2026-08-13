import {
  NextResponse,
} from "next/server";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type RequestBody = {
  bookingId?: unknown;
  previousStartAt?: unknown;
  previousEndAt?: unknown;
  newStartAt?: unknown;
  newEndAt?: unknown;
};

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
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
    new Date(value)
  );
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

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
            "No autorizado",
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

    const body =
      bodyResult.data;

    const bookingId =
      typeof body.bookingId ===
        "string"
        ? body.bookingId.trim()
        : "";

    const previousStartAt =
      typeof body.previousStartAt ===
        "string"
        ? body.previousStartAt.trim()
        : "";

    const previousEndAt =
      typeof body.previousEndAt ===
        "string"
        ? body.previousEndAt.trim()
        : "";

    const newStartAt =
      typeof body.newStartAt ===
        "string"
        ? body.newStartAt.trim()
        : "";

    const newEndAt =
      typeof body.newEndAt ===
        "string"
        ? body.newEndAt.trim()
        : "";

    if (
      !bookingId ||
      !previousStartAt ||
      !previousEndAt ||
      !newStartAt ||
      !newEndAt
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan datos de la reprogramación",
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
            "El identificador de la reserva no es válido",
        },
        {
          status:
            400,
        }
      );
    }

    const previousStart =
      new Date(previousStartAt);
    const previousEnd =
      new Date(previousEndAt);
    const newStart =
      new Date(newStartAt);
    const newEnd =
      new Date(newEndAt);

    if (
      Number.isNaN(
        previousStart.getTime()
      ) ||
      Number.isNaN(
        previousEnd.getTime()
      ) ||
      Number.isNaN(
        newStart.getTime()
      ) ||
      Number.isNaN(
        newEnd.getTime()
      ) ||
      previousEnd <=
        previousStart ||
      newEnd <=
        newStart
    ) {
      return NextResponse.json(
        {
          error:
            "Las fechas no son válidas",
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
        .eq(
          "id",
          bookingId
        )
        .maybeSingle();

    if (
      bookingError
    ) {
      console.error(
        "Error loading rescheduled booking:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la reserva",
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

    const currentSlot =
      Array.isArray(
        booking.slots
      )
        ? booking.slots[0]
        : booking.slots;

    /*
* ============================================================
* AUTORIZACIÓN
* ============================================================
*
* Puede enviar el aviso:
*
* - el propietario del negocio;
* - un administrador de Slottye.
*/

const {
data:
  authenticatedProfile,
error:
  authenticatedProfileError,
} =
await admin
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
  .maybeSingle();

if (
authenticatedProfileError
) {
console.error(
  "Error checking reschedule admin permissions:",
  authenticatedProfileError
);

return NextResponse.json(
  {
    error:
      "No se han podido comprobar los permisos",
  },
  {
    status:
      500,
  }
);
}

const isOwner =
business?.owner_id ===
user.id;

const isAdmin =
authenticatedProfile
  ?.is_admin ===
true;

if (
!business ||
(!isOwner && !isAdmin)
) {
console.error(
  "Unauthorized booking reschedule notification:",
  {
    authenticatedUserId:
      user.id,

    businessOwnerId:
      business?.owner_id ??
      null,

    isAdmin,
  }
);

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

const rescheduleActor:
| "business"
| "admin" =
isAdmin
  ? "admin"
  : "business";

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

    if (
      !currentSlot?.start_at ||
      !currentSlot?.end_at ||
      new Date(
        currentSlot.start_at
      ).getTime() !==
        newStart.getTime() ||
      new Date(
        currentSlot.end_at
      ).getTime() !==
        newEnd.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "El nuevo horario no coincide con la reserva actual",
        },
        {
          status:
            409,
        }
      );
    }

    const serviceName =
      service?.name ??
      "Cita";

    const previousFormatted =
      formatDateTime(
        previousStartAt
      );

    const newFormatted =
      formatDateTime(
        newStartAt
      );

    const fullAddress =
      [
        business.address,
        business.city,
      ]
        .filter(Boolean)
        .join(" · ");

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
          "BOOKING_RESCHEDULED"
        )
        .eq(
          "metadata->>new_start_at",
          newStartAt
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
        "Error checking existing reschedule notification:",
        existingNotificationError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el estado del aviso",
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
            "BOOKING_RESCHEDULED",
          status:
            "PENDING",
          subject:
            `Tu cita en ${business.name} ha sido reprogramada`,
          metadata: {
            service:
              serviceName,
            previous_start_at:
              previousStartAt,
            previous_end_at:
              previousEndAt,
            new_start_at:
              newStartAt,
            new_end_at:
              newEndAt,
          },
        })
        .select(
          "id"
        )
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
        "Error creating reschedule notification:",
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

    if (
      !notification
    ) {
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
                `Tu cita en ${business.name} ha sido reprogramada`,
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
                    <div style="text-align:center;margin-bottom:30px;">
                      <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
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
                      Tu cita ha sido reprogramada
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
                      Hola ${clientProfile.name ?? ""},
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
${
  rescheduleActor ===
  "admin"
    ? `Un administrador de Slottye ha cambiado el horario de tu cita en <strong style="color:#17171c;">${business.name}</strong>.`
    : `<strong style="color:#17171c;">${business.name}</strong> ha cambiado el horario de tu cita.`
}
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
                        NUEVO HORARIO
                      </div>

                      <div
                        style="
                          font-size:16px;
                          font-weight:700;
                          color:#17171c;
                        "
                      >
                        ${serviceName}
                      </div>

                      <div
                        style="
                          margin-top:14px;
                          font-size:15px;
                          line-height:1.6;
                          color:#30343b;
                        "
                      >
                        📅 ${newFormatted}
                        ${
                          fullAddress
                            ? `<br><br>📍 ${fullAddress}`
                            : ""
                        }
                      </div>
                    </div>

                    <div
                      style="
                        margin:24px 0;
                        padding:20px;
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:12px;
                      "
                    >
                      <div
                        style="
                          margin-bottom:10px;
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:0.5px;
                          color:#64748b;
                        "
                      >
                        HORARIO ANTERIOR
                      </div>

                      <div
                        style="
                          font-size:15px;
                          line-height:1.6;
                          color:#30343b;
                        "
                      >
                        📅 ${previousFormatted}
                      </div>
                    </div>

                    <div style="text-align:center;margin:30px 0;">
                      <a
                        href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://slottye.com"}/account/bookings"
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
                        Ver mis citas
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
                      Si el nuevo horario no te va bien, puedes consultar o cancelar la reserva desde tu cuenta de Slottye.
                    </p>

                    <div
                      style="
                        margin-top:32px;
                        padding-top:22px;
                        border-top:1px solid #eeeeee;
                        text-align:center;
                      "
                    >
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
      console.error(
        "Resend reschedule error:",
        {
          status:
            resendResponse.status,

          statusText:
            resendResponse.statusText ||
            null,
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
          "Reschedule email failed and notification could not be marked FAILED:",
          failedStatusError
        );
      }

      return NextResponse.json(
        {
          error:
            "La reserva se movió, pero no se pudo enviar el email",
        },
        {
          status:
            500,
        }
      );
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
      console.error(
        "Reschedule email sent but notification could not be marked SENT:",
        sentStatusError
      );

      return NextResponse.json({
        success:
          true,

        clientEmailSent:
          true,

        warning:
          "El email se ha enviado, pero no se ha podido actualizar el estado interno de la notificación.",
      });
    }

    return NextResponse.json({
      success:
        true,
      clientEmailSent:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Booking reschedule notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error enviando el aviso de reprogramación",
      },
      {
        status:
          500,
      }
    );
  }
}