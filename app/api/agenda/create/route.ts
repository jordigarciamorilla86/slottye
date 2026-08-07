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
  
  type CreationType =
    | "manual"
    | "slot"
    | "block";
  
  type RequestBody = {
    type?: unknown;
    businessId?: unknown;
  
    serviceId?: unknown;
  
    customerName?: unknown;
    customerPhone?: unknown;
    customerEmail?: unknown;
    notes?: unknown;
  
    startAt?: unknown;
    endAt?: unknown;
  
    reason?: unknown;
  };
  
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
  
  export async function POST(
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
       * SESIÓN
       * ============================================================
       */
  
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();
  
      if (
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
            role,
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
          "Error checking agenda creation actor:",
          profileError
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
  
      const isAdmin =
        profile.is_admin ===
        true;
  
      if (
        profile.is_blocked &&
        !isAdmin
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
       * DATOS RECIBIDOS
       * ============================================================
       */
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
      const type =
        body.type;
  
      if (
        type !==
          "manual" &&
        type !==
          "slot" &&
        type !==
          "block"
      ) {
        return NextResponse.json(
          {
            error:
              "El tipo de operación no es válido.",
          },
          {
            status:
              400,
          }
        );
      }
  
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
  
      if (
        end <=
        new Date()
      ) {
        return NextResponse.json(
          {
            error:
              "No puedes crear un evento completamente en el pasado.",
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
       * ============================================================
       * COMPROBAR NEGOCIO
       * ============================================================
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
          "Error checking agenda creation business:",
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
  
      /*
       * El propietario solamente puede modificar
       * su propio negocio.
       *
       * Un administrador puede modificar cualquiera.
       */
  
      const isOwner =
        business.owner_id ===
        user.id;
  
      if (
        !isAdmin &&
        !isOwner
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permisos para modificar esta agenda.",
          },
          {
            status:
              403,
          }
        );
      }
  
      /*
       * ============================================================
       * CREAR RESERVA MANUAL
       * ============================================================
       */
  
      if (
        type ===
        "manual"
      ) {
        const customerName =
          optionalText(
            body.customerName
          );
  
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
  
        const serviceId =
          typeof body.serviceId ===
            "string" &&
          body.serviceId.trim()
            ? body.serviceId.trim()
            : null;
  
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
  
        /*
         * Si se ha indicado servicio,
         * comprobamos que pertenezca al negocio.
         */
  
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
                business.id
              )
              .maybeSingle();
  
          if (
            serviceError
          ) {
            console.error(
              "Error checking manual booking service:",
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
  
        /*
         * Utilizamos el cliente autenticado para que
         * las comprobaciones auth.uid() de la RPC
         * continúen funcionando.
         */
  
        const {
          data:
            rpcData,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "create_manual_booking",
            {
              p_business_id:
                business.id,
  
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
          console.error(
            "Error creating manual booking through agenda API:",
            rpcError
          );
  
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
  
        /*
         * Auditoría únicamente cuando actúa Super Admin.
         */
  
        if (
          isAdmin
        ) {
          try {
            await writeAdminAuditLog({
              adminUserId:
                user.id,
  
              action:
                "MANUAL_BOOKING_CREATED",
  
              entityType:
                "MANUAL_BOOKING",
  
              /*
               * Algunas versiones de la RPC no devuelven el UUID.
               * Usamos el negocio como referencia estable de la acción.
               */
              entityId:
                business.id,
  
              businessId:
                business.id,
  
              targetUserId:
                business.owner_id,
  
              description:
                `Se creó una reserva manual en la agenda de ${business.name}.`,
  
              newValues: {
                customer_name:
                  customerName,
  
                customer_phone:
                  customerPhone ||
                  null,
  
                customer_email:
                  customerEmail ||
                  null,
  
                service_id:
                  serviceId,
  
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
              "Error writing manual booking creation audit:",
              auditError
            );
          }
        }
  
        return NextResponse.json({
          success:
            true,
  
          type:
            "manual",
  
          data:
            rpcData ??
            null,
        });
      }
  
      /*
       * ============================================================
       * CREAR DISPONIBILIDAD
       * ============================================================
       */
  
      if (
        type ===
        "slot"
      ) {
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
  
        /*
         * El servicio tiene que pertenecer al negocio
         * y estar activo.
         */
  
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
              name,
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
            "Error checking slot service:",
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
          data:
            createdSlot,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "create_agenda_slot",
            {
              p_business_id:
                business.id,
  
              p_service_id:
                service.id,
  
              p_start_at:
                startAt,
  
              p_end_at:
                endAt,
            }
          );
  
        if (
          rpcError
        ) {
          console.error(
            "Error creating agenda slot through API:",
            rpcError
          );
  
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
  
        /*
         * La RPC actualmente puede devolver un objeto
         * o un array dependiendo de su definición.
         */
  
        const createdSlotRecord =
          Array.isArray(
            createdSlot
          )
            ? createdSlot[0] ??
              null
            : createdSlot;
  
        const createdSlotId =
          createdSlotRecord &&
          typeof createdSlotRecord ===
            "object" &&
          "id" in
            createdSlotRecord &&
          typeof createdSlotRecord.id ===
            "string"
            ? createdSlotRecord.id
            : null;
  
        if (
          isAdmin
        ) {
          try {
            await writeAdminAuditLog({
              adminUserId:
                user.id,
  
              action:
                "AGENDA_SLOT_CREATED",
  
              entityType:
                "SLOT",
  
              entityId:
                createdSlotId ??
                business.id,
  
              businessId:
                business.id,
  
              targetUserId:
                business.owner_id,
  
              description:
                `Se creó una disponibilidad en la agenda de ${business.name}.`,
  
              newValues: {
                service_id:
                  service.id,
  
                service_name:
                  service.name,
  
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
              "Error writing slot creation admin audit:",
              auditError
            );
          }
        }
  
        return NextResponse.json({
          success:
            true,
  
          type:
            "slot",
  
          slotId:
            createdSlotId,
  
          data:
            createdSlot ??
            null,
        });
      }
  
      /*
       * ============================================================
       * CREAR BLOQUEO
       * ============================================================
       */
  
      const reason =
        optionalText(
          body.reason
        );
  
      const {
        data:
          createdBlock,
        error:
          rpcError,
      } =
        await supabase.rpc(
          "create_agenda_block",
          {
            p_business_id:
              business.id,
  
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
        console.error(
          "Error creating agenda block through API:",
          rpcError
        );
  
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
        isAdmin
      ) {
        try {
          await writeAdminAuditLog({
            adminUserId:
              user.id,
  
            action:
              "BUSINESS_BLOCK_CREATED",
  
            entityType:
              "BUSINESS_BLOCK",
  
            entityId:
              business.id,
  
            businessId:
              business.id,
  
            targetUserId:
              business.owner_id,
  
            description:
              `Se bloqueó un horario en la agenda de ${business.name}.`,
  
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
            "Error writing block creation admin audit:",
            auditError
          );
        }
      }
  
      return NextResponse.json({
        success:
          true,
  
        type:
          "block",
  
        data:
          createdBlock ??
          null,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected agenda creation error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al modificar la agenda.",
        },
        {
          status:
            500,
        }
      );
    }
  }