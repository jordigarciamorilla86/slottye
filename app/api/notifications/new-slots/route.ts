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

    const [
      businessResult,
      adminProfileResult,
    ] = await Promise.all([
      admin
        .from("businesses")
        .select(`
          id,
          name,
          slug,
          owner_id
        `)
        .eq("id", businessId)
        .maybeSingle(),
    
      admin
        .from("profiles")
        .select(`
          id,
          is_admin
        `)
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    
    if (businessResult.error) {
      console.error(
        "Error loading notification business:",
        businessResult.error
      );
    
      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el negocio",
        },
        {
          status: 500,
        }
      );
    }
    
    const business =
      businessResult.data;
    
    const isAdmin =
      adminProfileResult.data
        ?.is_admin === true;
    
    const isOwner =
      business?.owner_id ===
      user.id;
    
    if (
      !business ||
      (!isOwner && !isAdmin)
    ) {
      return NextResponse.json(
        {
          error:
            "Negocio no autorizado",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: slots,
      error: slotsError,
    } = await admin
      .from("slots")
      .select(`
        id,
        start_at,
        service_id,
        status,
        services (
          name
        )
      `)
      .in("id", slotIds)
      .eq("business_id", businessId)
      .eq("status", "AVAILABLE")
      .order("start_at");
    
    if (slotsError) {
      console.error(
        "Error loading slots for notification:",
        slotsError
      );
    
      return NextResponse.json(
        {
          error:
            "No se han podido cargar las disponibilidades",
        },
        {
          status: 500,
        }
      );
    }
    
    if (!slots?.length) {
      console.warn(
        "No available slots found for notification:",
        {
          businessId,
          slotIds,
        }
      );
    
      return NextResponse.json({
        sent: 0,
        reason:
          "NO_AVAILABLE_SLOTS",
      });
    }

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await admin
      .from("business_subscriptions")
      .select(`
        user_id,
        email_enabled,
        profiles (
          email,
          name
        )
      `)
      .eq("business_id", businessId)
      .eq("email_enabled", true);
    
    if (subscriptionsError) {
      console.error(
        "Error loading subscriptions:",
        subscriptionsError
      );
    
      return NextResponse.json(
        {
          error:
            "No se han podido cargar los suscriptores",
        },
        {
          status: 500,
        }
      );
    }
    
    if (!subscriptions?.length) {
      console.warn(
        "No email-enabled subscribers found:",
        {
          businessId,
        }
      );
    
      return NextResponse.json({
        sent: 0,
        reason:
          "NO_SUBSCRIBERS",
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
            console.error(
              "Error creating new-slot notification:",
              {
                subscriptionUserId:
                  subscription.user_id,
          
                businessId:
                  business.id,
          
                slotIds,
          
                error:
                  notificationError,
              }
            );
          
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
                  Nuevas citas disponibles
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
                  Hola${profile.name ? ` ${profile.name}` : ""},
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
                Se han publicado nuevas citas de
                <strong style="color:#17171c;">${business.name}</strong>
                en Slottye.
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
                    CITAS DISPONIBLES
                  </div>

                  <ul
                    style="
                      margin:0;
                      padding-left:20px;
                      font-size:15px;
                      line-height:1.6;
                      color:#30343b;
                    "
                  >
                    ${formattedSlots}
                  </ul>
                </div>

                <div style="text-align:center;margin:30px 0;">
                  <a
                    href="${baseUrl}/business/${business.slug}"
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
                    Ver citas disponibles
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
                  Recibes este correo porque estás suscrito a este negocio en Slottye.
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
          `
        },
        {
          idempotencyKey:
            `new-slots/${notification.id}`,
        }
      );

      if (result.error) {
        console.error(
          "Resend new-slot email error:",
          {
            recipient:
              profile.email,
      
            notificationId:
              notification.id,
      
            error:
              result.error,
          }
        );
      
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