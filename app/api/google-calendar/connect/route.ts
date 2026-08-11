import {
  randomBytes,
} from "node:crypto";

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

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

const STATE_COOKIE =
  "slottye_google_calendar_state";

const BUSINESS_COOKIE =
  "slottye_google_calendar_business_id";

const RETURN_TO_COOKIE =
  "slottye_google_calendar_return_to";

function getRedirectUri(
  request: NextRequest
) {
  return `${request.nextUrl.origin}/api/google-calendar/callback`;
}

function getSafeReturnTo(
  value: string
) {
  if (
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/business-dashboard";
}

export async function GET(
  request: NextRequest
) {
  try {
    const clientId =
      process.env
        .GOOGLE_CALENDAR_CLIENT_ID;

    const clientSecret =
      process.env
        .GOOGLE_CALENDAR_CLIENT_SECRET;

    if (
      !clientId ||
      !clientSecret
    ) {
      return NextResponse.json(
        {
          error:
            "La integración con Google Calendar no está configurada.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * PARÁMETROS
     * ============================================================
     */

    const businessId =
      request.nextUrl.searchParams
        .get(
          "businessId"
        )
        ?.trim() ??
      "";

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

    const requestedReturnTo =
      request.nextUrl.searchParams
        .get(
          "returnTo"
        )
        ?.trim() ??
      "";

    const returnTo =
      getSafeReturnTo(
        requestedReturnTo
      );

    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    /*
     * ============================================================
     * USUARIO AUTENTICADO
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
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }

    /*
     * ============================================================
     * CUENTA BUSINESS ACTIVA
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
      profileError ||
      !profile ||
      profile.role !==
        "business" ||
      profile.is_blocked
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

    /*
     * ============================================================
     * COMPROBAR PROPIEDAD DEL NEGOCIO
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
        "Error checking Google Calendar business ownership:",
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
            "No tienes permiso para conectar Google Calendar a este negocio.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * STATE OAUTH
     * ============================================================
     */

    const state =
      randomBytes(
        32
      ).toString(
        "hex"
      );

    const redirectUri =
      getRedirectUri(
        request
      );

    const params =
      new URLSearchParams({
        client_id:
          clientId,

        redirect_uri:
          redirectUri,

        response_type:
          "code",

        scope:
          GOOGLE_CALENDAR_SCOPE,

        access_type:
          "offline",

        include_granted_scopes:
          "true",

        /*
         * Fuerza consentimiento para que una reconexión
         * pueda volver a conceder acceso offline.
         */
        prompt:
          "consent",

        state,
      });

    const response =
      NextResponse.redirect(
        `${GOOGLE_AUTH_URL}?${params.toString()}`
      );

    const secure =
      request.nextUrl.protocol ===
      "https:";

    /*
     * ============================================================
     * COOKIES TEMPORALES OAUTH
     * ============================================================
     */

    response.cookies.set(
      STATE_COOKIE,
      state,
      {
        httpOnly:
          true,

        secure,

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          10 * 60,
      }
    );

    response.cookies.set(
      BUSINESS_COOKIE,
      businessId,
      {
        httpOnly:
          true,

        secure,

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          10 * 60,
      }
    );

    response.cookies.set(
      RETURN_TO_COOKIE,
      returnTo,
      {
        httpOnly:
          true,

        secure,

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          10 * 60,
      }
    );

    return response;
  } catch (
    error
  ) {
    console.error(
      "Unexpected Google Calendar connect error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se ha podido iniciar la conexión con Google Calendar.",
      },
      {
        status:
          500,
      }
    );
  }
}