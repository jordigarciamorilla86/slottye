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
      reviewId: string;
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
        reviewId,
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
  
      const visible =
        body.visible;
  
      if (
        typeof visible !==
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
          review,
        error:
          reviewError,
      } =
        await admin
          .from("reviews")
          .select(`
            id,
            user_id,
            business_id,
            booking_id,
            rating,
            comment,
            visible
          `)
          .eq(
            "id",
            reviewId
          )
          .maybeSingle();
  
      if (reviewError) {
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar la reseña.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (!review) {
        return NextResponse.json(
          {
            error:
              "La reseña no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        review.visible ===
        visible
      ) {
        return NextResponse.json({
          success:
            true,
  
          visible,
        });
      }
  
      const {
        error:
          rpcError,
      } =
        await admin.rpc(
          "admin_set_review_visible",
          {
            p_review_id:
              review.id,
  
            p_visible:
              visible,
          }
        );
  
      if (rpcError) {
        console.error(
          "Error changing review visibility:",
          rpcError
        );
  
        return NextResponse.json(
          {
            error:
              rpcError.message ||
              "No se ha podido cambiar la visibilidad.",
          },
          {
            status:
              500,
          }
        );
      }
  
      await writeAdminAuditLog({
        adminUserId:
          currentUser.id,
  
        action:
          visible
            ? "REVIEW_SHOWN"
            : "REVIEW_HIDDEN",
  
        entityType:
          "REVIEW",
  
        entityId:
          review.id,
  
        businessId:
          review.business_id,
  
        targetUserId:
          review.user_id,
  
        description:
          visible
            ? `Se volvió a mostrar la reseña ${review.id}.`
            : `Se ocultó la reseña ${review.id}.`,
  
        oldValues: {
          visible:
            review.visible,
        },
  
        newValues: {
          visible,
        },
  
        metadata: {
          booking_id:
            review.booking_id,
  
          rating:
            review.rating,
  
          comment:
            review.comment,
        },
      });
  
      return NextResponse.json({
        success:
          true,
  
        visible,
      });
    } catch (error) {
      console.error(
        "Unexpected review visibility error:",
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