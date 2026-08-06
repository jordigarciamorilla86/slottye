import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | {
        [key: string]:
          JsonValue;
      };
  
  type JsonObject = {
    [key: string]:
      JsonValue;
  };
  
  type AdminAuditInput = {
    adminUserId:
      string;
  
    action:
      string;
  
    entityType:
      string;
  
    entityId?:
      string |
      null;
  
    businessId?:
      string |
      null;
  
    targetUserId?:
      string |
      null;
  
    description:
      string;
  
    oldValues?:
      JsonObject |
      null;
  
    newValues?:
      JsonObject |
      null;
  
    metadata?:
      JsonObject |
      null;
  };
  
  /*
   * ============================================================
   * REGISTRAR ACCIÓN ADMINISTRATIVA
   * ============================================================
   *
   * La auditoría no debe impedir que termine la acción principal.
   * Por ese motivo, esta función devuelve un resultado en lugar
   * de lanzar el error.
   */
  
  export async function writeAdminAuditLog({
    adminUserId,
    action,
    entityType,
    entityId = null,
    businessId = null,
    targetUserId = null,
    description,
    oldValues = null,
    newValues = null,
    metadata = null,
  }: AdminAuditInput) {
    try {
      const admin =
        createAdminClient();
  
      const {
        data:
          auditLog,
        error,
      } =
        await admin
          .from(
            "admin_audit_logs"
          )
          .insert({
            admin_user_id:
              adminUserId,
  
            action:
              action.trim(),
  
            entity_type:
              entityType.trim(),
  
            entity_id:
              entityId,
  
            business_id:
              businessId,
  
            target_user_id:
              targetUserId,
  
            description:
              description.trim(),
  
            old_values:
              oldValues,
  
            new_values:
              newValues,
  
            metadata:
              metadata,
          })
          .select(`
            id,
            created_at
          `)
          .single();
  
      if (
        error
      ) {
        console.error(
          "Error writing admin audit log:",
          error
        );
  
        return {
          success:
            false as const,
  
          auditLog:
            null,
  
          error,
        };
      }
  
      return {
        success:
          true as const,
  
        auditLog,
  
        error:
          null,
      };
    } catch (
      error
    ) {
      console.error(
        "Unexpected admin audit log error:",
        error
      );
  
      return {
        success:
          false as const,
  
        auditLog:
          null,
  
        error,
      };
    }
  }