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

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

type ServiceInput = {
  serviceId?: unknown;
  name?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  active?: unknown;
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
      "Error checking admin permissions for services:",
      profileError
    );

    return {
      success:
        false as const,

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

      admin:
        null,

      user:
        null,
    };
  }

  if (
    !profile
      ?.is_admin
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
    };
  }

  return {
    success:
      true as const,

    response:
      null,

    admin,
    user,
  };
}

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

  if (!normalizedName) {
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

async function getBusiness(
  admin:
    ReturnType<
      typeof createAdminClient
    >,
  businessId:
    string
) {
  return admin
    .from(
      "businesses"
    )
    .select(`
      id,
      name,
      owner_id
    `)
    .eq(
      "id",
      businessId
    )
    .maybeSingle();
}

/*
 * ============================================================
 * CREAR SERVICIO
 * ============================================================
 */

export async function POST(
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
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const bodyResult =
      await readJsonBody<ServiceInput>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

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
        business,
      error:
        businessError,
    } =
      await getBusiness(
        authorization.admin,
        businessId
      );

    if (
      businessError
    ) {
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

    if (!business) {
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

    const {
      data:
        service,
      error:
        serviceError,
    } =
      await authorization.admin
        .from(
          "services"
        )
        .insert({
          business_id:
            business.id,

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
      serviceError
    ) {
      console.error(
        "Error creating admin service:",
        serviceError
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

    if (
      !service
    ) {
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

    await writeAdminAuditLog({
      adminUserId:
        authorization.user.id,

      action:
        "SERVICE_CREATED",

      entityType:
        "SERVICE",

      entityId:
        service.id,

      businessId:
        business.id,

      targetUserId:
        business.owner_id,

      description:
        `Se creó el servicio ${service.name} en ${business.name}.`,

      newValues: {
        name:
          service.name,

        description:
          service.description,

        duration_minutes:
          service.duration_minutes,

        active:
          service.active,
      },
    });

    return NextResponse.json({
      service,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin service creation error:",
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
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const bodyResult =
      await readJsonBody<ServiceInput>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

    const serviceId =
      typeof body.serviceId ===
        "string"
        ? body.serviceId.trim()
        : "";

    if (!serviceId) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del servicio.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        serviceId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del servicio no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        business,
      error:
        businessError,
    } =
      await getBusiness(
        authorization.admin,
        businessId
      );

    if (
      businessError
    ) {
      console.error(
        "Error checking business before admin service update:",
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
          business.id
        )
        .maybeSingle();

    if (
      currentServiceError
    ) {
      console.error(
        "Error checking service before admin update:",
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
            business.id
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
        error
      ) {
        console.error(
          "Error changing admin service status:",
          error
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido cambiar el estado.",
          },
          {
            status:
              500,
          }
        );
      }

      if (
        !service
      ) {
        return NextResponse.json(
          {
            error:
              "No se ha podido cambiar el estado.",
          },
          {
            status:
              500,
          }
        );
      }

      await writeAdminAuditLog({
        adminUserId:
          authorization.user.id,

        action:
          service.active
            ? "SERVICE_ACTIVATED"
            : "SERVICE_DEACTIVATED",

        entityType:
          "SERVICE",

        entityId:
          service.id,

        businessId:
          business.id,

        targetUserId:
          business.owner_id,

        description:
          service.active
            ? `Se activó el servicio ${service.name} de ${business.name}.`
            : `Se desactivó el servicio ${service.name} de ${business.name}.`,

        oldValues: {
          active:
            currentService.active,
        },

        newValues: {
          active:
            service.active,
        },
      });

      return NextResponse.json({
        service,
      });
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
          business.id
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
      updateError
    ) {
      console.error(
        "Error editing admin service:",
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

    if (
      !service
    ) {
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

    await writeAdminAuditLog({
      adminUserId:
        authorization.user.id,

      action:
        "SERVICE_UPDATED",

      entityType:
        "SERVICE",

      entityId:
        service.id,

      businessId:
        business.id,

      targetUserId:
        business.owner_id,

      description:
        `Se editó el servicio ${service.name} de ${business.name}.`,

      oldValues: {
        name:
          currentService.name,

        description:
          currentService.description,

        duration_minutes:
          currentService.duration_minutes,
      },

      newValues: {
        name:
          service.name,

        description:
          service.description,

        duration_minutes:
          service.duration_minutes,
      },
    });

    return NextResponse.json({
      service,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin service update error:",
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
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const bodyResult =
      await readJsonBody<ServiceInput>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

    const serviceId =
      typeof body.serviceId ===
        "string"
        ? body.serviceId.trim()
        : "";

    if (!serviceId) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del servicio.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        serviceId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del servicio no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        business,
      error:
        businessError,
    } =
      await getBusiness(
        authorization.admin,
        businessId
      );

    if (
      businessError
    ) {
      console.error(
        "Error checking business before admin service deletion:",
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

    if (!business) {
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

    const {
      data:
        service,
      error:
        serviceError,
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
          business.id
        )
        .maybeSingle();

    if (
      serviceError
    ) {
      console.error(
        "Error checking service before admin deletion:",
        serviceError
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

    if (!service) {
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

    const {
      data:
        deleteResultData,
      error:
        deleteError,
    } =
      await authorization.admin.rpc(
        "delete_business_service_transactional",
        {
          p_business_id:
            business.id,

          p_service_id:
            service.id,
        }
      );

    if (
      deleteError
    ) {
      const message =
        deleteError.message
          ?.trim() ??
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

      if (
        message.includes(
          "BUSINESS_ID_REQUIRED"
        ) ||
        message.includes(
          "SERVICE_ID_REQUIRED"
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

      console.error(
        "Error deleting admin service transactionally:",
        deleteError
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

    const deleteResult =
      Array.isArray(
        deleteResultData
      )
        ? deleteResultData[0] ??
          null
        : deleteResultData;

    if (
      !deleteResult
    ) {
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

    const onlineBookings =
      Number(
        deleteResult.online_bookings ??
        0
      );

    const manualBookings =
      Number(
        deleteResult.manual_bookings ??
        0
      );

    const totalBookings =
      onlineBookings +
      manualBookings;

    if (
      deleteResult.deleted !==
        true
    ) {
      return NextResponse.json(
        {
          error:
            `Este servicio tiene ${totalBookings} reserva${totalBookings === 1 ? "" : "s"} asociada${totalBookings === 1 ? "" : "s"} y no puede eliminarse sin perder información del historial. Puedes desactivarlo.`,

          code:
            "SERVICE_HAS_BOOKINGS",

          counts: {
            onlineBookings,

            manualBookings,

            total:
              totalBookings,
          },
        },
        {
          status:
            409,
        }
      );
    }

    const deletedSlots =
      Number(
        deleteResult.deleted_slots ??
        0
      );

    await writeAdminAuditLog({
      adminUserId:
        authorization.user.id,

      action:
        "SERVICE_DELETED",

      entityType:
        "SERVICE",

      entityId:
        service.id,

      businessId:
        business.id,

      targetUserId:
        business.owner_id,

      description:
        `Se eliminó el servicio ${service.name} de ${business.name}.`,

      oldValues: {
        name:
          service.name,

        description:
          service.description,

        duration_minutes:
          service.duration_minutes,

        active:
          service.active,
      },

      newValues: {
        deleted:
          true,
      },

      metadata: {
        deleted_slots:
          deletedSlots,
      },
    });

    return NextResponse.json({
      success:
        true,

      deletedServiceId:
        service.id,

      deletedSlots,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin service deletion error:",
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