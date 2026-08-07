import {
  NextRequest,
  NextResponse,
} from "next/server";

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
  } =
    await supabase.auth.getUser();

  if (!user) {
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
    profileError ||
    !profile?.is_admin
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

    const authorization =
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const body:
      ServiceInput =
      await request.json();

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
      serviceError ||
      !service
    ) {
      return NextResponse.json(
        {
          error:
            serviceError?.message ??
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

    const authorization =
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const body:
      ServiceInput =
      await request.json();

    const serviceId =
      typeof body.serviceId ===
      "string"
        ? body.serviceId
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
      businessError ||
      !business
    ) {
      return NextResponse.json(
        {
          error:
            "El negocio no existe.",
        },
        {
          status:
            businessError
              ? 500
              : 404,
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
      currentServiceError ||
      !currentService
    ) {
      return NextResponse.json(
        {
          error:
            "El servicio no existe.",
        },
        {
          status:
            currentServiceError
              ? 500
              : 404,
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
        error ||
        !service
      ) {
        return NextResponse.json(
          {
            error:
              error?.message ??
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
      updateError ||
      !service
    ) {
      return NextResponse.json(
        {
          error:
            updateError?.message ??
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

    const authorization =
      await requireAdmin();

    if (
      !authorization.success
    ) {
      return authorization.response;
    }

    const body:
      ServiceInput =
      await request.json();

    const serviceId =
      typeof body.serviceId ===
      "string"
        ? body.serviceId
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

    const {
      data:
        business,
    } =
      await getBusiness(
        authorization.admin,
        businessId
      );

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
        serviceSlots,
      error:
        slotsError,
    } =
      await authorization.admin
        .from(
          "slots"
        )
        .select(
          "id"
        )
        .eq(
          "business_id",
          business.id
        )
        .eq(
          "service_id",
          service.id
        );

    if (
      slotsError
    ) {
      return NextResponse.json(
        {
          error:
            "No se han podido comprobar las disponibilidades.",
        },
        {
          status:
            500,
        }
      );
    }

    const slotIds =
      (
        serviceSlots ??
        []
      ).map(
        (
          slot
        ) =>
          slot.id
      );

    const [
      onlineResult,
      manualResult,
      slotResult,
    ] =
      await Promise.all([
        authorization.admin
          .from(
            "bookings"
          )
          .select(
            "id",
            {
              count:
                "exact",

              head:
                true,
            }
          )
          .eq(
            "business_id",
            business.id
          )
          .eq(
            "service_id",
            service.id
          ),

        authorization.admin
          .from(
            "manual_bookings"
          )
          .select(
            "id",
            {
              count:
                "exact",

              head:
                true,
            }
          )
          .eq(
            "business_id",
            business.id
          )
          .eq(
            "service_id",
            service.id
          ),

        slotIds.length >
          0
          ? authorization.admin
              .from(
                "bookings"
              )
              .select(
                "id",
                {
                  count:
                    "exact",

                  head:
                    true,
                }
              )
              .in(
                "slot_id",
                slotIds
              )
          : Promise.resolve({
              count:
                0,

              error:
                null,
            }),
      ]);

    if (
      onlineResult.error ||
      manualResult.error ||
      slotResult.error
    ) {
      return NextResponse.json(
        {
          error:
            "No se han podido comprobar las reservas asociadas.",
        },
        {
          status:
            500,
        }
      );
    }

    const onlineBookings =
      Math.max(
        onlineResult.count ??
          0,
        slotResult.count ??
          0
      );

    const manualBookings =
      manualResult.count ??
      0;

    const totalBookings =
      onlineBookings +
      manualBookings;

    if (
      totalBookings >
      0
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

    const {
      error:
        deleteSlotsError,
    } =
      await authorization.admin
        .from(
          "slots"
        )
        .delete()
        .eq(
          "business_id",
          business.id
        )
        .eq(
          "service_id",
          service.id
        );

    if (
      deleteSlotsError
    ) {
      return NextResponse.json(
        {
          error:
            "No se han podido eliminar sus disponibilidades.",
        },
        {
          status:
            500,
        }
      );
    }

    const {
      error:
        deleteServiceError,
    } =
      await authorization.admin
        .from(
          "services"
        )
        .delete()
        .eq(
          "id",
          service.id
        )
        .eq(
          "business_id",
          business.id
        );

    if (
      deleteServiceError
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
          slotIds.length,
      },
    });

    return NextResponse.json({
      success:
        true,

      deletedServiceId:
        service.id,

      deletedSlots:
        slotIds.length,
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