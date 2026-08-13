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

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

type PatchRequestBody = {
  subscriptionId?: unknown;
  emailEnabled?: unknown;
};

type DeleteRequestBody = {
  subscriptionId?: unknown;
};

async function requireAdmin() {
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

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
    return {
      admin:
        null,

      response:
        NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              401,
          }
        ),
    };
  }

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
        is_admin
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
      "Error checking admin permissions for subscribers:",
      profileError
    );

    return {
      admin:
        null,

      response:
        NextResponse.json(
          {
            error:
              "No se han podido comprobar los permisos.",
          },
          {
            status:
              500,
          }
        ),
    };
  }

  if (
    !profile
      ?.is_admin
  ) {
    return {
      admin:
        null,

      response:
        NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              403,
          }
        ),
    };
  }

  return {
    admin,
    response:
      null,
  };
}

/*
 * ============================================================
 * ACTIVAR O DESACTIVAR AVISOS
 * ============================================================
 */

export async function PATCH(
  request:
    NextRequest,
  {
    params,
  }:
    RouteContext
) {
  try {
    const {
      businessId,
    } =
      await params;

    if (
      !businessId ||
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

    const {
      admin,
      response:
        authorizationResponse,
    } =
      await requireAdmin();

    if (
      authorizationResponse ||
      !admin
    ) {
      return authorizationResponse;
    }

    const bodyResult =
      await readJsonBody<PatchRequestBody>(
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

    const emailEnabled =
      body.emailEnabled;

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

    if (
      typeof emailEnabled !==
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

    const {
      data:
        subscription,
      error:
        updateError,
    } =
      await admin
        .from(
          "business_subscriptions"
        )
        .update({
          email_enabled:
            emailEnabled,
        })
        .eq(
          "id",
          subscriptionId
        )
        .eq(
          "business_id",
          businessId
        )
        .select(`
          id,
          user_id,
          business_id,
          email_enabled,
          created_at,

          profiles (
            id,
            name,
            email,
            is_blocked
          )
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Error updating subscriber email status:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido actualizar la suscripción.",
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

    const profile =
      Array.isArray(
        subscription.profiles
      )
        ? subscription
            .profiles[0] ??
          null
        : subscription.profiles;

    return NextResponse.json({
      subscription: {
        ...subscription,
        profiles:
          profile,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected subscriber update error:",
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

/*
 * ============================================================
 * ELIMINAR SUSCRIPCIÓN
 * ============================================================
 */

export async function DELETE(
  request:
    NextRequest,
  {
    params,
  }:
    RouteContext
) {
  try {
    const {
      businessId,
    } =
      await params;

    if (
      !businessId ||
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

    const {
      admin,
      response:
        authorizationResponse,
    } =
      await requireAdmin();

    if (
      authorizationResponse ||
      !admin
    ) {
      return authorizationResponse;
    }

    const bodyResult =
      await readJsonBody<DeleteRequestBody>(
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
          user_id
        `)
        .eq(
          "id",
          subscriptionId
        )
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Error checking subscription before admin deletion:",
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
          "business_id",
          businessId
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
            "No se ha podido eliminar la suscripción.",
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
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected subscriber deletion error:",
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