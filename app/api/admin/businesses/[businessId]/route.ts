import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    prepareSingleBusinessDeletion,
    requireAdmin,
    sendBusinessDeletedEmail,
  } from "@/lib/admin/adminDeletion";
  
  type Props = {
    params: Promise<{
      businessId: string;
    }>;
  };
  
  export async function DELETE(
    _request:
      Request,
    {
      params,
    }:
      Props
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
  
      if (
        !currentUser
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
  
      const adminCheck =
        await requireAdmin({
          admin,
          userId:
            currentUser.id,
        });
  
      if (
        !adminCheck.success
      ) {
        return NextResponse.json(
          {
            error:
              adminCheck.error,
          },
          {
            status:
              adminCheck.status,
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
            name,
            owner_id,
  
            profiles (
              name,
              email
            )
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
          "Error loading business to delete:",
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
  
      const owner =
        Array.isArray(
          business.profiles
        )
          ? business
              .profiles[0] ??
            null
          : business.profiles;
  
      const preparation =
        await prepareSingleBusinessDeletion({
          admin,
          businessId,
        });
  
      if (
        !preparation.success
      ) {
        return NextResponse.json(
          {
            error:
              preparation.error,
          },
          {
            status:
              500,
          }
        );
      }
  
      const {
        error:
          deleteError,
      } =
        await admin
          .from(
            "businesses"
          )
          .delete()
          .eq(
            "id",
            businessId
          );
  
      if (
        deleteError
      ) {
        console.error(
          "Error deleting business:",
          deleteError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido eliminar el negocio y sus datos.",
          },
          {
            status:
              500,
          }
        );
      }
  
      let emailSent =
        false;
  
      if (
        owner?.email
      ) {
        emailSent =
          await sendBusinessDeletedEmail({
            email:
              owner.email,
  
            ownerName:
              owner.name,
  
            businessName:
              business.name,
          });
      }
  
      return NextResponse.json({
        success:
          true,
  
        emailSent,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected admin business deletion error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al eliminar el negocio.",
        },
        {
          status:
            500,
        }
      );
    }
  }