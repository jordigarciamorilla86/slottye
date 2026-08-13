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

type ServiceInput = {
  serviceId?: unknown;
  name?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  active?: unknown;
};

type DeleteServiceRpcRow = {
  deleted: boolean;
  deleted_service_id: string;
  deleted_slots: number;
  online_bookings: number;
  manual_bookings: number;
};

/*
 * ============================================================
 * AUTORIZACIÓN DEL PROPIETARIO
 * ============================================================
 */

async function requireBusinessOwner(
  businessId?: string
) {
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

      admin:
        null,

      user:
        null,

      business:
        null,
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
      "Error checking service business profile:",
      profileError
    );

    return {
      success:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "No se ha podido comprobar tu cuenta.",
          },
          {
            status:
              500,
          }
        ),

      admin:
        null,

      user:
        null,

      business:
        null,
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

      admin:
        null,

      user:
        null,

      business:
        null,
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

      admin:
        null,

      user:
        null,

      business:
        null,
    };
  }

  let businessQuery =
    admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        owner_id
      `)
      .eq(
        "owner_id",
        user.id
      );

  if (
    businessId
  ) {
    businessQuery =
      businessQuery.eq(
        "id",
        businessId
      );
  }

  const {
    data:
      business,
    error:
      businessError,
  } =
    await businessQuery
      .maybeSingle();

  if (
    businessError
  ) {
    console.error(
      "Error checking service business owner:",
      businessError
    );

    return {
      success:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "No se ha podido comprobar el negocio.",
          },
          {
            status:
              500,
          }
        ),

      admin:
        null,

      user:
        null,

      business:
        null,
    };
  }

  if (
    !business
  ) {
    return {
      success:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "El negocio no existe o no te pertenece.",
          },
          {
            status:
              403,
          }
        ),

      admin:
        null,

      user:
        null,

      business:
        null,
    };
  }

  return {
    success:
      true as const,

    response:
      null,

    admin,
    user,
    business,
  };
}

/*
 * ============================================================
 * VALIDAR DATOS DEL SERVICIO
 * ============================================================
 */

function normalizeServiceData({
  name,
  description,
  durationMinutes,
}: ServiceInput) {
  const normalizedName =
    typeof name ===
    "string"
      ? name.trim()
      : "";

  const normalizedDescription =
    typeof description ===
    "string"
      ? description.trim()
      : "";

  const normalizedDuration =
    Number(
      durationMinutes
    );

  if (
    !normalizedName
  ) {
    return {
      success:
        false as const,

      error:
        "El nombre del servicio es obligatorio.",
    };
  }

  if (
    !Number.isInteger(
      normalizedDuration
    ) ||
    normalizedDuration <
      1 ||
    normalizedDuration >
      1440
  ) {
    return {
      success:
        false as const,

      error:
        "La duración debe ser un número entero entre 1 y 1440 minutos.",
    };
  }

  return {
    success:
      true as const,

    name:
      normalizedName,

    description:
      normalizedDescription ||
      null,

    durationMinutes:
      normalizedDuration,
  };
}

/*
 * ============================================================
 * CREAR SERVICIO
 * ============================================================
 */

export async function POST(
  request:
    NextRequest
) {
  try {
    const bodyResult =
      await readJsonBody<
        ServiceInput & {
          businessId?: unknown;
        }
      >(
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

    const authorization =
      await requireBusinessOwner(
        businessId
      );

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const normalized =
      normalizeServiceData(
        body
      );

    if (
      !normalized.success
    ) {
      return NextResponse.json(
        {
          error:
            normalized.error,
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        service,
      error,
    } =
      await authorization.admin
        .from(
          "services"
        )
        .insert({
          business_id:
            authorization.business.id,

          name:
            normalized.name,

          description:
            normalized.description,

          duration_minutes:
            normalized.durationMinutes,

          active:
            true,
        })
        .select(`
          id,
          name,
          description,
          duration_minutes,
          active
        `)
        .single();

    if (
      error ||
      !service
    ) {
      console.error(
        "Error creating business service:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido crear el servicio.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      service,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business service creation error:",
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
 * EDITAR O ACTIVAR/DESACTIVAR
 * ============================================================
 */

export async function PATCH(
  request:
    NextRequest
) {
  try {
    const bodyResult =
      await readJsonBody<
        ServiceInput & {
          businessId?: unknown;
        }
      >(
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

    const serviceId =
      typeof body.serviceId ===
        "string"
        ? body.serviceId.trim()
        : "";

    if (
      !businessId ||
      !serviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Datos incompletos.",
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
      ) ||
      !isUuid(
        serviceId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Los identificadores enviados no son válidos.",
        },
        {
          status:
            400,
        }
      );
    }

    const authorization =
      await requireBusinessOwner(
        businessId
      );

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const {
      data:
        currentService,
      error:
        currentServiceError,
    } =
      await authorization.admin
        .from(
          "services"
        )
        .select(`
          id,
          name,
          description,
          duration_minutes,
          active
        `)
        .eq(
          "id",
          serviceId
        )
        .eq(
          "business_id",
          authorization.business.id
        )
        .maybeSingle();

    if (
      currentServiceError
    ) {
      console.error(
        "Error loading business service:",
        currentServiceError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el servicio.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !currentService
    ) {
      return NextResponse.json(
        {
          error:
            "El servicio no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * ACTIVAR / DESACTIVAR
     * ============================================================
     */

    if (
      typeof body.active ===
        "boolean" &&
      body.name ===
        undefined &&
      body.durationMinutes ===
        undefined
    ) {
      const {
        data:
          service,
        error,
      } =
        await authorization.admin
          .from(
            "services"
          )
          .update({
            active:
              body.active,
          })
          .eq(
            "id",
            serviceId
          )
          .eq(
            "business_id",
            authorization.business.id
          )
          .select(`
            id,
            name,
            description,
            duration_minutes,
            active
          `)
          .maybeSingle();

      if (
        error ||
        !service
      ) {
        console.error(
          "Error changing business service status:",
          error
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido cambiar el estado del servicio.",
          },
          {
            status:
              500,
          }
        );
      }

      return NextResponse.json({
        service,
      });
    }

    /*
     * ============================================================
     * EDITAR DATOS
     * ============================================================
     */

    const normalized =
      normalizeServiceData(
        body
      );

    if (
      !normalized.success
    ) {
      return NextResponse.json(
        {
          error:
            normalized.error,
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        service,
      error:
        updateError,
    } =
      await authorization.admin
        .from(
          "services"
        )
        .update({
          name:
            normalized.name,

          description:
            normalized.description,

          duration_minutes:
            normalized.durationMinutes,
        })
        .eq(
          "id",
          serviceId
        )
        .eq(
          "business_id",
          authorization.business.id
        )
        .select(`
          id,
          name,
          description,
          duration_minutes,
          active
        `)
        .maybeSingle();

    if (
      updateError ||
      !service
    ) {
      console.error(
        "Error editing business service:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido editar el servicio.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      service,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business service update error:",
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
 * ELIMINAR SERVICIO
 * ============================================================
 */

export async function DELETE(
  request:
    NextRequest
) {
  try {
    const bodyResult =
      await readJsonBody<
        ServiceInput & {
          businessId?: unknown;
        }
      >(
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

    const serviceId =
      typeof body.serviceId ===
        "string"
        ? body.serviceId.trim()
        : "";

    if (
      !businessId ||
      !serviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Datos incompletos.",
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
      ) ||
      !isUuid(
        serviceId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Los identificadores enviados no son válidos.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * AUTORIZACIÓN
     * ============================================================
     */

    const authorization =
      await requireBusinessOwner(
        businessId
      );

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    /*
     * ============================================================
     * ELIMINACIÓN TRANSACCIONAL
     * ============================================================
     *
     * PostgreSQL:
     *
     * 1. Bloquea el servicio.
     * 2. Bloquea sus slots.
     * 3. Comprueba reservas online.
     * 4. Comprueba reservas manuales.
     * 5. Si existe historial, no elimina nada.
     * 6. Si no existe, elimina slots + servicio.
     *
     * Todo ocurre dentro de una única transacción.
     */

    const {
      data:
        deletionRows,
      error:
        deletionError,
    } =
      await authorization.admin
        .rpc(
          "delete_business_service_transactional",
          {
            p_business_id:
              authorization.business.id,

            p_service_id:
              serviceId,
          }
        );

    if (
      deletionError
    ) {
      console.error(
        "Transactional business service deletion error:",
        deletionError
      );

      const message =
        deletionError.message ??
        "";

      if (
        message.includes(
          "SERVICE_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El servicio no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "No se ha podido eliminar el servicio.",
        },
        {
          status:
            500,
        }
      );
    }

    const result =
      (
        deletionRows?.[0] ??
        null
      ) as
        | DeleteServiceRpcRow
        | null;

    if (
      !result
    ) {
      console.error(
        "Service deletion RPC returned no result:",
        {
          businessId:
            authorization.business.id,

          serviceId,
        }
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido eliminar el servicio.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * EXISTEN RESERVAS
     * ============================================================
     */

    if (
      !result.deleted
    ) {
      const onlineBookings =
        Number(
          result.online_bookings ??
          0
        );

      const manualBookings =
        Number(
          result.manual_bookings ??
          0
        );

      const associatedBookings =
        onlineBookings +
        manualBookings;

      return NextResponse.json(
        {
          error:
            `Este servicio tiene ${associatedBookings} reserva${associatedBookings === 1 ? "" : "s"} asociada${associatedBookings === 1 ? "" : "s"} y no puede eliminarse sin perder información del historial. Puedes desactivarlo.`,

          code:
            "SERVICE_HAS_BOOKINGS",

          counts: {
            onlineBookings,

            manualBookings,

            total:
              associatedBookings,
          },
        },
        {
          status:
            409,
        }
      );
    }

    /*
     * ============================================================
     * OK
     * ============================================================
     */

    return NextResponse.json({
      success:
        true,

      deletedServiceId:
        result.deleted_service_id,

      deletedSlots:
        Number(
          result.deleted_slots ??
          0
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business service deletion error:",
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