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
    prepareCustomerDeletion,
    prepareOwnerBusinessesDeletion,
    requireAdmin,
    sendAccountDeletedEmail,
  } from "@/lib/admin/adminDeletion";
  
  type Props = {
    params: Promise<{
      userId: string;
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
        userId:
          targetUserId,
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
  
      if (
        targetUserId ===
        currentUser.id
      ) {
        return NextResponse.json(
          {
            error:
              "No puedes eliminar tu propia cuenta desde administración.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const {
        data:
          targetProfile,
        error:
          profileError,
      } =
        await admin
          .from(
            "profiles"
          )
          .select(`
            id,
            name,
            email,
            role,
            is_admin
          `)
          .eq(
            "id",
            targetUserId
          )
          .maybeSingle();
  
      if (
        profileError
      ) {
        console.error(
          "Error loading target user:",
          profileError
        );
  
        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar el usuario.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        !targetProfile
      ) {
        return NextResponse.json(
          {
            error:
              "El usuario no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        targetProfile.is_admin
      ) {
        return NextResponse.json(
          {
            error:
              "No se puede eliminar una cuenta administradora desde este panel.",
          },
          {
            status:
              400,
          }
        );
      }
  
     /*
 * ============================================================
 * LIBERAR RESERVAS PERSONALES DEL USUARIO
 * ============================================================
 *
 * Cualquier cuenta puede haber reservado citas,
 * incluso una cuenta con rol business.
 *
 * Antes de eliminarla:
 * - liberamos sus slots futuros;
 * - avisamos a los suscriptores;
 * - después eliminamos la cuenta.
 */

const customerPreparation =
await prepareCustomerDeletion({
  admin,
  userId:
    targetUserId,
});

if (
!customerPreparation.success
) {
return NextResponse.json(
  {
    error:
      customerPreparation.error,
  },
  {
    status:
      500,
  }
);
}

/*
* ============================================================
* PREPARAR NEGOCIOS DEL PROPIETARIO
* ============================================================
*/

if (
targetProfile.role ===
"business"
) {
const businessPreparation =
  await prepareOwnerBusinessesDeletion({
    admin,
    ownerId:
      targetUserId,
  });

if (
  !businessPreparation.success
) {
  return NextResponse.json(
    {
      error:
        businessPreparation.error,
    },
    {
      status:
        500,
    }
  );
}
}
  
      /*
       * Eliminar primero los datos públicos.
       * Las relaciones dependientes deben estar
       * configuradas con ON DELETE CASCADE.
       */
  
      const {
        error:
          profileDeleteError,
      } =
        await admin
          .from(
            "profiles"
          )
          .delete()
          .eq(
            "id",
            targetUserId
          );
  
      if (
        profileDeleteError
      ) {
        console.error(
          "Error deleting target profile:",
          profileDeleteError
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido eliminar los datos del usuario.",
          },
          {
            status:
              500,
          }
        );
      }
  
      const {
        error:
          authDeleteError,
      } =
        await admin.auth.admin
          .deleteUser(
            targetUserId
          );
  
      if (
        authDeleteError
      ) {
        console.error(
          "Error deleting target auth user:",
          authDeleteError
        );
  
        return NextResponse.json(
          {
            error:
              "Los datos se han eliminado, pero no se ha podido finalizar la eliminación del acceso.",
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
        targetProfile.email
      ) {
        emailSent =
          await sendAccountDeletedEmail({
            email:
              targetProfile.email,
  
            name:
              targetProfile.name,
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
        "Unexpected admin user deletion error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al eliminar el usuario.",
        },
        {
          status:
            500,
        }
      );
    }
  }