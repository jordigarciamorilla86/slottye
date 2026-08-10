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
  
  const GOOGLE_TOKEN_URL =
    "https://oauth2.googleapis.com/token";
  
  const STATE_COOKIE =
    "slottye_google_calendar_state";
  
  const BUSINESS_COOKIE =
    "slottye_google_calendar_business_id";
  
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
  
    return response;
  }
  
  function dashboardUrl(
    request: NextRequest,
    status: string
  ) {
    const url =
      new URL(
        "/business-dashboard",
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
            dashboardUrl(
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
            dashboardUrl(
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
        !businessId
      ) {
        return clearOAuthCookies(
          NextResponse.redirect(
            dashboardUrl(
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
      } =
        await supabase.auth.getUser();
  
      if (
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
        profileError ||
        !profile ||
        profile.role !==
          "business" ||
        profile.is_blocked
      ) {
        return clearOAuthCookies(
          NextResponse.redirect(
            dashboardUrl(
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
        businessError ||
        !business
      ) {
        if (
          businessError
        ) {
          console.error(
            "Error checking Google Calendar callback business ownership:",
            businessError
          );
        }
  
        return clearOAuthCookies(
          NextResponse.redirect(
            dashboardUrl(
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
  
      const tokenData =
        (
          await tokenResponse.json()
        ) as GoogleTokenResponse;
  
      if (
        !tokenResponse.ok ||
        !tokenData.access_token
      ) {
        console.error(
          "Google Calendar token exchange error:",
          tokenData
        );
  
        return clearOAuthCookies(
          NextResponse.redirect(
            dashboardUrl(
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
            dashboardUrl(
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
            dashboardUrl(
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
            dashboardUrl(
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
          dashboardUrl(
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
          dashboardUrl(
            request,
            "error"
          )
        )
      );
    }
  }