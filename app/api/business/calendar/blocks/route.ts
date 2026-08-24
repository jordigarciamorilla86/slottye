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

type CreateBody = {
  businessId?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  reason?: unknown;
};

type DeleteBody = {
  blockId?: unknown;
};

type RpcBlock = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type RpcCreateResult = {
  block?: RpcBlock;

  blocked_slot_ids?: string[];

  blocked_count?: number;

  booked_count?: number;
};

/*
 * ============================================================
 * COMPROBAR USUARIO BUSINESS
 * ============================================================
 */

async function requireBusinessUser() {
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
      success:
        false as const,

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
        role,
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
      "Error checking calendar block user:",
      profileError
    );

    return {
      success:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "No se ha podido comprobar la cuenta.",
          },
          {
            status:
              500,
          }
        ),
    };
  }

  if (
    !profile ||
    profile.role !==
      "business"
  ) {
    return {
      success:
        false as const,

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

  if (
    profile.is_blocked
  ) {
    return {
      success:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Tu cuenta está bloqueada.",
          },
          {
            status:
              403,
          }
        ),
    };
  }

  return {
    success:
      true as const,

    supabase,
    admin,
    user,
  };
}

/*
 * ============================================================
 * CREAR BLOQUEO
 * ============================================================
 */

export async function POST(
  request:
    NextRequest
) {
  try {
    const authorization =
      await requireBusinessUser();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const {
      supabase,
      admin,
      user,
    } =
      authorization;

    const rateLimit = await checkRateLimit({
      identifier: user.id,
      prefix: "business-calendar-blocks-create",
      limit: 60,
      window: "1 h",
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status }
      );
    }

    const bodyResult =
      await readJsonBody<CreateBody>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

    const businessId =
      typeof body.businessId ===
      "string"
        ? body.businessId.trim()
        : "";

    const startAt =
      typeof body.startAt ===
      "string"
        ? body.startAt.trim()
        : "";

    const endAt =
      typeof body.endAt ===
      "string"
        ? body.endAt.trim()
        : "";

    const reason =
      typeof body.reason ===
      "string"
        ? body.reason.trim()
        : "";

    if (
      !businessId ||
      !startAt ||
      !endAt
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan datos para crear el bloqueo.",
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

    const start =
      new Date(
        startAt
      );

    const end =
      new Date(
        endAt
      );

    if (
      !Number.isFinite(
        start.getTime()
      ) ||
      !Number.isFinite(
        end.getTime()
      ) ||
      end <=
        start
    ) {
      return NextResponse.json(
        {
          error:
            "El periodo seleccionado no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ==========================================================
     * COMPROBAR PROPIEDAD
     * ==========================================================
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
          owner_id
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
        "Error checking calendar block business:",
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

    if (
      business.owner_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para modificar este calendario.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ==========================================================
     * RPC TRANSACCIONAL
     * ==========================================================
     */

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "create_calendar_block",
        {
          p_business_id:
            business.id,

          p_start_at:
            start.toISOString(),

          p_end_at:
            end.toISOString(),

          p_reason:
            reason ||
            null,
        }
      );

    if (
      error
    ) {
      console.error(
        "Create calendar block RPC error:",
        error
      );

      const message =
        error.message
          .toLowerCase();

      if (
        message.includes(
          "block already exists"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Ese periodo ya está bloqueado.",
          },
          {
            status:
              409,
          }
        );
      }

      if (
        message.includes(
          "block is in the past"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "No puedes bloquear un periodo que ya ha pasado.",
          },
          {
            status:
              400,
          }
        );
      }

      if (
        message.includes(
          "invalid block dates"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El periodo seleccionado no es válido.",
          },
          {
            status:
              400,
          }
        );
      }

      if (
        message.includes(
          "not authorized"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permisos para modificar este calendario.",
          },
          {
            status:
              403,
          }
        );
      }

      if (
        message.includes(
          "business not found"
        )
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

      if (
        message.includes(
          "not authenticated"
        )
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

      console.error(
        "Unexpected create_calendar_block RPC error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido crear el bloqueo.",
        },
        {
          status:
            500,
        }
      );
    }

    const result =
      (
        data ??
        {}
      ) as RpcCreateResult;

    return NextResponse.json({
      success:
        true,

      block:
        result.block ??
        null,

      blockedSlotIds:
        result.blocked_slot_ids ??
        [],

      blockedCount:
        result.blocked_count ??
        0,

      bookedCount:
        result.booked_count ??
        0,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected calendar block creation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al crear el bloqueo.",
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
 * ELIMINAR BLOQUEO
 * ============================================================
 */

export async function DELETE(
  request:
    NextRequest
) {
  try {
    const authorization =
      await requireBusinessUser();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const {
      admin,
      user,
    } =
      authorization;

    const rateLimit = await checkRateLimit({
      identifier: user.id,
      prefix: "business-calendar-blocks-delete",
      limit: 60,
      window: "1 h",
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status }
      );
    }

    const bodyResult =
      await readJsonBody<DeleteBody>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

    const blockId =
      typeof body.blockId ===
      "string"
        ? body.blockId.trim()
        : "";

    if (
      !blockId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del bloqueo.",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !isUuid(
        blockId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del bloqueo no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * Obtenemos business_id desde el bloqueo real.
     * No confiamos en un businessId enviado por cliente.
     */

    const {
      data:
        block,
      error:
        blockError,
    } =
      await admin
        .from(
          "business_blocks"
        )
        .select(`
          id,
          business_id
        `)
        .eq(
          "id",
          blockId
        )
        .maybeSingle();

    if (
      blockError
    ) {
      console.error(
        "Error checking calendar block before delete:",
        blockError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el bloqueo.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !block
    ) {
      return NextResponse.json(
        {
          error:
            "El bloqueo ya no existe.",
        },
        {
          status:
            404,
        }
      );
    }

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
          owner_id
        `)
        .eq(
          "id",
          block.business_id
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error checking business before calendar block deletion:",
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
      !business ||
      business.owner_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para eliminar este bloqueo.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * IMPORTANTE:
     *
     * Mantiene exactamente el comportamiento actual:
     * eliminar el bloqueo NO vuelve a activar automáticamente
     * los slots que quedaron BLOCKED.
     */

    const {
      error:
        deleteError,
    } =
      await admin
        .from(
          "business_blocks"
        )
        .delete()
        .eq(
          "id",
          block.id
        );

    if (
      deleteError
    ) {
      console.error(
        "Error deleting calendar block:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido eliminar el bloqueo.",
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

      blockId:
        block.id,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected calendar block deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al eliminar el bloqueo.",
      },
      {
        status:
          500,
      }
    );
  }
}
