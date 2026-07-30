import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

type ReleasedSlot = {
  bookingId: string;
  slotId: string;
  businessId: string;
  serviceId: string | null;
  startAt: string;
};

export async function DELETE() {
  try {
    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    /*
     * ============================================================
     * USUARIO AUTENTICADO
     * ============================================================
     */

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ============================================================
     * PERFIL
     * ============================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("profiles")
        .select(`
          id,
          role
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "Error loading profile:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la cuenta.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ============================================================
     * RESERVAS QUE VAMOS A LIBERAR
     * ============================================================
     */

    const releasedSlots:
      ReleasedSlot[] = [];

    /*
     * ============================================================
     * CLIENTE
     *
     * Antes de eliminarlo:
     *
     * 1. Buscamos reservas CONFIRMED
     * 2. Comprobamos que sean futuras
     * 3. Comprobamos que el slot siga BOOKED
     * 4. Liberamos el slot
     * 5. Guardamos información para notificar
     * ============================================================
     */

    if (
      profile?.role ===
      "customer"
    ) {
      const {
        data: bookings,
        error: bookingsError,
      } =
        await admin
          .from("bookings")
          .select(`
            id,
            slot_id,
            business_id,
            service_id,
            status,

            slots (
              id,
              start_at,
              status
            )
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "status",
            "CONFIRMED"
          );

      if (bookingsError) {
        console.error(
          "Error loading bookings:",
          bookingsError
        );

        return NextResponse.json(
          {
            error:
              "No se han podido comprobar las reservas activas.",
          },
          {
            status: 500,
          }
        );
      }

      const now =
        new Date();

      for (
        const booking of
        bookings ?? []
      ) {
        const slot =
          Array.isArray(
            booking.slots
          )
            ? booking.slots[0] ??
              null
            : booking.slots;

        if (!slot) {
          continue;
        }

        /*
         * No liberamos slots pasados.
         */

        if (
          new Date(
            slot.start_at
          ) <= now
        ) {
          continue;
        }

        /*
         * Solo slots realmente reservados.
         */

        if (
          slot.status !==
          "BOOKED"
        ) {
          continue;
        }

        /*
         * Liberamos UNO POR UNO.
         *
         * Esto nos permite saber exactamente
         * cuáles se han liberado correctamente.
         */

        const {
          data: updatedSlot,
          error:
            slotUpdateError,
        } =
          await admin
            .from("slots")
            .update({
              status:
                "AVAILABLE",

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              booking.slot_id
            )
            .eq(
              "status",
              "BOOKED"
            )
            .select(`
              id,
              start_at
            `)
            .maybeSingle();

        if (
          slotUpdateError
        ) {
          console.error(
            "Error releasing slot:",
            booking.slot_id,
            slotUpdateError
          );

          /*
           * No seguimos con la eliminación.
           *
           * Evitamos borrar la reserva dejando
           * accidentalmente un slot bloqueado.
           */

          return NextResponse.json(
            {
              error:
                "No se han podido liberar todas las citas reservadas.",
            },
            {
              status: 500,
            }
          );
        }

        /*
         * Si no se actualizó significa que el
         * slot dejó de estar BOOKED mientras
         * procesábamos la petición.
         */

        if (
          !updatedSlot
        ) {
          continue;
        }

        releasedSlots.push({
          bookingId:
            booking.id,

          slotId:
            booking.slot_id,

          businessId:
            booking.business_id,

          serviceId:
            booking.service_id,

          startAt:
            updatedSlot.start_at,
        });
      }

      /*
       * ==========================================================
       * NOTIFICAR SLOTS LIBERADOS
       *
       * Lo hacemos ANTES de eliminar profile,
       * porque después las bookings desaparecerán
       * por CASCADE.
       * ==========================================================
       */

      for (
        const released of
        releasedSlots
      ) {
        try {
          await notifyReleasedSlot({
            admin,
            released,
            deletedUserId:
              user.id,
          });
        } catch (error) {
          /*
           * Un fallo de email NO debe impedir
           * que el usuario pueda eliminar
           * su cuenta.
           */

          console.error(
            "Error notifying released slot:",
            released.slotId,
            error
          );
        }
      }
    }

    /*
     * ============================================================
     * ELIMINAR PROFILE
     *
     * CASCADE eliminará sus datos relacionados.
     *
     * Si es negocio, businesses también caerá
     * en cascada junto con:
     *
     * - slots
     * - services
     * - business_hours
     * - business_images
     * - business_blocks
     * - etc.
     * ============================================================
     */

    const {
      error:
        profileDeleteError,
    } =
      await admin
        .from("profiles")
        .delete()
        .eq(
          "id",
          user.id
        );

    if (
      profileDeleteError
    ) {
      console.error(
        "Error deleting profile:",
        profileDeleteError
      );

      return NextResponse.json(
        {
          error:
            "No se han podido eliminar los datos de la cuenta.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ============================================================
     * ELIMINAR AUTH USER
     * ============================================================
     */

    const {
      error: authError,
    } =
      await admin.auth.admin
        .deleteUser(
          user.id
        );

    if (authError) {
      console.error(
        "Error deleting auth user:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "Los datos se han eliminado, pero ha ocurrido un problema al finalizar la eliminación de la cuenta. Contacta con soporte.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ============================================================
     * OK
     * ============================================================
     */

    return NextResponse.json({
      success: true,

      releasedSlots:
        releasedSlots.length,
    });
  } catch (error) {
    console.error(
      "Unexpected account deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al eliminar la cuenta.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ==============================================================
 * NOTIFICAR SLOT LIBERADO
 * ==============================================================
 */

async function notifyReleasedSlot({
  admin,
  released,
  deletedUserId,
}: {
  admin: ReturnType<
    typeof createAdminClient
  >;

  released:
    ReleasedSlot;

  deletedUserId:
    string;
}) {
  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data: business,
    error: businessError,
  } =
    await admin
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        active
      `)
      .eq(
        "id",
        released.businessId
      )
      .maybeSingle();

  if (
    businessError ||
    !business
  ) {
    console.error(
      "Business not found while notifying released slot:",
      businessError
    );

    return;
  }

  if (
    !business.active
  ) {
    return;
  }

  /*
   * ============================================================
   * SERVICIO
   * ============================================================
   */

  let serviceName:
    string | null = null;

  if (
    released.serviceId
  ) {
    const {
      data: service,
    } =
      await admin
        .from("services")
        .select(`
          id,
          name
        `)
        .eq(
          "id",
          released.serviceId
        )
        .maybeSingle();

    serviceName =
      service?.name ??
      null;
  }

  /*
   * ============================================================
   * SUSCRIPTORES
   * ============================================================
   */

  const {
    data: subscriptions,
    error:
      subscriptionsError,
  } =
    await admin
      .from(
        "business_subscriptions"
      )
      .select(`
        user_id,

        profiles (
          email,
          name
        )
      `)
      .eq(
        "business_id",
        released.businessId
      )
      .eq(
        "email_enabled",
        true
      )
      /*
       * Nunca intentamos notificar
       * al usuario que está eliminando
       * su cuenta.
       */
      .neq(
        "user_id",
        deletedUserId
      );

  if (
    subscriptionsError
  ) {
    console.error(
      "Error loading subscriptions:",
      subscriptionsError
    );

    return;
  }

  if (
    !subscriptions?.length
  ) {
    return;
  }

  /*
   * ============================================================
   * FECHA
   * ============================================================
   */

  const formattedDate =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        released.startAt
      )
    );

  const baseUrl =
    process.env
      .NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  /*
   * ============================================================
   * ENVIAR A CADA SUSCRIPTOR
   * ============================================================
   */

  for (
    const subscription of
    subscriptions
  ) {
    const subscriberProfile =
      Array.isArray(
        subscription.profiles
      )
        ? subscription
            .profiles[0] ??
          null
        : subscription.profiles;

    if (
      !subscriberProfile?.email
    ) {
      continue;
    }

    /*
     * ==========================================================
     * NOTIFICACIÓN
     * ==========================================================
     */

    const {
      data: notification,
      error:
        notificationError,
    } =
      await admin
        .from(
          "notifications"
        )
        .insert({
          user_id:
            subscription.user_id,

          business_id:
            business.id,

          type:
            "SLOT_AVAILABLE",

          status:
            "PENDING",

          subject:
            `Se ha liberado una cita en ${business.name}`,

          metadata: {
            slot_id:
              released.slotId,

            booking_id:
              released.bookingId,

            service_id:
              released.serviceId,

            business_slug:
              business.slug,

            start_at:
              released.startAt,

            /*
             * Diferenciamos este caso
             * de una cancelación normal.
             */
            reason:
              "ACCOUNT_DELETION",
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

      continue;
    }

    /*
     * ==========================================================
     * EMAIL
     * ==========================================================
     */

    const result =
      await resend.emails.send(
        {
          from:
            "Slottye <reservas@slottye.com>",

          to:
            subscriberProfile.email,

          subject:
            `Nueva cita disponible en ${business.name}`,

          html: `
            <div
              style="
                font-family:Arial,sans-serif;
                max-width:600px;
                margin:auto;
                color:#111827;
              "
            >
              <h1>
                Se ha liberado una cita
              </h1>

              <p>
                Hola${
                  subscriberProfile.name
                    ? ` ${subscriberProfile.name}`
                    : ""
                },
              </p>

              <p>
                Se acaba de liberar una cita en
                <strong>${business.name}</strong>.
              </p>

              <div
                style="
                  margin:24px 0;
                  padding:18px;
                  border:1px solid #e5e7eb;
                  border-radius:12px;
                  background:#f9fafb;
                "
              >
                ${
                  serviceName
                    ? `
                      <div
                        style="
                          font-size:18px;
                          font-weight:bold;
                          margin-bottom:8px;
                        "
                      >
                        ${serviceName}
                      </div>
                    `
                    : ""
                }

                <div
                  style="
                    font-size:16px;
                  "
                >
                  📅 ${formattedDate}
                </div>
              </div>

              <p>
                Este horario vuelve a estar disponible
                y puede reservarlo cualquier usuario.
              </p>

              <p
                style="
                  margin-top:28px;
                "
              >
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
                  Reservar esta cita
                </a>
              </p>

              <p
                style="
                  margin-top:30px;
                  font-size:12px;
                  color:#6b7280;
                "
              >
                Recibes este correo porque estás
                suscrito a ${business.name} en Slottye.
              </p>
            </div>
          `,
        },

        /*
         * Clave distinta de la cancelación normal.
         */

        {
          idempotencyKey:
            `account-deletion-slot-available/${released.bookingId}/${subscription.user_id}`,
        }
      );

    /*
     * ==========================================================
     * RESULTADO RESEND
     * ==========================================================
     */

    if (
      result.error
    ) {
      console.error(
        "Error sending released slot email:",
        result.error
      );

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

      continue;
    }

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
  }
}