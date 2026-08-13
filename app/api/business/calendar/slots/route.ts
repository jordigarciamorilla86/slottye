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

type RequestBody = {
  slotIds?: unknown;
};

type RpcResult = {
  slot_id: string;
  action:
    | "BLOCKED"
    | "DELETED";
};

/*
 * ============================================================
 * ELIMINAR / BLOQUEAR HUECOS
 * ============================================================
 */

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
     * ==========================================================
     * SESIÓN
     * ==========================================================
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
     * ==========================================================
     * PERFIL
     * ==========================================================
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
        "Error checking calendar slot user:",
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
      !profile ||
      profile.role !==
        "business"
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
     * ==========================================================
     * BODY
     * ==========================================================
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

    if (
      !Array.isArray(
        body.slotIds
      )
    ) {
      return NextResponse.json(
        {
          error:
            "No se han recibido huecos.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ==========================================================
     * NORMALIZAR Y VALIDAR IDS
     * ==========================================================
     */

    const normalizedIds =
      body.slotIds
        .filter(
          (
            value
          ):
            value is string =>
            typeof value ===
              "string"
        )
        .map(
          (
            value
          ) =>
            value.trim()
        )
        .filter(
          (
            value
          ) =>
            value.length >
            0
        );

    if (
      normalizedIds.length !==
        body.slotIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Uno o varios identificadores de hueco no son válidos.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      normalizedIds.some(
        (
          slotId
        ) =>
          !isUuid(
            slotId
          )
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Uno o varios identificadores de hueco no son válidos.",
        },
        {
          status:
            400,
        }
      );
    }

    const slotIds =
      [
        ...new Set(
          normalizedIds
        ),
      ];

    if (
      slotIds.length ===
        0
    ) {
      return NextResponse.json(
        {
          error:
            "No se han recibido huecos válidos.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * Evitamos peticiones absurdamente grandes.
     */

    if (
      slotIds.length >
        500
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes eliminar más de 500 huecos en una sola operación.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ==========================================================
     * RPC TRANSACCIONAL
     * ==========================================================
     *
     * La propia función:
     * - comprueba auth.uid();
     * - comprueba propietario;
     * - exige status AVAILABLE;
     * - mantiene como BLOCKED los slots con historial;
     * - elimina los que no tienen historial.
     *
     * Usamos el cliente autenticado `supabase`
     * para conservar auth.uid() dentro de la RPC.
     */

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "delete_calendar_slots",
        {
          p_slot_ids:
            slotIds,
        }
      );

    if (
      error
    ) {
      console.error(
        "Calendar slot deletion RPC error:",
        error
      );

      const message =
        typeof error.message ===
          "string"
          ? error.message
              .toLowerCase()
          : "";

      if (
        message.includes(
          "do not exist"
        ) ||
        message.includes(
          "not available"
        ) ||
        message.includes(
          "do not belong"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Uno o varios huecos ya no están disponibles o no pertenecen a tu negocio.",
          },
          {
            status:
              409,
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

      if (
        message.includes(
          "not authorized"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permisos para modificar estos huecos.",
          },
          {
            status:
              403,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "No se han podido eliminar los huecos.",
        },
        {
          status:
            400,
        }
      );
    }

    const results =
      (
        data ??
        []
      ) as RpcResult[];

    const deletedIds =
      results
        .filter(
          (
            result
          ) =>
            result.action ===
              "DELETED"
        )
        .map(
          (
            result
          ) =>
            result.slot_id
        );

    const blockedIds =
      results
        .filter(
          (
            result
          ) =>
            result.action ===
              "BLOCKED"
        )
        .map(
          (
            result
          ) =>
            result.slot_id
        );

    return NextResponse.json({
      success:
        true,

      deletedIds,

      blockedIds,

      deletedCount:
        deletedIds.length,

      blockedCount:
        blockedIds.length,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected calendar slot deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al eliminar los huecos.",
      },
      {
        status:
          500,
      }
    );
  }
}