import {
  NextRequest,
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

import {
  syncGoogleCalendarToSlottye,
} from "@/lib/google-calendar-sync";

type RequestBody = {
  businessId?: unknown;
};

export async function POST(
  request: NextRequest
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
     * BODY
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
            "Falta el identificador del negocio.",
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
        "Google Calendar sync profile error:",
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
     * NEGOCIO
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
          owner_id,
          name
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
        "Google Calendar sync business error:",
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

    if (
      !isAdmin &&
      business.owner_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para sincronizar este negocio.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * MOTOR COMÚN
     * ============================================================
     */

    const result =
      await syncGoogleCalendarToSlottye(
        business.id
      );

    return NextResponse.json(
      result
    );
  } catch (
    error
  ) {
    /*
     * El error real queda únicamente en servidor.
     *
     * syncGoogleCalendarToSlottye puede fallar por Google,
     * OAuth, Supabase o lógica interna, por lo que no debemos
     * devolver error.message directamente al navegador.
     */

    console.error(
      "Unexpected Google Calendar sync error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error sincronizando Google Calendar.",
      },
      {
        status:
          500,
      }
    );
  }
}