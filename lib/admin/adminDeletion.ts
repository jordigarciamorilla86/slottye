import { Resend } from "resend";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

const resend =
  new Resend(
    process.env.RESEND_API_KEY
  );

type AdminClient =
  ReturnType<
    typeof createAdminClient
  >;

type ReleasedSlot = {
  bookingId: string;
  slotId: string;
  businessId: string;
  serviceId: string | null;
  startAt: string;
};

type DeletionResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };


type CustomerDeletionPreparation =
  | {
      success: true;
      releasedSlots: ReleasedSlot[];
    }
  | {
      success: false;
      error: string;
    };

type OwnerBusiness = {
  id: string;
  name: string;
  slug: string;
};

type OwnerBusinessesDeletionPreparation =
  | {
      success: true;
      businesses: OwnerBusiness[];
      notifications: PreparedBusinessDeletionNotification[];
    }
  | {
      success: false;
      error: string;
    };


type PreparedBusinessDeletionNotification = {
  bookingId: string;
  email: string;
  clientName: string | null;
  businessName: string;
  serviceName: string | null;
  startAt: string;
};

type SingleBusinessDeletionPreparation =
  | {
      success: true;
      notifications:
        PreparedBusinessDeletionNotification[];
    }
  | {
      success: false;
      error: string;
    };

