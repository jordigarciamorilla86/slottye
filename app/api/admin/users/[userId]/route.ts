import {
  NextResponse,
} from "next/server";

import {
  isUuid,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  prepareCustomerDeletion,
  prepareOwnerBusinessesDeletion,
  requireAdmin,
  sendAccountDeletedEmail,
  sendPreparedBusinessDeletionNotifications,
  sendPreparedCustomerDeletionNotifications,
} from "@/lib/admin/adminDeletion";

import {
  writeAdminAuditLog,
} from "@/lib/admin/audit";

import {
  cleanupBusinessGoogleCalendar,
} from "@/lib/google-calendar-cleanup";

type Props = {
  params: Promise<{
    userId: string;
  }>;
};

const BUSINESS_IMAGES_BUCKET =
  "business-images";

function storagePathFromUrl(
  imageUrl: string,
  businessId: string
) {
  try {
    const url =
      new URL(
        imageUrl
      );

    const marker =
      `/storage/v1/object/public/${BUSINESS_IMAGES_BUCKET}/`;

    const encodedPath =
      url.pathname
        .split(
          marker
        )[1];

    if (
      !encodedPath
    ) {
      return null;
    }

    const path =
      decodeURIComponent(
        encodedPath
      );

    if (
      !path.startsWith(
        `${businessId}/`
      )
    ) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

async function prepareBusinessStoragePaths({
  admin,
  businessIds,
}: {
  admin:
    ReturnType<
      typeof createAdminClient
    >;

  businessIds:
    string[];
}) {
  if (
    businessIds.length ===
      0
  ) {
    return {
      success:
        true as const,

      paths:
        [] as string[],
    };
  }

  const {
    data:
      images,
    error:
      imagesError,
  } =
    await admin
      .from(
        "business_images"
      )
      .select(`
        business_id,
        image_url
      `)
      .in(
        "business_id",
        businessIds
      );

  if (
    imagesError
  ) {
    console.error(
      "Error loading business images before admin account deletion:",
      imagesError
    );

    return {
      success:
        false as const,

      paths:
        [] as string[],
    };
  }

  const paths =
    (
      images ??
      []
    )
      .map(
        (
          image
        ) =>
          storagePathFromUrl(
            image.image_url,
            image.business_id
          )
      )
      .filter(
        (
          path
        ): path is string =>
          Boolean(
            path
          )
      );

  return {
    success:
      true as const,

    paths:
      [...new Set(
        paths
      )],
  };
}

async function cleanupPreparedStoragePaths({
  admin,
  paths,
}: {
  admin:
    ReturnType<
      typeof createAdminClient
    >;

  paths:
    string[];
}) {
  let deleted =
    0;

  let failed =
    0;

  for (
    let index =
      0;
    index <
      paths.length;
    index +=
      100
  ) {
    const batch =
      paths.slice(
        index,
        index +
          100
      );

    const {
      error:
        storageError,
    } =
      await admin.storage
        .from(
          BUSINESS_IMAGES_BUCKET
        )
        .remove(
          batch
        );

    if (
      storageError
    ) {
      failed +=
        batch.length;

      console.error(
        "Error cleaning business image storage after admin account deletion:",
        storageError
      );

      continue;
    }

    deleted +=
      batch.length;
  }

  return {
    deleted,
    failed,
  };
}

export async function DELETE(
  _request:
    Request,
  {
    params,
  }:
    Props
) {
  try {
    const {
      userId:
        targetUserId,
    } =
      await params;

    /*
     * ============================================================
     * USER ID
     * ============================================================
     */

    if (
      !isUuid(
        targetUserId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del usuario no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    /*
     * ============================================================
     * USUARIO ACTUAL
     * ============================================================
     */

    const {
      data: {
        user:
          currentUser,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !currentUser
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
     * ADMIN
     * ============================================================
     */

    const adminCheck =
      await requireAdmin({
        admin,
        userId:
          currentUser.id,
      });

    if (
      !adminCheck.success
    ) {
      return NextResponse.json(
        {
          error:
            adminCheck.error,
        },
        {
          status:
            adminCheck.status,
        }
      );
    }

    if (
      targetUserId ===
        currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes eliminar tu propia cuenta desde administración.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * PERFIL OBJETIVO
     * ============================================================
     */

    const {
      data:
        targetProfile,
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .select(`
          id,
          name,
          email,
          role,
          is_admin
        `)
        .eq(
          "id",
          targetUserId
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Error loading target user:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el usuario.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !targetProfile
    ) {
      return NextResponse.json(
        {
          error:
            "El usuario no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    if (
      targetProfile.is_admin
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar una cuenta administradora desde este panel.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * PREPARAR RESERVAS PERSONALES
     * ============================================================
     *
     * No cancelamos nada aquí.
     *
     * El trigger profiles_cancel_bookings_before_delete hará,
     * dentro de la misma transacción del DELETE:
     *
     * - CANCELLED_ACCOUNT_DELETED;
     * - liberar slots futuros.
     *
     * Aquí solo guardamos los datos necesarios para avisar después.
     */

    const customerPreparation =
      await prepareCustomerDeletion({
        admin,
        userId:
          targetUserId,
      });

    if (
      !customerPreparation.success
    ) {
      return NextResponse.json(
        {
          error:
            customerPreparation.error,
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * PREPARAR NEGOCIOS DEL PROPIETARIO
     * ============================================================
     *
     * Tampoco enviamos emails todavía.
     */

    let ownerBusinessPreparation:
      Awaited<
        ReturnType<
          typeof prepareOwnerBusinessesDeletion
        >
      > = {
        success:
          true,

        businesses:
          [],

        notifications:
          [],
      };

    if (
      targetProfile.role ===
        "business"
    ) {
      ownerBusinessPreparation =
        await prepareOwnerBusinessesDeletion({
          admin,
          ownerId:
            targetUserId,
        });

      if (
        !ownerBusinessPreparation.success
      ) {
        return NextResponse.json(
          {
            error:
              ownerBusinessPreparation.error,
          },
          {
            status:
              500,
          }
        );
      }
    }

    const ownerBusinesses =
      ownerBusinessPreparation.success
        ? ownerBusinessPreparation
            .businesses
        : [];

    const businessIds =
      ownerBusinesses.map(
        (
          business
        ) =>
          business.id
      );

    /*
     * ============================================================
     * PREPARAR PATHS DE STORAGE
     * ============================================================
     *
     * Guardamos las rutas antes del CASCADE.
     * Los archivos físicos se eliminan DESPUÉS del éxito del
     * borrado de Auth/DB para no dejar imágenes rotas si Auth falla.
     */

    const storagePreparation =
      await prepareBusinessStoragePaths({
        admin,
        businessIds,
      });

    if (
      !storagePreparation.success
    ) {
      return NextResponse.json(
        {
          error:
            "No se han podido comprobar las imágenes asociadas a la cuenta.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * CERRAR GOOGLE CALENDAR
     * ============================================================
     *
     * Debe hacerse antes del CASCADE porque necesitamos todavía
     * las credenciales locales.
     *
     * El helper:
     *
     * - detiene el watch;
     * - revoca OAuth;
     * - NO borra eventos existentes del Google Calendar;
     * - deja la fila local para que desaparezca por CASCADE.
     */

    for (
      const businessId of
        businessIds
    ) {
      const googleCleanup =
        await cleanupBusinessGoogleCalendar({
          admin,
          businessId,
          deleteLocalConnection:
            false,
        });

      if (
        !googleCleanup.success
      ) {
        console.error(
          "Google Calendar cleanup failed before admin account deletion:",
          {
            businessId,
            error:
              googleCleanup.error,
          }
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido cerrar correctamente la integración con Google Calendar. Inténtalo de nuevo.",
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
     * ELIMINACIÓN EFECTIVA
     * ============================================================
     *
     * profiles.id -> auth.users.id tiene ON DELETE CASCADE.
     *
     * Por tanto eliminamos Auth y dejamos que PostgreSQL haga:
     *
     * auth.users
     *   -> profiles
     *   -> trigger de cancelación de reservas personales
     *   -> businesses del propietario
     *   -> resto de CASCADE / SET NULL.
     *
     * NO borramos profiles manualmente.
     */

    const {
      error:
        authDeleteError,
    } =
      await admin.auth.admin
        .deleteUser(
          targetUserId
        );

    if (
      authDeleteError
    ) {
      console.error(
        "Error deleting target auth user:",
        authDeleteError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido eliminar completamente la cuenta.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * EFECTOS SECUNDARIOS POST-BORRADO
     * ============================================================
     *
     * A partir de aquí la cuenta YA no existe.
     * Ningún fallo externo debe convertir el resultado en un 500.
     */

    const storageCleanup =
      await cleanupPreparedStoragePaths({
        admin,
        paths:
          storagePreparation.paths,
      });

    const customerNotifications =
      await sendPreparedCustomerDeletionNotifications({
        admin,
        releasedSlots:
          customerPreparation
            .releasedSlots,
        deletedUserId:
          targetUserId,
      });

    const businessNotifications =
      ownerBusinessPreparation.success
        ? await sendPreparedBusinessDeletionNotifications({
            notifications:
              ownerBusinessPreparation
                .notifications,
          })
        : {
            sent:
              0,

            failed:
              0,
          };

    let emailSent =
      false;

    if (
      targetProfile.email
    ) {
      try {
        emailSent =
          await sendAccountDeletedEmail({
            email:
              targetProfile.email,

            name:
              targetProfile.name,
          });
      } catch (
        emailError
      ) {
        console.error(
          "Unexpected account deleted email error:",
          emailError
        );
      }
    }

    /*
     * ============================================================
     * AUDITORÍA
     * ============================================================
     */

    let auditWritten =
      false;

    try {
      await writeAdminAuditLog({
        adminUserId:
          currentUser.id,

        action:
          "USER_DELETED",

        entityType:
          "USER",

        entityId:
          targetUserId,

        /*
         * El perfil ya no existe.
         */

        targetUserId:
          null,

        description:
          `Se eliminó definitivamente la cuenta de ${targetProfile.name?.trim() || targetProfile.email || targetUserId}.`,

        oldValues: {
          name:
            targetProfile.name,

          email:
            targetProfile.email,

          role:
            targetProfile.role,

          is_admin:
            targetProfile.is_admin,
        },

        newValues: {
          deleted:
            true,
        },

        metadata: {
          deleted_user_id:
            targetUserId,

          deleted_business_ids:
            businessIds,

          email_sent:
            emailSent,

          released_slots:
            customerPreparation
              .releasedSlots
              .length,

          released_slot_notifications_processed:
            customerNotifications
              .processed,

          released_slot_notifications_failed:
            customerNotifications
              .failed,

          business_booking_emails_sent:
            businessNotifications
              .sent,

          business_booking_emails_failed:
            businessNotifications
              .failed,

          storage_files_deleted:
            storageCleanup
              .deleted,

          storage_files_failed:
            storageCleanup
              .failed,

          google_calendar_connections_closed:
            businessIds.length,
        },
      });

      auditWritten =
        true;
    } catch (
      auditError
    ) {
      console.error(
        "Error writing admin user deletion audit:",
        auditError
      );
    }

    return NextResponse.json({
      success:
        true,

      emailSent,

      releasedSlots:
        customerPreparation
          .releasedSlots
          .length,

      businessBookingEmails: {
        sent:
          businessNotifications
            .sent,

        failed:
          businessNotifications
            .failed,
      },

      storage: {
        deleted:
          storageCleanup
            .deleted,

        failed:
          storageCleanup
            .failed,
      },

      auditWritten,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin user deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al eliminar el usuario.",
      },
      {
        status:
          500,
      }
    );
  }
}