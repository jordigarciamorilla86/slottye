import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      businessId,
      slotIds,
    }: {
      businessId: string;
      slotIds: string[];
    } = body;

    if (
      !businessId ||
      !Array.isArray(slotIds) ||
      slotIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id,name,slug,owner_id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json(
        { error: "Negocio no autorizado" },
        { status: 403 }
      );
    }

    const { data: slots } = await admin
      .from("slots")
      .select(`
        id,
        start_at,
        service_id,
        services (
          name
        )
      `)
      .in("id", slotIds)
      .eq("business_id", businessId)
      .eq("status", "AVAILABLE")
      .order("start_at");

    if (!slots || slots.length === 0) {
      return NextResponse.json({
        sent: 0,
      });
    }

    const { data: subscriptions } = await admin
      .from("business_subscriptions")
      .select(`
        user_id,
        profiles (
          email,
          name
        )
      `)
      .eq("business_id", businessId)
      .eq("email_enabled", true);

    if (!subscriptions?.length) {
      return NextResponse.json({
        sent: 0,
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    let sent = 0;

    for (const subscription of subscriptions) {
      const profile = Array.isArray(
        subscription.profiles
      )
        ? subscription.profiles[0]
        : subscription.profiles;

      if (!profile?.email) {
        continue;
      }

      const { data: notification, error: notificationError } =
        await admin
          .from("notifications")
          .insert({
            user_id: subscription.user_id,
            business_id: business.id,
            type: "NEW_SLOTS",
            status: "PENDING",
            subject: `Nuevas citas en ${business.name}`,
            metadata: {
              slot_ids: slotIds,
              business_slug: business.slug,
            },
          })
          .select("id")
          .single();

      if (notificationError || !notification) {
        continue;
      }

      const formattedSlots = slots
        .slice(0, 8)
        .map((slot) => {
          const date = new Intl.DateTimeFormat(
            "es-ES",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Madrid",
            }
          ).format(new Date(slot.start_at));

          const service = Array.isArray(slot.services)
  ? slot.services[0]?.name
  : undefined;

          return `
            <li style="margin-bottom:8px;">
              ${service ? `<strong>${service}</strong> · ` : ""}
              ${date}
            </li>
          `;
        })
        .join("");

      const result = await resend.emails.send(
        {
          from: "Slottye <reservas@slottye.com>",
          to: profile.email,
          subject: `Nuevas citas disponibles en ${business.name}`,
          html: `
            <div style="
              font-family:Arial,sans-serif;
              max-width:600px;
              margin:auto;
              color:#111827;
            ">
              <h1>Nuevas citas disponibles</h1>

              <p>
                Hola${profile.name ? ` ${profile.name}` : ""},
              </p>

              <p>
                ${business.name} acaba de publicar nuevas citas en Slottye.
              </p>

              <ul>
                ${formattedSlots}
              </ul>

              <p style="margin-top:28px;">
                <a
                  href="${baseUrl}/business/${business.slug}"
                  style="
                    display:inline-block;
                    padding:12px 18px;
                    background:#6955ff;
                    color:white;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                  "
                >
                  Ver citas disponibles
                </a>
              </p>

              <p style="
                margin-top:30px;
                font-size:12px;
                color:#6b7280;
              ">
                Recibes este correo porque estás suscrito a este negocio en Slottye.
              </p>
            </div>
          `,
        },
        {
          idempotencyKey:
            `new-slots/${notification.id}`,
        }
      );

      if (result.error) {
        await admin
          .from("notifications")
          .update({
            status: "FAILED",
          })
          .eq("id", notification.id);

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
      sent,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error enviando notificaciones" },
      { status: 500 }
    );
  }
}