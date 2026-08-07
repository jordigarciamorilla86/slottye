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
  
  type EventType =
    | "manual"
    | "block"
    | "slot";
  
  type RequestBody = {
    type?: unknown;
    eventId?: unknown;
  
    serviceId?: unknown;
  
    customerName?: unknown;
    customerPhone?: unknown;
    customerEmail?: unknown;
    notes?: unknown;
  
    startAt?: unknown;
    endAt?: unknown;
  
    reason?: unknown;
  };
  
  type AuthorizationResult =
    | {
        success: true;
  
        userId: string;
        isAdmin: boolean;
  
        business: {
          id: string;
          name: string;
          owner_id: string;
        };
      }
    | {
        success: false;
  
        response: NextResponse;
      };
  
  /*
   * ============================================================
   * TEXTO OPCIONAL
   * ============================================================
   */
  
  function optionalText(
    value:
      unknown
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return "";
    }
  
    return value.trim();
  }
  
  /*
   * ============================================================
   * FECHA
   * ============================================================
   */
  
  function validDate(
    value:
      unknown
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return null;
    }
  
    const date =
      new Date(
        value
      );
  
    if (
      !Number.isFinite(
        date.getTime()
      )
    ) {
      return null;
    }
  
    return date;
  }
  
  /*
   * ============================================================
   * COMPROBAR USUARIO Y NEGOCIO
   * ============================================================
   */
  
  async function authorizeBusiness(
    businessId:
      string
  ): Promise<AuthorizationResult> {
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
  
    if (
      !user
    ) {
      return {
        success:
          false,
  
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
          is_admin,
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
        "Error checking agenda event actor:",
        profileError
      );
  
      return {
        success:
          false,
  
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
    ) {
      return {
        success:
          false,
  
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
  
    const isAdmin =
      profile.is_admin ===
      true;
  
    if (
      profile.is_blocked &&
      !isAdmin
    ) {
      return {
        success:
          false,
  
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
          name,
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
        "Error checking agenda event business:",
        businessError
      );
  
      return {
        success:
          false,
  
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
      };
    }
  
    if (
      !business
    ) {
      return {
        success:
          false,
  
        response:
          NextResponse.json(
            {
              error:
                "El negocio no existe.",
            },
            {
              status:
                404,
            }
          ),
      };
    }
  
    if (
      !isAdmin &&
      business.owner_id !==
        user.id
    ) {
      return {
        success:
          false,
  
        response:
          NextResponse.json(
            {
              error:
                "No tienes permisos para modificar esta agenda.",
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
        true,
  
      userId:
        user.id,
  
      isAdmin,
  
      business,
    };
  }
  
  /*
   * ============================================================
   * MODIFICAR EVENTO
   * ============================================================
   */
  
  export async function PATCH(
    request:
      NextRequest
  ) {
    try {
      const supabase =
        await createClient();
  
      const admin =
        createAdminClient();
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
      const type =
        body.type;
  
      const eventId =
        typeof body.eventId ===
        "string"
          ? body.eventId.trim()
          : "";
  
      if (
        type !==
          "manual" &&
        type !==
          "block" &&
        type !==
          "slot"
      ) {
        return NextResponse.json(
          {
            error:
              "El tipo de evento no es válido.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !eventId
      ) {
        return NextResponse.json(
          {
            error:
              "Falta el identificador del evento.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const start =
        validDate(
          body.startAt
        );
  
      const end =
        validDate(
          body.endAt
        );
  
      if (
        !start ||
        !end ||
        end <=
          start
      ) {
        return NextResponse.json(
          {
            error:
              "El horario seleccionado no es válido.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const startAt =
        start.toISOString();
  
      const endAt =
        end.toISOString();
  
      /*
       * ==========================================================
       * RESERVA MANUAL
       * ==========================================================
       */
  
      if (
        type ===
        "manual"
      ) {
        const {
          data:
            currentEvent,
          error:
            currentError,
        } =
          await admin
            .from(
              "manual_bookings"
            )
            .select(`
              id,
              business_id,
              service_id,
              customer_name,
              customer_phone,
              customer_email,
              start_at,
              end_at,
              notes
            `)
            .eq(
              "id",
              eventId
            )
            .maybeSingle();
  
        if (
          currentError
        ) {
          console.error(
            "Error loading manual booking before update:",
            currentError
          );
  
          return NextResponse.json(
            {
              error:
                "No se ha podido comprobar la reserva manual.",
            },
            {
              status:
                500,
            }
          );
        }
  
        if (
          !currentEvent
        ) {
          return NextResponse.json(
            {
              error:
                "La reserva manual ya no existe.",
            },
            {
              status:
                404,
            }
          );
        }
  
        const authorization =
          await authorizeBusiness(
            currentEvent.business_id
          );
  
        if (
          !authorization.success
        ) {
          return authorization.response;
        }
  
        const customerName =
          optionalText(
            body.customerName
          );
  
        if (
          !customerName
        ) {
          return NextResponse.json(
            {
              error:
                "Debes indicar el nombre del cliente.",
            },
            {
              status:
                400,
            }
          );
        }
  
        const serviceId =
          typeof body.serviceId ===
            "string" &&
          body.serviceId.trim()
            ? body.serviceId.trim()
            : null;
  
        if (
          serviceId
        ) {
          const {
            data:
              service,
            error:
              serviceError,
          } =
            await admin
              .from(
                "services"
              )
              .select("id")
              .eq(
                "id",
                serviceId
              )
              .eq(
                "business_id",
                currentEvent.business_id
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
  
          if (
            !service
          ) {
            return NextResponse.json(
              {
                error:
                  "El servicio seleccionado no es válido.",
              },
              {
                status:
                  400,
              }
            );
          }
        }
  
        const customerPhone =
          optionalText(
            body.customerPhone
          );
  
        const customerEmail =
          optionalText(
            body.customerEmail
          );
  
        const notes =
          optionalText(
            body.notes
          );
  
        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "update_manual_booking",
            {
              p_booking_id:
                currentEvent.id,
  
              p_service_id:
                serviceId,
  
              p_customer_name:
                customerName,
  
              p_customer_phone:
                customerPhone,
  
              p_customer_email:
                customerEmail,
  
              p_start_at:
                startAt,
  
              p_end_at:
                endAt,
  
              p_notes:
                notes,
            }
          );
  
        if (
          rpcError
        ) {
          return NextResponse.json(
            {
              error:
                rpcError.message,
            },
            {
              status:
                400,
            }
          );
        }
  
        if (
          authorization.isAdmin
        ) {
          try {
            await writeAdminAuditLog({
              adminUserId:
                authorization.userId,
  
              action:
                "MANUAL_BOOKING_UPDATED",
  
              entityType:
                "MANUAL_BOOKING",
  
              entityId:
                currentEvent.id,
  
              businessId:
                authorization.business.id,
  
              targetUserId:
                authorization.business.owner_id,
  
              description:
                `Se modificó una reserva manual de ${authorization.business.name}.`,
  
              oldValues: {
                service_id:
                  currentEvent.service_id,
  
                customer_name:
                  currentEvent.customer_name,
  
                customer_phone:
                  currentEvent.customer_phone,
  
                customer_email:
                  currentEvent.customer_email,
  
                start_at:
                  currentEvent.start_at,
  
                end_at:
                  currentEvent.end_at,
  
                notes:
                  currentEvent.notes,
              },
  
              newValues: {
                service_id:
                  serviceId,
  
                customer_name:
                  customerName,
  
                customer_phone:
                  customerPhone ||
                  null,
  
                customer_email:
                  customerEmail ||
                  null,
  
                start_at:
                  startAt,
  
                end_at:
                  endAt,
  
                notes:
                  notes ||
                  null,
              },
            });
          } catch (
            auditError
          ) {
            console.error(
              "Error writing manual booking update audit:",
              auditError
            );
          }
        }
  
        return NextResponse.json({
          success:
            true,
        });
      }
  
      /*
       * ==========================================================
       * BLOQUEO
       * ==========================================================
       */
  
      if (
        type ===
        "block"
      ) {
        const {
          data:
            currentEvent,
          error:
            currentError,
        } =
          await admin
            .from(
              "business_blocks"
            )
            .select(`
              id,
              business_id,
              start_at,
              end_at,
              reason
            `)
            .eq(
              "id",
              eventId
            )
            .maybeSingle();
  
        if (
          currentError
        ) {
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
          !currentEvent
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
  
        const authorization =
          await authorizeBusiness(
            currentEvent.business_id
          );
  
        if (
          !authorization.success
        ) {
          return authorization.response;
        }
  
        const reason =
          optionalText(
            body.reason
          );
  
        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "update_agenda_block",
            {
              p_block_id:
                currentEvent.id,
  
              p_start_at:
                startAt,
  
              p_end_at:
                endAt,
  
              p_reason:
                reason,
            }
          );
  
        if (
          rpcError
        ) {
          return NextResponse.json(
            {
              error:
                rpcError.message,
            },
            {
              status:
                400,
            }
          );
        }
  
        if (
          authorization.isAdmin
        ) {
          try {
            await writeAdminAuditLog({
              adminUserId:
                authorization.userId,
  
              action:
                "BUSINESS_BLOCK_UPDATED",
  
              entityType:
                "BUSINESS_BLOCK",
  
              entityId:
                currentEvent.id,
  
              businessId:
                authorization.business.id,
  
              targetUserId:
                authorization.business.owner_id,
  
              description:
                `Se modificó un bloqueo de la agenda de ${authorization.business.name}.`,
  
              oldValues: {
                start_at:
                  currentEvent.start_at,
  
                end_at:
                  currentEvent.end_at,
  
                reason:
                  currentEvent.reason,
              },
  
              newValues: {
                start_at:
                  startAt,
  
                end_at:
                  endAt,
  
                reason:
                  reason ||
                  null,
              },
            });
          } catch (
            auditError
          ) {
            console.error(
              "Error writing block update audit:",
              auditError
            );
          }
        }
  
        return NextResponse.json({
          success:
            true,
        });
      }
  
      /*
       * ==========================================================
       * DISPONIBILIDAD
       * ==========================================================
       */
  
      const {
        data:
          currentEvent,
        error:
          currentError,
      } =
        await admin
          .from(
            "slots"
          )
          .select(`
            id,
            business_id,
            service_id,
            start_at,
            end_at,
            status
          `)
          .eq(
            "id",
            eventId
          )
          .maybeSingle();
  
      if (
        currentError
      ) {
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar la disponibilidad.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !currentEvent
      ) {
        return NextResponse.json(
          {
            error:
              "La disponibilidad ya no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        currentEvent.status !==
        "AVAILABLE"
      ) {
        return NextResponse.json(
          {
            error:
              "Solo se pueden modificar disponibilidades libres.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const authorization =
        await authorizeBusiness(
          currentEvent.business_id
        );
  
      if (
        !authorization.success
      ) {
        return authorization.response;
      }
  
      const serviceId =
        typeof body.serviceId ===
        "string"
          ? body.serviceId.trim()
          : "";
  
      if (
        !serviceId
      ) {
        return NextResponse.json(
          {
            error:
              "Selecciona un servicio.",
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
          serviceError,
      } =
        await admin
          .from(
            "services"
          )
          .select(`
            id,
            active
          `)
          .eq(
            "id",
            serviceId
          )
          .eq(
            "business_id",
            currentEvent.business_id
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
  
      if (
        !service ||
        !service.active
      ) {
        return NextResponse.json(
          {
            error:
              "El servicio seleccionado no es válido.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "update_agenda_slot",
          {
            p_slot_id:
              currentEvent.id,
  
            p_service_id:
              serviceId,
  
            p_start_at:
              startAt,
  
            p_end_at:
              endAt,
          }
        );
  
      if (
        rpcError
      ) {
        return NextResponse.json(
          {
            error:
              rpcError.message,
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        authorization.isAdmin
      ) {
        try {
          await writeAdminAuditLog({
            adminUserId:
              authorization.userId,
  
            action:
              "AGENDA_SLOT_UPDATED",
  
            entityType:
              "SLOT",
  
            entityId:
              currentEvent.id,
  
            businessId:
              authorization.business.id,
  
            targetUserId:
              authorization.business.owner_id,
  
            description:
              `Se modificó una disponibilidad de ${authorization.business.name}.`,
  
            oldValues: {
              service_id:
                currentEvent.service_id,
  
              start_at:
                currentEvent.start_at,
  
              end_at:
                currentEvent.end_at,
            },
  
            newValues: {
              service_id:
                serviceId,
  
              start_at:
                startAt,
  
              end_at:
                endAt,
            },
          });
        } catch (
          auditError
        ) {
          console.error(
            "Error writing slot update audit:",
            auditError
          );
        }
      }
  
      return NextResponse.json({
        success:
          true,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected agenda event update error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al modificar el evento.",
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
   * ELIMINAR EVENTO
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
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
      const type =
        body.type;
  
      const eventId =
        typeof body.eventId ===
        "string"
          ? body.eventId.trim()
          : "";
  
      if (
        type !==
          "manual" &&
        type !==
          "block" &&
        type !==
          "slot"
      ) {
        return NextResponse.json(
          {
            error:
              "El tipo de evento no es válido.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !eventId
      ) {
        return NextResponse.json(
          {
            error:
              "Falta el identificador del evento.",
          },
          {
            status:
              400,
          }
        );
      }
  
      /*
       * ==========================================================
       * RESERVA MANUAL
       * ==========================================================
       */
  
      if (
        type ===
        "manual"
      ) {
        const {
          data:
            currentEvent,
          error:
            currentError,
        } =
          await admin
            .from(
              "manual_bookings"
            )
            .select(`
              id,
              business_id,
              service_id,
              customer_name,
              customer_phone,
              customer_email,
              start_at,
              end_at,
              notes
            `)
            .eq(
              "id",
              eventId
            )
            .maybeSingle();
  
        if (
          currentError
        ) {
          return NextResponse.json(
            {
              error:
                "No se ha podido comprobar la reserva manual.",
            },
            {
              status:
                500,
            }
          );
        }
  
        if (
          !currentEvent
        ) {
          return NextResponse.json(
            {
              error:
                "La reserva manual ya no existe.",
            },
            {
              status:
                404,
            }
          );
        }
  
        const authorization =
          await authorizeBusiness(
            currentEvent.business_id
          );
  
        if (
          !authorization.success
        ) {
          return authorization.response;
        }
  
        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "delete_manual_booking",
            {
              p_booking_id:
                currentEvent.id,
            }
          );
  
        if (
          rpcError
        ) {
          return NextResponse.json(
            {
              error:
                rpcError.message,
            },
            {
              status:
                400,
            }
          );
        }
  
        if (
          authorization.isAdmin
        ) {
          try {
            await writeAdminAuditLog({
              adminUserId:
                authorization.userId,
  
              action:
                "MANUAL_BOOKING_DELETED",
  
              entityType:
                "MANUAL_BOOKING",
  
              entityId:
                currentEvent.id,
  
              businessId:
                authorization.business.id,
  
              targetUserId:
                authorization.business.owner_id,
  
              description:
                `Se eliminó una reserva manual de ${authorization.business.name}.`,
  
              oldValues: {
                service_id:
                  currentEvent.service_id,
  
                customer_name:
                  currentEvent.customer_name,
  
                customer_phone:
                  currentEvent.customer_phone,
  
                customer_email:
                  currentEvent.customer_email,
  
                start_at:
                  currentEvent.start_at,
  
                end_at:
                  currentEvent.end_at,
  
                notes:
                  currentEvent.notes,
              },
  
              newValues: {
                deleted:
                  true,
              },
            });
          } catch (
            auditError
          ) {
            console.error(
              "Error writing manual booking delete audit:",
              auditError
            );
          }
        }
  
        return NextResponse.json({
          success:
            true,
        });
      }
  
      /*
       * ==========================================================
       * BLOQUEO
       * ==========================================================
       */
  
      if (
        type ===
        "block"
      ) {
        const {
          data:
            currentEvent,
          error:
            currentError,
        } =
          await admin
            .from(
              "business_blocks"
            )
            .select(`
              id,
              business_id,
              start_at,
              end_at,
              reason
            `)
            .eq(
              "id",
              eventId
            )
            .maybeSingle();
  
        if (
          currentError
        ) {
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
          !currentEvent
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
  
        const authorization =
          await authorizeBusiness(
            currentEvent.business_id
          );
  
        if (
          !authorization.success
        ) {
          return authorization.response;
        }
  
        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "delete_agenda_block",
            {
              p_block_id:
                currentEvent.id,
            }
          );
  
        if (
          rpcError
        ) {
          return NextResponse.json(
            {
              error:
                rpcError.message,
            },
            {
              status:
                400,
            }
          );
        }
  
        if (
          authorization.isAdmin
        ) {
          try {
            await writeAdminAuditLog({
              adminUserId:
                authorization.userId,
  
              action:
                "BUSINESS_BLOCK_DELETED",
  
              entityType:
                "BUSINESS_BLOCK",
  
              entityId:
                currentEvent.id,
  
              businessId:
                authorization.business.id,
  
              targetUserId:
                authorization.business.owner_id,
  
              description:
                `Se eliminó un bloqueo de la agenda de ${authorization.business.name}.`,
  
              oldValues: {
                start_at:
                  currentEvent.start_at,
  
                end_at:
                  currentEvent.end_at,
  
                reason:
                  currentEvent.reason,
              },
  
              newValues: {
                deleted:
                  true,
              },
            });
          } catch (
            auditError
          ) {
            console.error(
              "Error writing block delete audit:",
              auditError
            );
          }
        }
  
        return NextResponse.json({
          success:
            true,
        });
      }
  
      /*
       * ==========================================================
       * DISPONIBILIDAD
       * ==========================================================
       */
  
      const {
        data:
          currentEvent,
        error:
          currentError,
      } =
        await admin
          .from(
            "slots"
          )
          .select(`
            id,
            business_id,
            service_id,
            start_at,
            end_at,
            status
          `)
          .eq(
            "id",
            eventId
          )
          .maybeSingle();
  
      if (
        currentError
      ) {
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar la disponibilidad.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !currentEvent
      ) {
        return NextResponse.json(
          {
            error:
              "La disponibilidad ya no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        currentEvent.status !==
        "AVAILABLE"
      ) {
        return NextResponse.json(
          {
            error:
              "Solo puedes eliminar disponibilidades que estén libres.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const authorization =
        await authorizeBusiness(
          currentEvent.business_id
        );
  
      if (
        !authorization.success
      ) {
        return authorization.response;
      }
  
      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "delete_agenda_slot",
          {
            p_slot_id:
              currentEvent.id,
          }
        );
  
      if (
        rpcError
      ) {
        return NextResponse.json(
          {
            error:
              rpcError.message,
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        authorization.isAdmin
      ) {
        try {
          await writeAdminAuditLog({
            adminUserId:
              authorization.userId,
  
            action:
              "AGENDA_SLOT_DELETED",
  
            entityType:
              "SLOT",
  
            entityId:
              currentEvent.id,
  
            businessId:
              authorization.business.id,
  
            targetUserId:
              authorization.business.owner_id,
  
            description:
              `Se eliminó una disponibilidad de ${authorization.business.name}.`,
  
            oldValues: {
              service_id:
                currentEvent.service_id,
  
              start_at:
                currentEvent.start_at,
  
              end_at:
                currentEvent.end_at,
  
              status:
                currentEvent.status,
            },
  
            newValues: {
              deleted:
                true,
            },
          });
        } catch (
          auditError
        ) {
          console.error(
            "Error writing slot delete audit:",
            auditError
          );
        }
      }
  
      return NextResponse.json({
        success:
          true,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected agenda event delete error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al eliminar el evento.",
        },
        {
          status:
            500,
        }
      );
    }
  }