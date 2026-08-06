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
  
  type Props = {
    params: Promise<{
      businessId: string;
    }>;
  };
  
  export async function PATCH(
    request: NextRequest,
    {
      params,
    }: Props
  ) {
    try {
      const {
        businessId,
      } =
        await params;
  
      const supabase =
        await createClient();
  
      const admin =
        createAdminClient();
  
      const {
        data: {
          user:
            currentUser,
        },
      } =
        await supabase.auth.getUser();
  
      if (!currentUser) {
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
  
      const {
        data:
          currentProfile,
      } =
        await admin
          .from("profiles")
          .select(`
            id,
            is_admin
          `)
          .eq(
            "id",
            currentUser.id
          )
          .maybeSingle();
  
      if (
        !currentProfile?.is_admin
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
  
      const body =
        await request.json();
  
      const active =
        body.active;
  
      if (
        typeof active !==
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
          business,
        error:
          businessError,
      } =
        await admin
          .from("businesses")
          .select(`
            id,
            owner_id,
            name,
            slug,
            active
          `)
          .eq(
            "id",
            businessId
          )
          .maybeSingle();
  
      if (businessError) {
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
  
      if (
        business.active ===
        active
      ) {
        return NextResponse.json({
          success:
            true,
  
          active,
        });
      }
  
      const {
        data:
          updatedBusiness,
        error:
          updateError,
      } =
        await admin
          .from(
            "businesses"
          )
          .update({
            active,
          })
          .eq(
            "id",
            businessId
          )
          .select(`
            id,
            active
          `)
          .maybeSingle();
      
      if (
        updateError
      ) {
        console.error(
          "Error changing business status:",
          updateError
        );
      
        return NextResponse.json(
          {
            error:
              updateError.message ||
              "No se ha podido cambiar el estado del negocio.",
          },
          {
            status:
              500,
          }
        );
      }
      
      if (
        !updatedBusiness
      ) {
        return NextResponse.json(
          {
            error:
              "No se ha podido modificar el negocio.",
          },
          {
            status:
              404,
          }
        );
      }
  
      await writeAdminAuditLog({
        adminUserId:
          currentUser.id,
  
        action:
          active
            ? "BUSINESS_ACTIVATED"
            : "BUSINESS_DEACTIVATED",
  
        entityType:
          "BUSINESS",
  
        entityId:
          business.id,
  
        businessId:
          business.id,
  
        targetUserId:
          business.owner_id,
  
        description:
          active
            ? `Se activó el negocio ${business.name}.`
            : `Se desactivó el negocio ${business.name}.`,
  
        oldValues: {
          active:
            business.active,
        },
  
        newValues: {
          active,
        },
  
        metadata: {
          name:
            business.name,
  
          slug:
            business.slug,
  
          owner_id:
            business.owner_id,
        },
      });
  
      return NextResponse.json({
        success:
          true,
  
          active:
          updatedBusiness.active,
      });
    } catch (error) {
      console.error(
        "Unexpected admin business status error:",
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