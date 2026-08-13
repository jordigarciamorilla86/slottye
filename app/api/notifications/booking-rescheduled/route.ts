import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";

type RequestBody = {
  bookingId?: unknown;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const bodyResult =
      await readJsonBody<RequestBody>(
        request
      );

    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const bookingId =
      typeof bodyResult.data.bookingId ===
      "string"
        ? bodyResult.data.bookingId.trim()
        : "";

    if (!bookingId) {
      return NextResponse.json(
        { error: "Falta bookingId" },
        { status: 400 }
      );
    }

    if (!isUuid(bookingId)) {
      return NextResponse.json(
        {
          error:
            "El identificador de la reserva no es válido",
        },
        { status: 400 }
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
          "booking-rescheduled",

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
          status,

          slots (
            start_at,
            end_at
          ),

          services (
            name
          ),

          businesses (
            name,
            email,
            owner_id,
            address,
            city
          ),

          profiles (
            name,
            email
          )
        `)
        .eq("id", bookingId)
        .maybeSingle();

    if (bookingError) {
      console.error(
        "Error loading rescheduled booking:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la reserva",
        },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    /*
 * Puede notificar la reprogramación:
 *
 * - el propio cliente;
 * - el propietario del negocio;
 * - un super administrador.
 */

const [
  businessAuthorizationResult,
  adminProfileResult,
] = await Promise.all([
  admin
    .from("businesses")
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
    .from("profiles")
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
  businessAuthorizationResult.error
) {
  console.error(
    "Error checking reschedule authorization:",
    businessAuthorizationResult.error
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

if (adminProfileResult.error) {
  console.error(
    "Error checking reschedule admin permissions:",
    adminProfileResult.error
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

const businessAuthorization =
  businessAuthorizationResult.data;

const isCustomer =
  booking.user_id ===
  user.id;

const isOwner =
  businessAuthorization
    ?.owner_id ===
  user.id;

const isAdmin =
  adminProfileResult.data
    ?.is_admin === true;

if (
  !isCustomer &&
  !isOwner &&
  !isAdmin
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

const rescheduleActor:
  | "customer"
  | "business"
  | "admin" =
  isAdmin
    ? "admin"
    : isOwner
      ? "business"
      : "customer";

    const slot =
      Array.isArray(booking.slots)
        ? booking.slots[0]
        : booking.slots;

    const service =
      Array.isArray(booking.services)
        ? booking.services[0]
        : booking.services;

    const business =
      Array.isArray(booking.businesses)
        ? booking.businesses[0]
        : booking.businesses;

    const profile =
      Array.isArray(booking.profiles)
        ? booking.profiles[0]
        : booking.profiles;

    if (
      !slot?.start_at ||
      !business ||
      !profile?.email
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan datos para enviar la notificación",
        },
        { status: 400 }
      );
    }

    let ownerEmail: string | null = null;

    if (business.owner_id) {
      const {
        data: owner,
        error: ownerError,
      } =
        await admin
          .from("profiles")
          .select("email")
          .eq("id", business.owner_id)
          .maybeSingle();

      if (ownerError) {
        console.error(
          "Error loading business owner email for reschedule notification:",
          ownerError
        );
      } else {
        ownerEmail =
          owner?.email ?? null;
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

    const address = [
      business.address,
      business.city,
    ]
      .filter(Boolean)
      .join(" · ");

    const resendApiKey =
      process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error(
        "RESEND_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          error:
            "El servicio de correo no está configurado",
        },
        { status: 500 }
      );
    }

    /*
     * EMAIL CLIENTE
     */
    const clientResponse =
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
              profile.email,
            ],

            subject:
              `Tu cita en ${business.name} ha cambiado`,

            html: `
              <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
                <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-sizing:border-box;">
                  <div style="text-align:center;margin-bottom:30px;">
                    <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                      <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                    </div>
                  </div>

                  <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                    Tu cita ha sido reprogramada
                  </h1>

                  <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                    Hola ${profile.name ?? ""},
                  </p>

                  <p style="margin:0 0 28px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                    Tu cita en <strong>${business.name}</strong> se ha reprogramado correctamente.
                  </p>

                  <div style="margin:24px 0;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                    <div style="margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:0.5px;color:#166534;">
                      NUEVO HORARIO
                    </div>

                    <div style="font-size:17px;font-weight:700;color:#17171c;">
                      ${serviceName}
                    </div>

                    <div style="margin-top:14px;font-size:15px;line-height:1.6;color:#3f444f;">
                      📅 ${formattedDate}
                      ${
                        address
                          ? `<br><br>📍 ${address}`
                          : ""
                      }
                    </div>
                  </div>

                  <div style="text-align:center;margin:30px 0;">
                    <a
                      href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://slottye.com"}/account/bookings"
                      style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                    >
                      Ver mis citas
                    </a>
                  </div>

                  <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                    Puedes consultar los detalles o cancelar la reserva desde Mi Slottye → Mis citas.
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

    if (!clientResponse.ok) {
      console.error(
        "Resend customer reschedule email error:",
        {
          status: clientResponse.status,
          statusText:
            clientResponse.statusText || null,
          bookingId: booking.id,
        }
      );
    }

    /*
     * EMAIL NEGOCIO
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
                `Cita reprogramada · ${serviceName}`,

              html: `
                <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-sizing:border-box;">
                    <div style="text-align:center;margin-bottom:30px;">
                      <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                        <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                      </div>
                    </div>

                    <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                      Cita reprogramada
                    </h1>

                    <p style="margin:0 0 28px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                    ${
                      rescheduleActor === "admin"
                        ? "Un administrador de Slottye ha modificado el horario de esta reserva."
                        : rescheduleActor === "business"
                          ? "El horario de esta reserva se ha modificado desde el panel del negocio."
                          : "El cliente ha modificado el horario de una reserva existente."
                    }
                    </p>

                    <div style="margin:24px 0;padding:20px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;">
                      <div style="margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:0.5px;color:#6c55f7;">
                        RESERVA ACTUALIZADA
                      </div>

                      <div style="font-size:17px;font-weight:700;color:#17171c;">
                        ${serviceName}
                      </div>

                      <div style="margin-top:14px;font-size:15px;line-height:1.7;color:#3f444f;">
                        📅 ${formattedDate}
                        <br><br>
                        👤 ${profile.name ?? "Cliente"}
                        <br>
                        ✉ ${profile.email}
                      </div>
                    </div>

                    <div style="text-align:center;margin:30px 0;">
                      <a
                        href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://slottye.com"}/business-dashboard/agenda"
                        style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                      >
                        Ver agenda
                      </a>
                    </div>

                    <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                      Puedes consultar y gestionar esta reserva desde el panel de tu negocio.
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

      if (!businessResponse.ok) {
        console.error(
          "Resend business reschedule email error:",
          {
            status: businessResponse.status,
            statusText:
              businessResponse.statusText || null,
            bookingId: booking.id,
          }
        );
      }
    }

    if (!clientResponse.ok) {
      return NextResponse.json(
        {
          error:
            "No se pudo enviar el email de reprogramación al cliente",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      clientEmailSent: true,
      businessEmailSent,
    });
  } catch (error) {
    console.error(
      "booking-rescheduled:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error enviando notificaciones",
      },
      { status: 500 }
    );
  }
}