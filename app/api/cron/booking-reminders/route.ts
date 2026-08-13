import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const admin =
      createAdminClient();

    const now = new Date();

    /*
     * Ventana exacta de una hora:
     * desde dentro de 24 h hasta dentro de 25 h.
     *
     * El cron se ejecuta cada hora.
     */
    const from =
      new Date(
        now.getTime() +
          24 * 60 * 60 * 1000
      );

    const to =
      new Date(
        now.getTime() +
          25 * 60 * 60 * 1000
      );
    const { data: bookings, error } = await admin
      .from("bookings")
      .select(`
        id,
        user_id,
        business_id,
        service_id,
        status,
        slots!inner (
          start_at
        ),
        businesses (
          name
        ),
        services (
          name
        ),
        profiles (
          name,
          email
        )
      `)
      .eq("status", "CONFIRMED")
      .gte("slots.start_at", from.toISOString())
      .lt("slots.start_at", to.toISOString());

    if (error) {
      console.error("Error loading reminders:", error);

      return NextResponse.json(
        {
          error:
            "No se han podido cargar los recordatorios.",
        },
        {
          status:
            500,
        }
      );
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      /*
       * Comprobación rápida.
       *
       * La garantía real contra concurrencia la da el índice
       * notifications_booking_reminder_unique_active.
       */
      const {
        data:
          existing,
        error:
          existingError,
      } =
        await admin
          .from(
            "notifications"
          )
          .select(
            "id"
          )
          .eq(
            "booking_id",
            booking.id
          )
          .eq(
            "type",
            "BOOKING_REMINDER"
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
        existingError
      ) {
        console.error(
          "Error checking existing booking reminder:",
          existingError
        );

        failed++;
        continue;
      }

      if (
        existing
      ) {
        skipped++;
        continue;
      }

      const profile = Array.isArray(booking.profiles)
        ? booking.profiles[0]
        : booking.profiles;

      const business = Array.isArray(booking.businesses)
        ? booking.businesses[0]
        : booking.businesses;

      const service = Array.isArray(booking.services)
        ? booking.services[0]
        : booking.services;

      const slot = Array.isArray(booking.slots)
        ? booking.slots[0]
        : booking.slots;

      if (!profile?.email || !slot?.start_at) {
        failed++;
        continue;
      }

      const { data: notification, error: notificationError } =
        await admin
          .from("notifications")
          .insert({
            user_id: booking.user_id,
            business_id: booking.business_id,
            booking_id: booking.id,
            type: "BOOKING_REMINDER",
            status: "PENDING",
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
          skipped++;
          continue;
        }

        console.error(
          "Error creating reminder:",
          notificationError
        );

        failed++;
        continue;
      }

      if (
        !notification
      ) {
        console.error(
          "Reminder insert returned no notification:",
          {
            bookingId:
              booking.id,
          }
        );

        failed++;
        continue;
      }

      const formattedDate = new Intl.DateTimeFormat(
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
      ).format(new Date(slot.start_at));

      const businessName =
        business?.name ?? "tu negocio";

      const serviceName =
        service?.name ?? "Tu cita";

      const response = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Slottye <reservas@slottye.com>",
            to: [profile.email],
            subject: `Recordatorio de tu cita en ${businessName}`,
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
                    Recuerda tu próxima cita
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
                    Hola ${profile.name ?? ""},
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
                    Te recordamos que tienes una cita próximamente.
                  </p>

                  <div
                    style="
                      margin:24px 0;
                      padding:20px;
                      background:#eff6ff;
                      border:1px solid #bfdbfe;
                      border-radius:12px;
                    "
                  >
                    <div
                      style="
                        margin-bottom:10px;
                        font-size:12px;
                        font-weight:700;
                        letter-spacing:0.5px;
                        color:#1d4ed8;
                      "
                    >
                      PRÓXIMA CITA
                    </div>

                    <div
                      style="
                        font-size:16px;
                        font-weight:700;
                        color:#17171c;
                      "
                    >
                      ${businessName}
                    </div>

                    <div
                      style="
                        margin-top:8px;
                        font-size:15px;
                        line-height:1.6;
                        color:#30343b;
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
                    Puedes consultar todos los detalles desde tu cuenta de Slottye.
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
          }),
        }
      );

      if (
        !response.ok
      ) {
        console.error(
          "Resend reminder error:",
          {
            status:
              response.status,

            statusText:
              response.statusText ||
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
            "Reminder email failed and notification could not be marked FAILED:",
            failedStatusError
          );
        }

        failed++;
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
        console.error(
          "Reminder email sent but notification could not be marked SENT:",
          sentStatusError
        );

        failed++;
        continue;
      }

      sent++;
    }

    return NextResponse.json({
      success: true,
      found: bookings?.length ?? 0,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("Reminder cron error:", error);

    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}