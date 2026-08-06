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
  
  type RouteContext = {
    params: Promise<{
      businessId: string;
    }>;
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
        admin: null,
  
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
        admin: null,
  
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
  
    return {
      admin,
      response:
        null,
    };
  }
  
  /*
   * ============================================================
   * ACTIVAR O DESACTIVAR AVISOS
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
  
      const {
        admin,
        response:
          authorizationResponse,
      } =
        await requireAdmin();
  
      if (
        authorizationResponse ||
        !admin
      ) {
        return authorizationResponse;
      }
  
      const body =
        await request.json();
  
      const subscriptionId =
        body.subscriptionId;
  
      const emailEnabled =
        body.emailEnabled;
  
      if (
        typeof subscriptionId !==
          "string" ||
        typeof emailEnabled !==
          "boolean"
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
  
      const {
        data:
          subscription,
        error:
          updateError,
      } =
        await admin
          .from(
            "business_subscriptions"
          )
          .update({
            email_enabled:
              emailEnabled,
          })
          .eq(
            "id",
            subscriptionId
          )
          .eq(
            "business_id",
            businessId
          )
          .select(`
            id,
            user_id,
            business_id,
            email_enabled,
            created_at,
  
            profiles (
              id,
              name,
              email,
              is_blocked
            )
          `)
          .maybeSingle();
  
      if (
        updateError
      ) {
        console.error(
          "Error updating subscriber email status:",
          updateError
        );
  
        return NextResponse.json(
          {
            error:
              updateError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !subscription
      ) {
        return NextResponse.json(
          {
            error:
              "La suscripción no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      const profile =
        Array.isArray(
          subscription.profiles
        )
          ? subscription
              .profiles[0] ??
            null
          : subscription.profiles;
  
      return NextResponse.json({
        subscription: {
          ...subscription,
          profiles:
            profile,
        },
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected subscriber update error:",
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
   * ELIMINAR SUSCRIPCIÓN
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
  
      const {
        admin,
        response:
          authorizationResponse,
      } =
        await requireAdmin();
  
      if (
        authorizationResponse ||
        !admin
      ) {
        return authorizationResponse;
      }
  
      const body =
        await request.json();
  
      const subscriptionId =
        body.subscriptionId;
  
      if (
        typeof subscriptionId !==
        "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Falta el identificador de la suscripción.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const {
        data:
          subscription,
        error:
          subscriptionError,
      } =
        await admin
          .from(
            "business_subscriptions"
          )
          .select(`
            id,
            user_id
          `)
          .eq(
            "id",
            subscriptionId
          )
          .eq(
            "business_id",
            businessId
          )
          .maybeSingle();
  
      if (
        subscriptionError
      ) {
        return NextResponse.json(
          {
            error:
              subscriptionError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !subscription
      ) {
        return NextResponse.json(
          {
            error:
              "La suscripción no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      const {
        error:
          deleteError,
      } =
        await admin
          .from(
            "business_subscriptions"
          )
          .delete()
          .eq(
            "id",
            subscription.id
          )
          .eq(
            "business_id",
            businessId
          );
  
      if (
        deleteError
      ) {
        console.error(
          "Error deleting business subscription:",
          deleteError
        );
  
        return NextResponse.json(
          {
            error:
              deleteError.message,
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
  
        subscriptionId:
          subscription.id,
      });
    } catch (
      error
    ) {
      console.error(
        "Unexpected subscriber deletion error:",
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