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
  checkRateLimit,
} from "@/lib/api/rate-limit";

type RequestBody = {
  subscriptionId?: unknown;
};

export async function DELETE(
  request:
    NextRequest
) {
  try {
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
     * PERFIL
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
          is_blocked
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Error checking subscription user:",
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

    if (
      !profile
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
      profile.is_blocked
    ) {
      return NextResponse.json(
        {
          error:
            "Tu cuenta está bloqueada.",
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

    const subscriptionId =
      typeof body.subscriptionId ===
        "string"
        ? body.subscriptionId.trim()
        : "";

    if (
      !subscriptionId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador de la suscripción.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        subscriptionId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador de la suscripción no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * COMPROBAR PROPIEDAD
     * ============================================================
     *
     * No confiamos en el ID enviado por el navegador.
     * La suscripción tiene que pertenecer al usuario autenticado.
     */

    const {
      data:
        subscription,
      error:
        subscriptionError,
    } =
      await admin
        .from(
          "business_subscriptions"
        )
        .select(`
          id,
          user_id,
          business_id
        `)
        .eq(
          "id",
          subscriptionId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Error checking subscription before delete:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la suscripción.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !subscription
    ) {
      return NextResponse.json(
        {
          error:
            "La suscripción no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    const rateLimit = await checkRateLimit({
      identifier: user.id,
      prefix: "account-subscriptions-delete",
      limit: 30,
      window: "1 h",
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status }
      );
    }

    /*
     * ============================================================
     * ELIMINAR
     * ============================================================
     */

    const {
      error:
        deleteError,
    } =
      await admin
        .from(
          "business_subscriptions"
        )
        .delete()
        .eq(
          "id",
          subscription.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      deleteError
    ) {
      console.error(
        "Error deleting business subscription:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido cancelar la suscripción.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      success:
        true,

      subscriptionId:
        subscription.id,

      businessId:
        subscription.business_id,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected subscription delete error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al cancelar la suscripción.",
      },
      {
        status:
          500,
      }
    );
  }
}
