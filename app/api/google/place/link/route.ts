import {
  NextResponse,
} from "next/server";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type RequestBody = {
  businessId?: unknown;
  googlePlaceId?: unknown;
  showGoogleReviews?: unknown;
};

export async function POST(
  request:
    Request
) {
  try {
    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    /*
     * ============================================================
     * USUARIO
     * ============================================================
     */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
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
        "Error checking Google link profile:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la cuenta.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !profile ||
      profile.role !==
        "business"
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

    if (
      profile.is_blocked
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
     * DATOS
     * ============================================================
     */

    const bodyResult =
      await readJsonBody<RequestBody>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const body =
      bodyResult.data;

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
            "Falta businessId.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        businessId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del negocio no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      body.googlePlaceId !==
        null &&
      body.googlePlaceId !==
        undefined &&
      typeof body.googlePlaceId !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Google Place ID no válido.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      typeof body.showGoogleReviews !==
        "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "La opción de reseñas de Google no es válida.",
        },
        {
          status:
            400,
        }
      );
    }

    const googlePlaceId =
      typeof body.googlePlaceId ===
        "string"
        ? body.googlePlaceId.trim() ||
          null
        : null;

    /*
     * ============================================================
     * COMPROBAR PROPIEDAD
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
          owner_id
        `)
        .eq(
          "id",
          businessId
        )
        .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error checking Google link business:",
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
            "Negocio no encontrado.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * ACTUALIZAR
     * ============================================================
     *
     * Es una única escritura sobre businesses.
     * No requiere una RPC transaccional adicional.
     */

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
          google_place_id:
            googlePlaceId,

          show_google_reviews:
            Boolean(
              googlePlaceId
            ) &&
            body.showGoogleReviews,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          business.id
        )
        .eq(
          "owner_id",
          user.id
        )
        .select(`
          id,
          google_place_id,
          show_google_reviews
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Error updating Google business link:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido actualizar la vinculación con Google.",
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
            "No se ha podido actualizar la vinculación con Google.",
        },
        {
          status:
            404,
        }
      );
    }

    return NextResponse.json({
      success:
        true,

      googlePlaceId:
        updatedBusiness.google_place_id,

      showGoogleReviews:
        updatedBusiness.show_google_reviews,
    });
  } catch (
    error
  ) {
    console.error(
      "Google place link error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo guardar la vinculación con Google.",
      },
      {
        status:
          500,
      }
    );
  }
}