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
    reviewId: string;
  }>;
};

type RequestBody = {
  visible?: unknown;
};

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: Props
) {
  try {
    const {
      reviewId,
    } =
      await params;

    /*
     * ============================================================
     * REVIEW ID
     * ============================================================
     */

    if (
      !reviewId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador de la reseña.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        reviewId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador de la reseña no es válido.",
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
        "Error checking admin profile before changing review visibility:",
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

    const visible =
      body.visible;

    if (
      typeof visible !==
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
     * RESEÑA
     * ============================================================
     */

    const {
      data:
        review,
      error:
        reviewError,
    } =
      await admin
        .from(
          "reviews"
        )
        .select(`
          id,
          user_id,
          business_id,
          booking_id,
          rating,
          comment,
          visible
        `)
        .eq(
          "id",
          reviewId
        )
        .maybeSingle();

    if (
      reviewError
    ) {
      console.error(
        "Error checking review before changing visibility:",
        reviewError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la reseña.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !review
    ) {
      return NextResponse.json(
        {
          error:
            "La reseña no existe.",
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
      review.visible ===
        visible
    ) {
      return NextResponse.json({
        success:
          true,

        visible,
      });
    }

    /*
     * ============================================================
     * CAMBIAR VISIBILIDAD
     * ============================================================
     */

    const {
      error:
        rpcError,
    } =
      await admin.rpc(
        "admin_set_review_visible",
        {
          p_review_id:
            review.id,

          p_visible:
            visible,
        }
      );

    if (
      rpcError
    ) {
      const rpcMessage =
        rpcError.message
          ?.trim() ??
        "";

      if (
        rpcMessage ===
        "Not authorized"
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

      if (
        rpcMessage ===
        "Review not found"
      ) {
        return NextResponse.json(
          {
            error:
              "La reseña no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      console.error(
        "Unexpected admin_set_review_visible RPC error:",
        rpcError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido cambiar la visibilidad.",
        },
        {
          status:
            500,
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
        visible
          ? "REVIEW_SHOWN"
          : "REVIEW_HIDDEN",

      entityType:
        "REVIEW",

      entityId:
        review.id,

      businessId:
        review.business_id,

      targetUserId:
        review.user_id,

      description:
        visible
          ? `Se volvió a mostrar la reseña ${review.id}.`
          : `Se ocultó la reseña ${review.id}.`,

      oldValues: {
        visible:
          review.visible,
      },

      newValues: {
        visible,
      },

      metadata: {
        booking_id:
          review.booking_id,

        rating:
          review.rating,

        comment:
          review.comment,
      },
    });

    return NextResponse.json({
      success:
        true,

      visible,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected review visibility error:",
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