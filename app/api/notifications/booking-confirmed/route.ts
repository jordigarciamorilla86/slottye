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

    if (bookingError || !booking) {
      console.error(
        "Error loading booking:",
        bookingError
      );

      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
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

    if (business.owner_id) {
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", business.owner_id)
        .maybeSingle();

      ownerEmail =
        ownerProfile?.email ?? null;
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
    const { data: existingNotification } =
      await admin
        .from("notifications")
        .select("id,status")
        .eq("booking_id", booking.id)
        .eq("user_id", booking.user_id)
        .eq("type", "BOOKING_CONFIRMATION")
        .in("status", ["PENDING", "SENT"])
        .maybeSingle();

    if (existingNotification) {
      return NextResponse.json({
        success: true,
        duplicate: true,
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
      notificationError ||
      !notification
    ) {
      console.error(
        "Error creating notification:",
        notificationError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la notificación",
        },
        { status: 500 }
      );
    }

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
            `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from:
            "Slottye <onboarding@resend.dev>",

          to: [
            clientProfile.email,
          ],

          subject:
            `Cita confirmada en ${business.name}`,

          html: `
            <div
              style="
                font-family:Arial,sans-serif;
                max-width:600px;
                margin:auto;
                color:#111827;
              "
            >
              <h1>¡Tu cita está confirmada!</h1>

              <p>
                Hola ${clientProfile.name ?? ""},
              </p>

              <p>
                Tu reserva en
                <strong>${business.name}</strong>
                se ha realizado correctamente.
              </p>

              <div
                style="
                  margin:24px 0;
                  padding:18px;
                  background:#f5f5f7;
                  border-radius:12px;
                "
              >
                <strong>${serviceName}</strong>

                <br><br>

                📅 ${formattedDate}

                ${
                  fullAddress
                    ? `<br><br>📍 ${fullAddress}`
                    : ""
                }
              </div>

              <p>
                También te enviaremos un recordatorio
                antes de la cita.
              </p>

              <p>
                Puedes consultar o cancelar la reserva
                desde <strong>Mi Slottye → Mis citas</strong>.
              </p>

              <p style="margin-top:30px;">
                Equipo Slottye
              </p>
            </div>
          `,
        }),
      }
    );

    if (!clientResponse.ok) {
      const resendError =
        await clientResponse.text();

      console.error(
        "Resend client error:",
        resendError
      );

      await admin
        .from("notifications")
        .update({
          status: "FAILED",
        })
        .eq("id", notification.id);

      return NextResponse.json(
        {
          error:
            "La reserva existe pero no se pudo enviar el email al cliente",
        },
        { status: 500 }
      );
    }

    /*
     * La confirmación del cliente ya está enviada.
     */
    await admin
      .from("notifications")
      .update({
        status: "SENT",
        sent_at:
          new Date().toISOString(),
      })
      .eq("id", notification.id);

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
                `Bearer ${process.env.RESEND_API_KEY}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              from:
                "Slottye <onboarding@resend.dev>",

              to: [
                businessEmail,
              ],

              subject:
                `Nueva reserva en Slottye · ${serviceName}`,

              html: `
                <div
                  style="
                    font-family:Arial,sans-serif;
                    max-width:600px;
                    margin:auto;
                    color:#111827;
                  "
                >
                  <h1>Nueva reserva</h1>

                  <p>
                    Has recibido una nueva reserva
                    a través de Slottye.
                  </p>

                  <div
                    style="
                      margin:24px 0;
                      padding:18px;
                      background:#f5f5f7;
                      border-radius:12px;
                    "
                  >
                    <strong>${serviceName}</strong>

                    <br><br>

                    📅 ${formattedDate}

                    <br><br>

                    👤 ${clientProfile.name ?? "Cliente"}

                    <br>

                    ✉ ${clientProfile.email}
                  </div>

                  <p>
                    Puedes gestionarla desde
                    <strong>
                      Mi panel → Reservas
                    </strong>.
                  </p>

                  <p style="margin-top:30px;">
                    Equipo Slottye
                  </p>
                </div>
              `,
            }),
          }
        );

      businessEmailSent =
        businessResponse.ok;

      if (!businessResponse.ok) {
        console.error(
          "Resend business error:",
          await businessResponse.text()
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