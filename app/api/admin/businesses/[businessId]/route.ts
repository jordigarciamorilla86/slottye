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
  prepareSingleBusinessDeletion,
  requireAdmin,
  sendBusinessDeletedEmail,
  sendPreparedBusinessDeletionNotifications,
} from "@/lib/admin/adminDeletion";

import {
  writeAdminAuditLog,
} from "@/lib/admin/audit";

import {
  cleanupBusinessGoogleCalendar,
} from "@/lib/google-calendar-cleanup";

type Props = {
  params: Promise<{
    businessId: string;
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

async function cleanupBusinessImagesStorage({
  admin,
  businessId,
}: {
  admin:
    ReturnType<
      typeof createAdminClient
    >;

  businessId:
    string;
}) {
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
        id,
        image_url
      `)
      .eq(
        "business_id",
        businessId
      );

  if (
    imagesError
  ) {
    console.error(
      "Error loading business images before deletion:",
      imagesError
    );

    return {
      success:
        false as const,

      deletedFiles:
        0,
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
            businessId
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

  if (
    paths.length ===
    0
  ) {
    return {
      success:
        true as const,

      deletedFiles:
        0,
    };
  }

  let deletedFiles =
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
      console.error(
        "Error cleaning business image storage before deletion:",
        storageError
      );

      return {
        success:
          false as const,

        deletedFiles,
      };
    }

    deletedFiles +=
      batch.length;
  }

  return {
    success:
      true as const,

    deletedFiles,
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
      businessId,
    } =
      await params;

    if (
      !isUuid(
        businessId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del negocio no es válido.",
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
     * USUARIO
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

    /*
     * ============================================================
     * NEGOCIO + PROPIETARIO
     * ============================================================
     */

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
          owner_id,

          profiles (
            name,
            email
          )
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
        "Error loading business to delete:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el negocio.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !business
    ) {
      return NextResponse.json(
        {
          error:
            "El negocio no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    const owner =
      Array.isArray(
        business.profiles
      )
        ? business
            .profiles[0] ??
          null
        : business.profiles;

    /*
     * ============================================================
     * PREPARAR AVISOS
     * ============================================================
     *
     * Aquí SOLO guardamos los datos necesarios para poder avisar
     * después. No enviamos emails hasta que el DELETE haya
     * terminado correctamente.
     */

    const preparation =
      await prepareSingleBusinessDeletion({
        admin,
        businessId,
      });

    if (
      !preparation.success
    ) {
      return NextResponse.json(
        {
          error:
            preparation.error,
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
     * - detener el watch;
     * - revocar OAuth;
     * - NO borrar eventos existentes en Google Calendar;
     * - NO borrar aquí la conexión local.
     *
     * La conexión local y mappings desaparecen con CASCADE
     * cuando se elimina el negocio.
     */

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
        "Google Calendar cleanup failed before admin business deletion:",
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

    /*
     * ============================================================
     * LIMPIAR STORAGE
     * ============================================================
     */

    const storageCleanup =
      await cleanupBusinessImagesStorage({
        admin,
        businessId,
      });

    if (
      !storageCleanup.success
    ) {
      return NextResponse.json(
        {
          error:
            "No se han podido limpiar correctamente las imágenes del negocio. Inténtalo de nuevo.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * ELIMINAR NEGOCIO
     * ============================================================
     *
     * Una sola sentencia DELETE.
     *
     * PostgreSQL ejecuta de forma transaccional todos los
     * ON DELETE CASCADE / SET NULL del esquema.
     */

    const {
      error:
        deleteError,
    } =
      await admin
        .from(
          "businesses"
        )
        .delete()
        .eq(
          "id",
          businessId
        );

    if (
      deleteError
    ) {
      console.error(
        "Error deleting business:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido eliminar el negocio y sus datos.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * EFECTOS SECUNDARIOS
     * ============================================================
     *
     * El negocio YA no existe.
     *
     * Los fallos de email o auditoría no deben hacer creer al
     * navegador que la eliminación ha fallado.
     */

    const bookingNotifications =
      await sendPreparedBusinessDeletionNotifications({
        notifications:
          preparation.notifications,
      });

    let ownerEmailSent =
      false;

    if (
      owner?.email
    ) {
      try {
        ownerEmailSent =
          await sendBusinessDeletedEmail({
            email:
              owner.email,

            ownerName:
              owner.name,

            businessName:
              business.name,
          });
      } catch (
        emailError
      ) {
        console.error(
          "Unexpected business owner deletion email error:",
          emailError
        );
      }
    }

    let auditWritten =
      false;

    try {
      await writeAdminAuditLog({
        adminUserId:
          currentUser.id,

        action:
          "BUSINESS_DELETED",

        entityType:
          "BUSINESS",

        entityId:
          business.id,

        /*
         * El negocio ya no existe, por lo que business_id
         * debe quedar en null. Conservamos su UUID en entityId.
         */

        businessId:
          null,

        targetUserId:
          business.owner_id,

        description:
          `Se eliminó definitivamente el negocio ${business.name}.`,

        oldValues: {
          name:
            business.name,

          owner_id:
            business.owner_id,
        },

        newValues: {
          deleted:
            true,
        },

        metadata: {
          deleted_business_id:
            business.id,

          owner_name:
            owner?.name ??
            null,

          owner_email:
            owner?.email ??
            null,

          owner_email_sent:
            ownerEmailSent,

          booking_emails_sent:
            bookingNotifications.sent,

          booking_emails_failed:
            bookingNotifications.failed,

          storage_files_deleted:
            storageCleanup.deletedFiles,

          google_calendar_closed:
            true,
        },
      });

      auditWritten =
        true;
    } catch (
      auditError
    ) {
      console.error(
        "Error writing admin business deletion audit:",
        auditError
      );
    }

    return NextResponse.json({
      success:
        true,

      emailSent:
        ownerEmailSent,

      bookingEmails: {
        sent:
          bookingNotifications.sent,

        failed:
          bookingNotifications.failed,
      },

      storageFilesDeleted:
        storageCleanup.deletedFiles,

      auditWritten,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin business deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al eliminar el negocio.",
      },
      {
        status:
          500,
      }
    );
  }
}