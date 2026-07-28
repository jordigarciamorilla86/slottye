import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();

    // Ventana de 1 hora alrededor de las 24 h.
    // Como ejecutaremos el cron cada hora:
    // desde dentro de 24 h hasta dentro de 25 h.
    const from = new Date(
        now.getTime() + 23 * 60 * 60 * 1000
      );
      
      const to = new Date(
        now.getTime() + 47 * 60 * 60 * 1000
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
        { error: error.message },
        { status: 500 }
      );
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      // Evitamos enviar el mismo recordatorio dos veces.
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("type", "BOOKING_REMINDER")
        .eq("status", "SENT")
        .maybeSingle();

      if (existing) {
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

      if (notificationError || !notification) {
        console.error(
          "Error creating reminder:",
          notificationError
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
            from: "Slottye <onboarding@resend.dev>",
            to: [profile.email],
            subject: `Recordatorio de tu cita en ${businessName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2>Recuerda tu próxima cita</h2>

                <p>
                  Hola ${profile.name ?? ""},
                </p>

                <p>
                  Te recordamos que tienes una cita próximamente.
                </p>

                <div style="padding:16px;background:#f5f5f5;border-radius:10px;margin:20px 0;">
                  <strong>${businessName}</strong><br>
                  ${serviceName}<br>
                  ${formattedDate}
                </div>

                <p>
                  Puedes consultar los detalles desde tu cuenta de Slottye.
                </p>

                <p>Equipo Slottye</p>
              </div>
            `,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          "Resend reminder error:",
          await response.text()
        );

        await admin
          .from("notifications")
          .update({
            status: "FAILED",
          })
          .eq("id", notification.id);

        failed++;
        continue;
      }

      await admin
        .from("notifications")
        .update({
          status: "SENT",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

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