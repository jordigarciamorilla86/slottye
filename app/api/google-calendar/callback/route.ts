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
  isUuid,
} from "@/lib/api/request";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const STATE_COOKIE =
  "slottye_google_calendar_state";

const BUSINESS_COOKIE =
  "slottye_google_calendar_business_id";

const RETURN_TO_COOKIE =
  "slottye_google_calendar_return_to";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function getRedirectUri(
  request: NextRequest
) {
  return `${request.nextUrl.origin}/api/google-calendar/callback`;
}

function clearOAuthCookies(
  response: NextResponse
) {
  response.cookies.set(
    STATE_COOKIE,
    "",
    {
      httpOnly:
        true,

      path:
        "/",

      maxAge:
        0,
    }
  );

  response.cookies.set(
    BUSINESS_COOKIE,
    "",
    {
      httpOnly:
        true,

      path:
        "/",

      maxAge:
        0,
    }
  );

  response.cookies.set(
    RETURN_TO_COOKIE,
    "",
    {
      httpOnly:
        true,

      path:
        "/",

      maxAge:
        0,
    }
  );

  return response;
}

function returnUrl(
  request: NextRequest,
  status: string
) {
  const storedReturnTo =
    request.cookies.get(
      RETURN_TO_COOKIE
    )?.value ??
    "";

  const safeReturnTo =
    storedReturnTo.startsWith("/") &&
    !storedReturnTo.startsWith("//")
      ? storedReturnTo
      : "/business-dashboard";

  const url =
    new URL(
      safeReturnTo,
      request.url
    );

  url.searchParams.set(
    "googleCalendar",
    status
  );

  return url;
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
      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "config-error"
          )
        )
      );
    }

    /*
     * ============================================================
     * RESPUESTA DE GOOGLE
     * ============================================================
     */

    const oauthError =
      request.nextUrl.searchParams
        .get(
          "error"
        );

    if (
      oauthError
    ) {
      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            oauthError ===
              "access_denied"
              ? "cancelled"
              : "error"
          )
        )
      );
    }

    const code =
      request.nextUrl.searchParams
        .get(
          "code"
        )
        ?.trim() ??
      "";

    const returnedState =
      request.nextUrl.searchParams
        .get(
          "state"
        )
        ?.trim() ??
      "";

    const expectedState =
      request.cookies.get(
        STATE_COOKIE
      )?.value ??
      "";

    const businessId =
      request.cookies.get(
        BUSINESS_COOKIE
      )?.value ??
      "";

    if (
      !code ||
      !returnedState ||
      !expectedState ||
      returnedState !==
        expectedState ||
      !businessId ||
      !isUuid(
        businessId
      )
    ) {
      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "invalid-state"
          )
        )
      );
    }

    /*
     * ============================================================
     * USUARIO AUTENTICADO
     * ============================================================
     */

    const supabase =
      await createClient();

    const admin =
      createAdminClient();

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
      return clearOAuthCookies(
        NextResponse.redirect(
          new URL(
            "/login",
            request.url
          )
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
      profileError
    ) {
      console.error(
        "Error checking Google Calendar callback profile:",
        profileError
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "profile-error"
          )
        )
      );
    }

    if (
      !profile ||
      profile.role !==
        "business" ||
      profile.is_blocked
    ) {
      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "unauthorized"
          )
        )
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
        "Error checking Google Calendar callback business ownership:",
        businessError
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "business-error"
          )
        )
      );
    }

    if (
      !business
    ) {
      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "unauthorized"
          )
        )
      );
    }

    /*
     * ============================================================
     * INTERCAMBIAR CODE POR TOKENS
     * ============================================================
     */

    const redirectUri =
      getRedirectUri(
        request
      );

    const tokenResponse =
      await fetch(
        GOOGLE_TOKEN_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            new URLSearchParams({
              code,

              client_id:
                clientId,

              client_secret:
                clientSecret,

              redirect_uri:
                redirectUri,

              grant_type:
                "authorization_code",
            }),
        }
      );

    let tokenData:
      GoogleTokenResponse;

    try {
      tokenData =
        (
          await tokenResponse.json()
        ) as GoogleTokenResponse;
    } catch (
      tokenParseError
    ) {
      console.error(
        "Google Calendar token response was not valid JSON:",
        tokenParseError
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "token-error"
          )
        )
      );
    }

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "Google Calendar token exchange error:",
        {
          status:
            tokenResponse.status,

          error:
            tokenData.error ??
            null,

          errorDescription:
            tokenData.error_description ??
            null,
        }
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "token-error"
          )
        )
      );
    }

    /*
     * ============================================================
     * CONEXIÓN EXISTENTE
     * ============================================================
     */

    const {
      data:
        existingConnection,
      error:
        existingConnectionError,
    } =
      await admin
        .from(
          "business_google_calendar_connections"
        )
        .select(`
          id,
          refresh_token
        `)
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

    if (
      existingConnectionError
    ) {
      console.error(
        "Error loading existing Google Calendar connection:",
        existingConnectionError
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "save-error"
          )
        )
      );
    }

    /*
     * Google puede no devolver refresh_token
     * en autorizaciones posteriores.
     *
     * Si ya teníamos uno, lo conservamos.
     */

    const refreshToken =
      tokenData.refresh_token ??
      existingConnection
        ?.refresh_token ??
      "";

    if (
      !refreshToken
    ) {
      console.error(
        "Google Calendar OAuth did not return a refresh token."
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "refresh-token-missing"
          )
        )
      );
    }

    const expiresAt =
      typeof tokenData.expires_in ===
        "number"
        ? new Date(
            Date.now() +
              tokenData.expires_in *
                1000
          ).toISOString()
        : null;

    /*
     * ============================================================
     * GUARDAR CONEXIÓN
     * ============================================================
     */

    const {
      error:
        upsertError,
    } =
      await admin
        .from(
          "business_google_calendar_connections"
        )
        .upsert(
          {
            business_id:
              businessId,

            google_calendar_id:
              "primary",

            google_account_email:
              null,

            access_token:
              tokenData.access_token,

            refresh_token:
              refreshToken,

            token_expires_at:
              expiresAt,

            scope:
              tokenData.scope ??
              "https://www.googleapis.com/auth/calendar.events",

            connected_at:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "business_id",
          }
        );

    if (
      upsertError
    ) {
      console.error(
        "Error saving Google Calendar connection:",
        upsertError
      );

      return clearOAuthCookies(
        NextResponse.redirect(
          returnUrl(
            request,
            "save-error"
          )
        )
      );
    }

    /*
     * ============================================================
     * CONECTADO
     * ============================================================
     */

    return clearOAuthCookies(
      NextResponse.redirect(
        returnUrl(
          request,
          "connected"
        )
      )
    );
  } catch (
    error
  ) {
    console.error(
      "Unexpected Google Calendar callback error:",
      error
    );

    return clearOAuthCookies(
      NextResponse.redirect(
        returnUrl(
          request,
          "error"
        )
      )
    );
  }
}