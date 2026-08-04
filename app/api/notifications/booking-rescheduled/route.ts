import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Falta bookingId" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: booking, error } =
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

    if (error || !booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

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
      const { data: owner } =
        await admin
          .from("profiles")
          .select("email")
          .eq("id", business.owner_id)
          .maybeSingle();

      ownerEmail =
        owner?.email ?? null;
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
              `Bearer ${process.env.RESEND_API_KEY}`,

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
                      href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://slottye.com"}/account/bookings"
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
        "Error email cliente:",
        await clientResponse.text()
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
                `Bearer ${process.env.RESEND_API_KEY}`,

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
                      Un cliente ha modificado el horario de una reserva existente.
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
                        href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://slottye.com"}/business-dashboard/agenda"
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
          "Error email negocio:",
          await businessResponse.text()
        );
      }
    }

    return NextResponse.json({
      success: true,
      clientEmailSent:
        clientResponse.ok,
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