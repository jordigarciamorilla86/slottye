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
    businessId: string;
  }>;
};

type RequestBody = {
  active?: unknown;
};

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: Props
) {
  try {
    const {
      businessId,
    } =
      await params;

    if (
      !businessId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del negocio.",
        },
        {
          status:
            400,
        }
      );
    }

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
        "Error checking admin profile before changing business status:",
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

    const body =
      bodyResult.data;

    const active =
      body.active;

    if (
      typeof active !==
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
     * NEGOCIO
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
          owner_id,
          name,
          slug,
          active
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
        "Error checking business before changing status:",
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

    /*
     * ============================================================
     * SIN CAMBIOS
     * ============================================================
     */

    if (
      business.active ===
        active
    ) {
      return NextResponse.json({
        success:
          true,

        active,
      });
    }

    /*
     * ============================================================
     * ACTUALIZAR
     * ============================================================
     */

    const {
      data:
        updatedBusiness,
      error:
        updateError,
    } =
      await admin
        .from(
          "businesses"
        )
        .update({
          active,
        })
        .eq(
          "id",
          businessId
        )
        .select(`
          id,
          active
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Error changing business status:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido cambiar el estado del negocio.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !updatedBusiness
    ) {
      return NextResponse.json(
        {
          error:
            "No se ha podido modificar el negocio.",
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
        active
          ? "BUSINESS_ACTIVATED"
          : "BUSINESS_DEACTIVATED",

      entityType:
        "BUSINESS",

      entityId:
        business.id,

      businessId:
        business.id,

      targetUserId:
        business.owner_id,

      description:
        active
          ? `Se activó el negocio ${business.name}.`
          : `Se desactivó el negocio ${business.name}.`,

      oldValues: {
        active:
          business.active,
      },

      newValues: {
        active,
      },

      metadata: {
        name:
          business.name,

        slug:
          business.slug,

        owner_id:
          business.owner_id,
      },
    });

    return NextResponse.json({
      success:
        true,

      active:
        updatedBusiness.active,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin business status error:",
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