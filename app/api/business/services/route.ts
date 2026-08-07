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
  
  type ServiceInput = {
    serviceId?: unknown;
    name?: unknown;
    description?: unknown;
    durationMinutes?: unknown;
    active?: unknown;
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
      profileError ||
      !profile ||
      profile.role !==
        "business" ||
      profile.is_blocked
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
  
    if (businessId) {
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
  
    if (!business) {
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
      const body:
        ServiceInput & {
          businessId?: unknown;
        } =
        await request.json();
  
      const businessId =
        typeof body.businessId ===
        "string"
          ? body.businessId
          : "";
  
      if (!businessId) {
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
              error?.message ??
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
      const body:
        ServiceInput & {
          businessId?: unknown;
        } =
        await request.json();
  
      const businessId =
        typeof body.businessId ===
        "string"
          ? body.businessId
          : "";
  
      const serviceId =
        typeof body.serviceId ===
        "string"
          ? body.serviceId
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
       * Si se recibe únicamente active,
       * se trata de activar o desactivar.
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
                error?.message ??
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
       * Edición de nombre, descripción y duración.
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
              updateError?.message ??
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
      const body:
        ServiceInput & {
          businessId?: unknown;
        } =
        await request.json();
  
      const businessId =
        typeof body.businessId ===
        "string"
          ? body.businessId
          : "";
  
      const serviceId =
        typeof body.serviceId ===
        "string"
          ? body.serviceId
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
            authorization.business.id
          )
          .maybeSingle();
  
      if (
        serviceError
      ) {
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
            authorization.business.id
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
              "No se han podido comprobar las disponibilidades del servicio.",
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
        onlineBookingsResult,
        manualBookingsResult,
        slotBookingsResult,
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
              authorization.business.id
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
              authorization.business.id
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
        onlineBookingsResult.error ||
        manualBookingsResult.error ||
        slotBookingsResult.error
      ) {
        console.error(
          "Error checking service bookings:",
          onlineBookingsResult.error ??
            manualBookingsResult.error ??
            slotBookingsResult.error
        );
  
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
        onlineBookingsResult.count ??
        0;
  
      const manualBookings =
        manualBookingsResult.count ??
        0;
  
      const bookingsThroughSlots =
        slotBookingsResult.count ??
        0;
  
      const associatedBookings =
        Math.max(
          onlineBookings,
          bookingsThroughSlots
        ) +
        manualBookings;
  
      if (
        associatedBookings >
        0
      ) {
        return NextResponse.json(
          {
            error:
              `Este servicio tiene ${associatedBookings} reserva${associatedBookings === 1 ? "" : "s"} asociada${associatedBookings === 1 ? "" : "s"} y no puede eliminarse sin perder información del historial. Puedes desactivarlo.`,
  
            code:
              "SERVICE_HAS_BOOKINGS",
  
            counts: {
              onlineBookings:
                Math.max(
                  onlineBookings,
                  bookingsThroughSlots
                ),
  
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
       * No existen reservas:
       * eliminamos primero sus disponibilidades.
       */
  
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
            authorization.business.id
          )
          .eq(
            "service_id",
            service.id
          );
  
      if (
        deleteSlotsError
      ) {
        console.error(
          "Error deleting service slots:",
          deleteSlotsError
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido eliminar las disponibilidades del servicio.",
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
            authorization.business.id
          );
  
      if (
        deleteServiceError
      ) {
        console.error(
          "Error deleting business service:",
          deleteServiceError
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