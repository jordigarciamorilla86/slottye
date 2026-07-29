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
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <h2>Tu cita ha sido cancelada</h2>

              <p>
                Hola ${profile.name ?? ""},
              </p>

              <p>
                El negocio <strong>${businessName}</strong>
                ha cancelado tu cita.
              </p>

              <div style="padding:16px;background:#f5f5f5;border-radius:10px;margin:20px 0;">
                <strong>${serviceName}</strong>
                ${
                  formattedDate
                    ? `<br>${formattedDate}`
                    : ""
                }
              </div>

              <p>
                Puedes entrar en Slottye para consultar
                otras citas disponibles.
              </p>

              <p>
                Equipo Slottye
              </p>
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