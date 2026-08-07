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

type AccountDeletionRpcRow = {
  released_booking_id: string;
  released_slot_id: string;
  released_business_id: string;
  released_service_id: string | null;
  released_start_at: string;
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
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "No autorizado.",
        },
        {
          status:
            401,
        }
      );
    }

    /*
     * ============================================================
     * PERFIL / ROL
     * ============================================================
     */

    const {
      data:
        profile,
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .select(`
          id,
          role
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
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
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * SI ES NEGOCIO: AVISAR ANTES DE ELIMINAR
     * ============================================================
     *
     * Los emails de reservas activas del negocio se procesan
     * antes del borrado definitivo.
     *
     * Si alguno falla, NO eliminamos todavía la cuenta.
     */

    if (
      profile.role ===
      "business"
    ) {
      const result =
        await prepareBusinessDeletion({
          admin,
          ownerId:
            user.id,
        });

      if (
        !result.success
      ) {
        return NextResponse.json(
          {
            error:
              result.error,
          },
          {
            status:
              500,
          }
        );
      }
    }

    /*
     * ============================================================
     * ELIMINACIÓN TRANSACCIONAL DE DATOS
     * ============================================================
     *
     * Una sola transacción PostgreSQL:
     *
     * 1. Bloquea el perfil.
     * 2. Cancela las reservas futuras del usuario.
     * 3. Cambia las reservas a CANCELLED_ACCOUNT_DELETED.
     * 4. Libera sus slots.
     * 5. Borra profiles.
     * 6. Aplica CASCADE / SET NULL del esquema.
     *
     * Si cualquier paso falla, PostgreSQL revierte TODO.
     */

    const {
      data:
        deletionRows,
      error:
        deletionError,
    } =
      await admin.rpc(
        "delete_account_data_transactional",
        {
          p_user_id:
            user.id,
        }
      );

    if (
      deletionError
    ) {
      console.error(
        "Transactional account deletion error:",
        deletionError
      );

      return NextResponse.json(
        {
          error:
            "No se han podido eliminar los datos de la cuenta.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * NORMALIZAR SLOTS LIBERADOS
     * ============================================================
     */

    const releasedSlots:
      ReleasedSlot[] =
      (
        (
          deletionRows ??
          []
        ) as AccountDeletionRpcRow[]
      ).map(
        (
          row
        ) => ({
          bookingId:
            row.released_booking_id,

          slotId:
            row.released_slot_id,

          businessId:
            row.released_business_id,

          serviceId:
            row.released_service_id,

          startAt:
            row.released_start_at,
        })
      );

    /*
     * ============================================================
     * ELIMINAR USUARIO DE AUTH
     * ============================================================
     *
     * Supabase Auth está fuera de la transacción PostgreSQL.
     *
     * Llegados aquí, los datos de aplicación ya se han eliminado
     * correctamente.
     */

    const {
      error:
        authError,
    } =
      await admin.auth.admin
        .deleteUser(
          user.id
        );

    if (
      authError
    ) {
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
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * AVISAR DE HUECOS LIBERADOS
     * ============================================================
     *
     * BEST EFFORT.
     *
     * Un fallo de Resend o notifications NO puede provocar que
     * una cuenta ya eliminada aparezca como fallida.
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
      } catch (
        error
      ) {
        console.error(
          "Error notifying released slot after account deletion:",
          released.slotId,
          error
        );
      }
    }

    /*
     * ============================================================
     * OK
     * ============================================================
     */

    return NextResponse.json({
      success:
        true,
    });
  } catch (
    error
  ) {
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
        status:
          500,
      }
    );
  }
}
/*
 * ==============================================================
 * PREPARAR ELIMINACIÓN DE CLIENTE
 * ==============================================================
 */



/*
 * ==============================================================
 * PREPARAR ELIMINACIÓN DE NEGOCIO
 * ==============================================================
 */

async function prepareBusinessDeletion({
  admin,
  ownerId,
}: {
  admin: ReturnType<
    typeof createAdminClient
  >;

  ownerId: string;
}): Promise<
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    }
> {
  /*
   * ============================================================
   * NEGOCIOS DEL PROPIETARIO
   *
   * Aunque actualmente probablemente haya uno,
   * soportamos varios por seguridad futura.
   * ============================================================
   */

  const {
    data: businesses,
    error:
      businessesError,
  } =
    await admin
      .from("businesses")
      .select(`
        id,
        name,
        slug
      `)
      .eq(
        "owner_id",
        ownerId
      );

  if (businessesError) {
    console.error(
      "Error loading businesses:",
      businessesError
    );

    return {
      success: false,
      error:
        "No se han podido comprobar los negocios asociados a la cuenta.",
    };
  }

  if (
    !businesses?.length
  ) {
    return {
      success: true,
    };
  }

  const businessIds =
    businesses.map(
      (business) =>
        business.id
    );

  /*
   * ============================================================
   * RESERVAS CONFIRMADAS
   * ============================================================
   */

  const {
    data: bookings,
    error: bookingsError,
  } =
    await admin
      .from("bookings")
      .select(`
        id,
        user_id,
        business_id,
        service_id,
        status,

        profiles (
          email,
          name
        ),

        services (
          name
        ),

        slots (
          start_at
        )
      `)
      .in(
        "business_id",
        businessIds
      )
      .eq(
        "status",
        "CONFIRMED"
      );

  if (bookingsError) {
    console.error(
      "Error loading business bookings:",
      bookingsError
    );

    return {
      success: false,
      error:
        "No se han podido comprobar las reservas del negocio.",
    };
  }

  const now =
    new Date();

  const futureBookings =
    (bookings ?? [])
      .filter(
        (booking) => {
          const slot =
            Array.isArray(
              booking.slots
            )
              ? booking.slots[0] ??
                null
              : booking.slots;

          if (!slot) {
            return false;
          }

          return (
            new Date(
              slot.start_at
            ) > now
          );
        }
      );

  /*
   * ============================================================
   * AVISAR A TODOS LOS CLIENTES
   *
   * Para eliminación de negocio sí exigimos
   * que los emails puedan procesarse antes
   * de borrar definitivamente el negocio.
   *
   * La idempotencyKey evita duplicados
   * si el propietario vuelve a intentarlo.
   * ============================================================
   */

  for (
    const booking of
    futureBookings
  ) {
    const profile =
      Array.isArray(
        booking.profiles
      )
        ? booking
            .profiles[0] ??
          null
        : booking.profiles;

    const service =
      Array.isArray(
        booking.services
      )
        ? booking
            .services[0] ??
          null
        : booking.services;

    const slot =
      Array.isArray(
        booking.slots
      )
        ? booking
            .slots[0] ??
          null
        : booking.slots;

    if (
      !profile?.email ||
      !slot
    ) {
      continue;
    }

    const business =
      businesses.find(
        (item) =>
          item.id ===
          booking.business_id
      );

    if (!business) {
      continue;
    }

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
          slot.start_at
        )
      );

    const baseUrl =
      process.env
        .NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const result =
      await resend.emails.send(
        {
          from:
            "Slottye <reservas@slottye.com>",

          to:
            profile.email,

          subject:
            `Tu cita en ${business.name} ha sido cancelada`,

          html: `
            <div
              style="
                font-family:Arial,sans-serif;
                max-width:600px;
                margin:auto;
                color:#111827;
              "
            >
              <h2>
                Tu cita ha sido cancelada
              </h2>

              <p>
                Hola${
                  profile.name
                    ? ` ${profile.name}`
                    : ""
                },
              </p>

              <p>
                Tu cita en
                <strong>${business.name}</strong>
                ha sido cancelada porque este negocio
                ya no está disponible en Slottye.
              </p>

              <div
                style="
                  padding:16px;
                  background:#f5f5f5;
                  border-radius:10px;
                  margin:20px 0;
                "
              >
                ${
                  service?.name
                    ? `
                      <strong>
                        ${service.name}
                      </strong>
                      <br>
                    `
                    : ""
                }

                ${formattedDate}
              </div>

              <p>
                Puedes consultar otros negocios y
                citas disponibles en Slottye.
              </p>

              <p
                style="
                  margin-top:28px;
                "
              >
                <a
                  href="${baseUrl}"
                  style="
                    display:inline-block;
                    padding:12px 18px;
                    background:#6955ff;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                  "
                >
                  Buscar otras citas
                </a>
              </p>

              <p
                style="
                  margin-top:30px;
                  font-size:12px;
                  color:#6b7280;
                "
              >
                Este correo se ha enviado porque
                tenías una reserva activa en
                ${business.name}.
              </p>
            </div>
          `,
        },
        {
          idempotencyKey:
            `business-deletion-booking/${booking.id}`,
        }
      );

    if (result.error) {
      console.error(
        "Error sending business deletion email:",
        booking.id,
        result.error
      );

      /*
       * No eliminamos todavía el negocio:
       * queremos evitar que desaparezca una
       * reserva sin poder avisar al cliente.
       */

      return {
        success: false,
        error:
          "No se ha podido avisar a todos los clientes con reservas activas. Inténtalo de nuevo.",
      };
    }
  }

  return {
    success: true,
  };
}

/*
 * ==============================================================
 * NOTIFICAR SLOT LIBERADO POR ELIMINACIÓN DE CLIENTE
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
    !business ||
    !business.active
  ) {
    return;
  }

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
      .neq(
        "user_id",
        deletedUserId
      );

  if (
    subscriptionsError ||
    !subscriptions?.length
  ) {
    return;
  }

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
     * Creamos la notificación antes del email.
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
        "Error creating released slot notification:",
        notificationError
      );

      continue;
    }

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

                <div>
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
                    color:#ffffff;
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
        {
          idempotencyKey:
            `account-deletion-slot-available/${released.bookingId}/${subscription.user_id}`,
        }
      );

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