function appUrl() {
  return (
    process.env
      .NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

function escapeHtml(
  value:
    string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

/*
 * ==============================================================
 * COMPROBAR ADMINISTRADOR
 * ==============================================================
 */

export async function requireAdmin({
  admin,
  userId,
}: {
  admin:
    AdminClient;

  userId:
    string;
}): Promise<
  | {
      success: true;
    }
  | {
      success: false;
      status: number;
      error: string;
    }
> {
  const {
    data:
      profile,
    error,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(`
        id,
        is_admin
      `)
      .eq(
        "id",
        userId
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "Error checking administrator:",
      error
    );

    return {
      success:
        false,

      status:
        500,

      error:
        "No se ha podido comprobar la cuenta administradora.",
    };
  }

  if (
    !profile?.is_admin
  ) {
    return {
      success:
        false,

      status:
        403,

      error:
        "No autorizado.",
    };
  }

  return {
    success:
      true,
  };
}

/*
 * ==============================================================
 * PREPARAR ELIMINACIÓN DE CLIENTE
 * ==============================================================
 */

export async function prepareCustomerDeletion({
  admin,
  userId,
}: {
  admin:
    AdminClient;

  userId:
    string;
}): Promise<
  CustomerDeletionPreparation
> {
  const {
    data:
      bookings,
    error:
      bookingsError,
  } =
    await admin
      .from(
        "bookings"
      )
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
        userId
      )
      .eq(
        "status",
        "CONFIRMED"
      );

  if (
    bookingsError
  ) {
    console.error(
      "Error loading customer bookings before account deletion:",
      bookingsError
    );

    return {
      success:
        false,

      error:
        "No se han podido comprobar las reservas activas del usuario.",
    };
  }

  const now =
    new Date();

  const releasedSlots:
    ReleasedSlot[] =
    [];

  for (
    const booking of
      bookings ??
      []
  ) {
    const slot =
      Array.isArray(
        booking.slots
      )
        ? booking
            .slots[0] ??
          null
        : booking.slots;

    if (
      !slot ||
      new Date(
        slot.start_at
      ) <=
        now ||
      slot.status !==
        "BOOKED"
    ) {
      continue;
    }

    releasedSlots.push({
      bookingId:
        booking.id,

      slotId:
        slot.id,

      businessId:
        booking.business_id,

      serviceId:
        booking.service_id,

      startAt:
        slot.start_at,
    });
  }

  return {
    success:
      true,

    releasedSlots,
  };
}

export async function sendPreparedCustomerDeletionNotifications({
  admin,
  releasedSlots,
  deletedUserId,
}: {
  admin:
    AdminClient;

  releasedSlots:
    ReleasedSlot[];

  deletedUserId:
    string;
}) {
  let processed =
    0;

  let failed =
    0;

  for (
    const released of
      releasedSlots
  ) {
    try {
      await notifyReleasedSlot({
        admin,
        released,
        deletedUserId,
      });

      processed++;
    } catch (
      error
    ) {
      failed++;

      console.error(
        "Error notifying released slot after account deletion:",
        released.slotId,
        error
      );
    }
  }

  return {
    processed,
    failed,
  };
}

/*
 * ==============================================================
 * PREPARAR TODOS LOS NEGOCIOS DE UN PROPIETARIO
 * ==============================================================
 */

export async function prepareOwnerBusinessesDeletion({
  admin,
  ownerId,
}: {
  admin:
    AdminClient;

  ownerId:
    string;
}): Promise<
  OwnerBusinessesDeletionPreparation
> {
  const {
    data:
      businesses,
    error,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        slug
      `)
      .eq(
        "owner_id",
        ownerId
      );

  if (
    error
  ) {
    console.error(
      "Error loading owner businesses:",
      error
    );

    return {
      success:
        false,

      error:
        "No se han podido comprobar los negocios asociados a la cuenta.",
    };
  }

  const ownerBusinesses =
    businesses ??
    [];

  const notifications:
    PreparedBusinessDeletionNotification[] =
    [];

  for (
    const business of
      ownerBusinesses
  ) {
    const preparation =
      await prepareSingleBusinessDeletion({
        admin,
        businessId:
          business.id,
      });

    if (
      !preparation.success
    ) {
      return preparation;
    }

    notifications.push(
      ...preparation.notifications
    );
  }

  return {
    success:
      true,

    businesses:
      ownerBusinesses,

    notifications,
  };
}

/*
 * ==============================================================
 * PREPARAR UN ÚNICO NEGOCIO
 * ==============================================================
 */

export async function prepareSingleBusinessDeletion({
  admin,
  businessId,
}: {
  admin:
    AdminClient;

  businessId:
    string;
}): Promise<
  SingleBusinessDeletionPreparation
> {
  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        slug
      `)
      .eq(
        "id",
        businessId
      )
      .maybeSingle();

  if (
    businessError
  ) {
    console.error(
      "Error loading business for deletion:",
      businessError
    );

    return {
      success:
        false,

      error:
        "No se ha podido comprobar el negocio.",
    };
  }

  if (
    !business
  ) {
    return {
      success:
        false,

      error:
        "El negocio no existe.",
    };
  }

  const {
    data:
      bookings,
    error:
      bookingsError,
  } =
    await admin
      .from(
        "bookings"
      )
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
      .eq(
        "business_id",
        business.id
      )
      .eq(
        "status",
        "CONFIRMED"
      );

  if (
    bookingsError
  ) {
    console.error(
      "Error loading future bookings before business deletion:",
      bookingsError
    );

    return {
      success:
        false,

      error:
        "No se han podido comprobar las reservas del negocio.",
    };
  }

  const now =
    new Date();

  const notifications:
    PreparedBusinessDeletionNotification[] =
    [];

  for (
    const booking of
      bookings ??
      []
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
      !slot ||
      new Date(
        slot.start_at
      ) <=
        now ||
      !profile?.email
    ) {
      continue;
    }

    notifications.push({
      bookingId:
        booking.id,

      email:
        profile.email,

      clientName:
        profile.name ??
        null,

      businessName:
        business.name,

      serviceName:
        service?.name ??
        null,

      startAt:
        slot.start_at,
    });
  }

  return {
    success:
      true,

    notifications,
  };
}

export async function sendPreparedBusinessDeletionNotifications({
  notifications,
}: {
  notifications:
    PreparedBusinessDeletionNotification[];
}) {
  let sent =
    0;

  let failed =
    0;

  for (
    const notification of
      notifications
  ) {
    try {
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
            notification.startAt
          )
        );

      const safeBusinessName =
        escapeHtml(
          notification.businessName
        );

      const safeClientName =
        notification.clientName
          ? escapeHtml(
              notification.clientName
            )
          : "";

      const safeServiceName =
        notification.serviceName
          ? escapeHtml(
              notification.serviceName
            )
          : null;

      const result =
        await resend.emails.send(
          {
            from:
              "Slottye <noreply@slottye.com>",

            to:
              notification.email,

            subject:
              `Tu cita en ${notification.businessName} ha sido cancelada`,

            html: `
              <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
                <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">

                  <div style="text-align:center;margin-bottom:30px;">
                    <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                      <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                    </div>
                  </div>

                  <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                    Tu cita ha sido cancelada
                  </h1>

                  <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                    Hola${safeClientName ? " " + safeClientName : ""},
                  </p>

                  <p style="margin:0 0 24px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                    Tu cita en <strong>${safeBusinessName}</strong> ha sido cancelada porque este negocio ya no está disponible en Slottye.
                  </p>

                  <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;text-align:center;color:#444854;">
                    ${safeServiceName
                      ? '<div style="font-size:17px;font-weight:700;color:#17171c;margin-bottom:8px;">' +
                        safeServiceName +
                        "</div>"
                      : ""}
                    <div style="font-size:14px;line-height:1.6;">
                      📅 ${formattedDate}
                    </div>
                  </div>

                  <p style="margin:0;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                    Puedes consultar otros negocios y citas disponibles en Slottye.
                  </p>

                  <div style="text-align:center;margin:30px 0;">
                    <a
                      href="${appUrl()}"
                      style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                    >
                      Buscar otras citas
                    </a>
                  </div>

                  <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                    Este correo se ha enviado porque tenías una reserva activa en el negocio eliminado.
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
          },
          {
            idempotencyKey:
              `admin-business-deletion-booking/${notification.bookingId}`,
          }
        );

      if (
        result.error
      ) {
        failed++;

        console.error(
          "Error sending prepared business deletion email:",
          notification.bookingId,
          result.error
        );

        continue;
      }

      sent++;
    } catch (
      error
    ) {
      failed++;

      console.error(
        "Unexpected prepared business deletion email error:",
        notification.bookingId,
        error
      );
    }
  }

  return {
    sent,
    failed,
  };
}

/*
 * ==============================================================
 * AVISAR CLIENTES CON RESERVAS FUTURAS
 * ==============================================================
 */

export async function notifyFutureBusinessBookings({
  admin,
  businesses,
}: {
  admin:
    AdminClient;

  businesses:
    {
      id: string;
      name: string;
      slug: string;
    }[];
}): Promise<
  DeletionResult
> {
  const businessIds =
    businesses.map(
      (
        business
      ) =>
        business.id
    );

  const {
    data:
      bookings,
    error:
      bookingsError,
  } =
    await admin
      .from(
        "bookings"
      )
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

  if (
    bookingsError
  ) {
    console.error(
      "Error loading business bookings:",
      bookingsError
    );

    return {
      success:
        false,

      error:
        "No se han podido comprobar las reservas del negocio.",
    };
  }

  const now =
    new Date();

  for (
    const booking of
    bookings ??
    []
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
      !slot ||
      new Date(
        slot.start_at
      ) <=
        now
    ) {
      continue;
    }

    if (
      !profile?.email
    ) {
      continue;
    }

    const business =
      businesses.find(
        (
          item
        ) =>
          item.id ===
          booking.business_id
      );

    if (
      !business
    ) {
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

    const safeBusinessName =
      escapeHtml(
        business.name
      );

    const safeClientName =
      profile.name
        ? escapeHtml(
            profile.name
          )
        : "";

    const safeServiceName =
      service?.name
        ? escapeHtml(
            service.name
          )
        : null;

    const result =
      await resend.emails.send(
        {
          from:
            "Slottye <noreply@slottye.com>",

          to:
            profile.email,

          subject:
            `Tu cita en ${business.name} ha sido cancelada`,

          html: `
            <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
              <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">

                <div style="text-align:center;margin-bottom:30px;">
                  <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                    <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                  </div>
                </div>

                <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                  Tu cita ha sido cancelada
                </h1>

                <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Hola${safeClientName ? " " + safeClientName : ""},
                </p>

                <p style="margin:0 0 24px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Tu cita en <strong>${safeBusinessName}</strong> ha sido cancelada porque este negocio ya no está disponible en Slottye.
                </p>

                <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;text-align:center;color:#444854;">
                  ${safeServiceName
                    ? '<div style="font-size:17px;font-weight:700;color:#17171c;margin-bottom:8px;">' +
                      safeServiceName +
                      "</div>"
                    : ""}
                  <div style="font-size:14px;line-height:1.6;">
                    📅 ${formattedDate}
                  </div>
                </div>

                <p style="margin:0;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Puedes consultar otros negocios y citas disponibles en Slottye.
                </p>

                <div style="text-align:center;margin:30px 0;">
                  <a
                    href="${appUrl()}"
                    style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                  >
                    Buscar otras citas
                  </a>
                </div>

                <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                  Este correo se ha enviado porque tenías una reserva activa en el negocio eliminado.
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
        },
        {
          idempotencyKey:
            `admin-business-deletion-booking/${booking.id}`,
        }
      );

    if (
      result.error
    ) {
      console.error(
        "Error sending business deletion email:",
        booking.id,
        result.error
      );

      return {
        success:
          false,

        error:
          "No se ha podido avisar a todos los clientes con reservas activas. Inténtalo de nuevo.",
      };
    }
  }

  return {
    success:
      true,
  };
}

