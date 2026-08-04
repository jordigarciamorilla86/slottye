import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: booking, error: bookingError } =
      await admin
        .from("bookings")
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
        .eq("id", bookingId)
        .single();

    if (bookingError || !booking) {
      console.error("Booking error:", bookingError);

      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Seguridad: comprobamos que el usuario autenticado
    // sea propietario del negocio.
    const { data: business } = await admin
      .from("businesses")
      .select("id")
      .eq("id", booking.business_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const profile = Array.isArray(booking.profiles)
      ? booking.profiles[0]
      : booking.profiles;

    const businessData = Array.isArray(booking.businesses)
      ? booking.businesses[0]
      : booking.businesses;

    const service = Array.isArray(booking.services)
      ? booking.services[0]
      : booking.services;

    const slot = Array.isArray(booking.slots)
      ? booking.slots[0]
      : booking.slots;

    if (!profile?.email) {
      return NextResponse.json(
        { error: "El cliente no tiene email" },
        { status: 400 }
      );
    }

    const businessName =
      businessData?.name ?? "el negocio";

    const serviceName =
      service?.name ?? "tu cita";

    const formattedDate = slot?.start_at
      ? new Intl.DateTimeFormat("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        }).format(new Date(slot.start_at))
      : "";

    // Creamos primero la notificación como PENDING.
    const { data: notification, error: notificationError } =
      await admin
        .from("notifications")
        .insert({
          user_id: booking.user_id,
          business_id: booking.business_id,
          booking_id: booking.id,
          type: "BOOKING_CANCELLATION",
          status: "PENDING",
        })
        .select("id")
        .single();

    if (notificationError || !notification) {
      console.error(
        "Notification insert error:",
        notificationError
      );

      return NextResponse.json(
        { error: "No se pudo crear la notificación" },
        { status: 500 }
      );
    }

    const resendResponse = await fetch(
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
          subject: `Tu cita en ${businessName} ha sido cancelada`,
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
                  <strong style="color:#17171c;">${businessName}</strong> ha cancelado tu cita.
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
                      ? `<div style="margin-top:14px;font-size:14px;line-height:1.7;color:#3f4652;"><strong>Fecha y hora:</strong><br>${formattedDate}</div>`
                      : ""
                  }
                </div>

                <div style="text-align:center;margin:30px 0;">
                  <a
                    href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://slottye.com"}/"
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

    if (!resendResponse.ok) {
      const resendError =
        await resendResponse.text();

      console.error(
        "Resend error:",
        resendError
      );

      await admin
        .from("notifications")
        .update({
          status: "FAILED",
        })
        .eq("id", notification.id);

      return NextResponse.json(
        { error: "No se pudo enviar el email" },
        { status: 500 }
      );
    }

    await admin
      .from("notifications")
      .update({
        status: "SENT",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Booking cancellation notification error:",
      error
    );

    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}