import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  writeAdminAuditLog,
} from "@/lib/admin/audit";

type Props = {
  params: Promise<{
    userId: string;
  }>;
};

type RequestBody = {
  blocked?: unknown;
};

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: Props
) {
  try {
    const {
      userId:
        targetUserId,
    } =
      await params;

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
     * COMPROBAR ADMIN
     * ============================================================
     */

    const {
      data:
        currentProfile,
      error:
        currentProfileError,
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
          currentUser.id
        )
        .maybeSingle();

    if (
      currentProfileError
    ) {
      console.error(
        "Error checking admin permissions before changing blocked status:",
        currentProfileError
      );

      return NextResponse.json(
        {
          error:
            "No se han podido comprobar los permisos.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !currentProfile
        ?.is_admin
    ) {
      return NextResponse.json(
        {
          error:
            "No autorizado.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * NO PERMITIR AUTO-BLOQUEO
     * ============================================================
     */

    if (
      targetUserId ===
        currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes bloquear tu propia cuenta.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * BODY
     * ============================================================
     */

    const bodyResult =
      await readJsonBody<RequestBody>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const blocked =
      bodyResult.data
        .blocked;

    if (
      typeof blocked !==
        "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "El estado enviado no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * USUARIO OBJETIVO
     * ============================================================
     */

    const {
      data:
        targetProfile,
      error:
        targetProfileError,
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
          is_admin,
          is_blocked
        `)
        .eq(
          "id",
          targetUserId
        )
        .maybeSingle();

    if (
      targetProfileError
    ) {
      console.error(
        "Error loading user before changing blocked status:",
        targetProfileError
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
            "No se puede bloquear una cuenta administradora.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * SIN CAMBIOS
     * ============================================================
     */

    if (
      targetProfile.is_blocked ===
        blocked
    ) {
      return NextResponse.json({
        success:
          true,

        blocked,
      });
    }

    /*
     * ============================================================
     * ACTUALIZAR
     * ============================================================
     */

    const {
      data:
        updatedProfile,
      error:
        updateError,
    } =
      await admin
        .from(
          "profiles"
        )
        .update({
          is_blocked:
            blocked,
        })
        .eq(
          "id",
          targetUserId
        )
        .eq(
          "is_admin",
          false
        )
        .select(`
          id,
          is_blocked
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Error changing user blocked status:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido cambiar el estado del usuario.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !updatedProfile
    ) {
      return NextResponse.json(
        {
          error:
            "No se ha podido modificar el usuario.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * AUDITORÍA
     * ============================================================
     */

    await writeAdminAuditLog({
      adminUserId:
        currentUser.id,

      action:
        blocked
          ? "USER_BLOCKED"
          : "USER_UNBLOCKED",

      entityType:
        "USER",

      entityId:
        targetProfile.id,

      targetUserId:
        targetProfile.id,

      description:
        blocked
          ? `Se bloqueó la cuenta de ${targetProfile.name?.trim() || targetProfile.email || targetProfile.id}.`
          : `Se desbloqueó la cuenta de ${targetProfile.name?.trim() || targetProfile.email || targetProfile.id}.`,

      oldValues: {
        is_blocked:
          targetProfile.is_blocked,
      },

      newValues: {
        is_blocked:
          blocked,
      },

      metadata: {
        name:
          targetProfile.name,

        email:
          targetProfile.email,

        role:
          targetProfile.role,
      },
    });

    return NextResponse.json({
      success:
        true,

      blocked:
        updatedProfile.is_blocked,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin user blocked status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado.",
      },
      {
        status:
          500,
      }
    );
  }
}