/*
 * ==============================================================
 * CORREO: CUENTA ELIMINADA
 * ==============================================================
 */

export async function sendAccountDeletedEmail({
  email,
  name,
}: {
  email:
    string;

  name:
    string | null;
}) {
  const safeName =
    name
      ? escapeHtml(
          name
        )
      : "";

  const result =
    await resend.emails.send({
      from:
        "Slottye <noreply@slottye.com>",

      to:
        email,

      subject:
        "Tu cuenta de Slottye ha sido eliminada",

      html: `
        <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">

            <div style="text-align:center;margin-bottom:30px;">
              <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
              </div>
            </div>

            <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
              Tu cuenta ha sido eliminada
            </h1>

            <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
              Hola${safeName ? " " + safeName : ""},
            </p>

            <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
              Un administrador de Slottye ha eliminado definitivamente tu cuenta y los datos asociados.
            </p>

            <p style="margin:0;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
              Ya no podrás iniciar sesión con esta cuenta. Si consideras que se trata de un error, ponte en contacto con soporte. contact@slottye.com.
            </p>

            <div style="text-align:center;margin:30px 0;">
              <a
                href="${appUrl()}"
                style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
              >
                Ir a Slottye
              </a>
            </div>

            <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
              Este mensaje es informativo y no requiere ninguna acción.
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
    });

  if (
    result.error
  ) {
    console.error(
      "Error sending account deleted email:",
      result.error
    );

    return false;
  }

  return true;
}

/*
 * ==============================================================
 * CORREO: NEGOCIO ELIMINADO
 * ==============================================================
 */

export async function sendBusinessDeletedEmail({
  email,
  ownerName,
  businessName,
}: {
  email:
    string;

  ownerName:
    string | null;

  businessName:
    string;
}) {
  const safeOwnerName =
    ownerName
      ? escapeHtml(
          ownerName
        )
      : "";

  const safeBusinessName =
    escapeHtml(
      businessName
    );

  const result =
    await resend.emails.send({
      from:
        "Slottye <noreply@slottye.com>",

      to:
        email,

      subject:
        `Tu negocio ${businessName} ha sido eliminado de Slottye`,

      html: `
        <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">

            <div style="text-align:center;margin-bottom:30px;">
              <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
              </div>
            </div>

            <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
              Tu negocio ha sido eliminado
            </h1>

            <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
              Hola${safeOwnerName ? " " + safeOwnerName : ""},
            </p>

            <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
              Un administrador de Slottye ha eliminado definitivamente el negocio
              <strong>${safeBusinessName}</strong>
              y sus datos asociados.
            </p>

            <p style="margin:0;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
              Tu cuenta de usuario continúa activa. Si consideras que se trata de un error, ponte en contacto con soporte. contact@slottye.com.
            </p>

            <div style="text-align:center;margin:30px 0;">
              <a
                href="${appUrl()}"
                style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
              >
                Ir a Slottye
              </a>
            </div>

            <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
              La eliminación del negocio no elimina tu cuenta personal de Slottye.
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
    });

  if (
    result.error
  ) {
    console.error(
      "Error sending business deleted email:",
      result.error
    );

    return false;
  }

  return true;
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
  admin:
    AdminClient;

  released:
    ReleasedSlot;

  deletedUserId:
    string;
}) {
  const {
    data:
      business,
  } =
    await admin
      .from(
        "businesses"
      )
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
    !business?.active
  ) {
    return;
  }

  let serviceName:
    string |
    null =
    null;

  if (
    released.serviceId
  ) {
    const {
      data:
        service,
    } =
      await admin
        .from(
          "services"
        )
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
    data:
      subscriptions,
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

  for (
    const subscription of
    subscriptions
  ) {
    const subscriber =
      Array.isArray(
        subscription.profiles
      )
        ? subscription
            .profiles[0] ??
          null
        : subscription.profiles;

    if (
      !subscriber?.email
    ) {
      continue;
    }

    const {
      data:
        notification,
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
              "ADMIN_ACCOUNT_DELETION",
          },
        })
        .select(
          "id"
        )
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
            "Slottye <noreply@slottye.com>",

          to:
            subscriber.email,

          subject:
            `Nueva cita disponible en ${business.name}`,

          html: `
            <div style="margin:0;padding:40px 20px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#17171c;">
              <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">

                <div style="text-align:center;margin-bottom:30px;">
                  <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;">
                    <span style="color:#6c55f7;">Slotty</span><span style="color:#22c55e;">e</span>
                  </div>
                </div>

                <h1 style="margin:0 0 16px;text-align:center;font-size:24px;line-height:1.3;color:#17171c;">
                  ¡Se ha liberado una cita!
                </h1>

                <p style="margin:0 0 12px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Hola${subscriber.name ? " " + escapeHtml(subscriber.name) : ""},
                </p>

                <p style="margin:0 0 24px;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Se acaba de liberar una cita en
                  <strong>${escapeHtml(business.name)}</strong>.
                </p>

                <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;text-align:center;color:#444854;">
                  ${serviceName
                    ? '<div style="font-size:17px;font-weight:700;color:#17171c;margin-bottom:8px;">' +
                      escapeHtml(serviceName) +
                      "</div>"
                    : ""}
                  <div style="font-size:14px;line-height:1.6;">
                    📅 ${formattedDate}
                  </div>
                </div>

                <p style="margin:0;text-align:center;font-size:15px;line-height:1.6;color:#60646f;">
                  Este horario vuelve a estar disponible y puede reservarlo cualquier usuario.
                </p>

                <div style="text-align:center;margin:30px 0;">
                  <a
                    href="${appUrl()}/business/${business.slug}"
                    style="display:inline-block;background:#6c55f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:10px;"
                  >
                    Reservar esta cita
                  </a>
                </div>

                <p style="margin:28px 0 0;text-align:center;font-size:13px;line-height:1.6;color:#8a8f9c;">
                  Recibes este correo porque estás suscrito a este negocio en Slottye.
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
        },
        {
          idempotencyKey:
            `admin-account-deletion-slot/${released.bookingId}/${subscription.user_id}`,
        }
      );

    await admin
      .from(
        "notifications"
      )
      .update(
        result.error
          ? {
              status:
                "FAILED",
            }
          : {
              status:
                "SENT",

              sent_at:
                new Date()
                  .toISOString(),
            }
      )
      .eq(
        "id",
        notification.id
      );
  }
}
