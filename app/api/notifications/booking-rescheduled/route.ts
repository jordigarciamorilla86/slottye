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
              "Slottye <onboarding@resend.dev>",

            to: [
              profile.email,
            ],

            subject:
              `Tu cita en ${business.name} ha cambiado`,

            html: `
              <div
                style="
                  font-family:Arial,sans-serif;
                  max-width:600px;
                  margin:auto;
                  color:#111827;
                "
              >
                <h1>Cita modificada</h1>

                <p>
                  Hola ${profile.name ?? ""},
                </p>

                <p>
                  Tu cita en
                  <strong>${business.name}</strong>
                  se ha reprogramado correctamente.
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
                    address
                      ? `<br><br>📍 ${address}`
                      : ""
                  }
                </div>

                <p>
                  Puedes consultar tu reserva
                  desde Mi Slottye → Mis citas.
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
                "Slottye <onboarding@resend.dev>",

              to: [
                businessEmail,
              ],

              subject:
                `Cita reprogramada · ${serviceName}`,

              html: `
                <div
                  style="
                    font-family:Arial,sans-serif;
                    max-width:600px;
                    margin:auto;
                    color:#111827;
                  "
                >
                  <h1>Cita reprogramada</h1>

                  <p>
                    Un cliente ha cambiado
                    una reserva existente.
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

                    👤 ${profile.name ?? "Cliente"}

                    <br>

                    ✉ ${profile.email}
                  </div>

                  <p>
                    Puedes consultar la reserva
                    desde Mi panel → Reservas.
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