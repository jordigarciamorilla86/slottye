import {
  NextResponse,
} from "next/server";

import {
  readJsonBody,
} from "@/lib/api/request";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";

import {
  createClient,
} from "@/lib/supabase/server";

type RequestBody = {
  address?: unknown;
  city?: unknown;
  postalCode?: unknown;
};

type GoogleGeocodingResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

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

    const address =
      typeof body.address ===
        "string"
        ? body.address.trim()
        : "";

    const city =
      typeof body.city ===
        "string"
        ? body.city.trim()
        : "";

    const postalCode =
      typeof body.postalCode ===
        "string"
        ? body.postalCode.trim()
        : "";

    if (
      !address &&
      !city &&
      !postalCode
    ) {
      return NextResponse.json(
        {
          error:
            "Introduce una dirección válida.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * RATE LIMIT
     * ============================================================
     */

    const rateLimit =
      await checkRateLimit({
        identifier:
          user.id,

        prefix:
          "geocode",

        limit:
          20,

        window:
          "1 m",
      });

    if (
      !rateLimit.ok
    ) {
      return NextResponse.json(
        {
          error:
            rateLimit.error,
        },
        {
          status:
            rateLimit.status,
        }
      );
    }

    const query =
      [
        address,
        postalCode,
        city,
        "España",
      ]
        .filter(
          Boolean
        )
        .join(
          ", "
        );

    /*
     * ============================================================
     * CONFIGURACIÓN GOOGLE
     * ============================================================
     */

    const key =
      process.env
        .GOOGLE_GEOCODING_API_KEY;

    if (
      !key
    ) {
      console.error(
        "GOOGLE_GEOCODING_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          error:
            "El servicio de geolocalización no está configurado.",
        },
        {
          status:
            500,
        }
      );
    }

    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?address=${encodeURIComponent(query)}` +
      `&key=${encodeURIComponent(key)}`;

    /*
     * ============================================================
     * GOOGLE GEOCODING
     * ============================================================
     */

    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",
        }
      );

    let data:
      GoogleGeocodingResponse;

    try {
      data =
        (
          await response.json()
        ) as GoogleGeocodingResponse;
    } catch (
      parseError
    ) {
      console.error(
        "Could not parse Google Geocoding response:",
        parseError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido localizar la dirección.",
        },
        {
          status:
            502,
        }
      );
    }

    if (
      !response.ok ||
      data.status !==
        "OK" ||
      !data.results?.[0]
    ) {
      console.error(
        "Google Geocoding request failed:",
        {
          httpStatus:
            response.status,

          googleStatus:
            data.status ??
            null,

          googleError:
            data.error_message ??
            null,
        }
      );

      return NextResponse.json(
        {
          error:
            "No se pudo localizar la dirección.",
        },
        {
          status:
            400,
        }
      );
    }

    const result =
      data.results[0];

    const latitude =
      result.geometry
        ?.location
        ?.lat;

    const longitude =
      result.geometry
        ?.location
        ?.lng;

    if (
      typeof latitude !==
        "number" ||
      !Number.isFinite(
        latitude
      ) ||
      typeof longitude !==
        "number" ||
      !Number.isFinite(
        longitude
      )
    ) {
      console.error(
        "Google Geocoding returned an invalid location."
      );

      return NextResponse.json(
        {
          error:
            "No se pudo localizar la dirección.",
        },
        {
          status:
            502,
        }
      );
    }

    return NextResponse.json({
      latitude,

      longitude,

      formattedAddress:
        result.formatted_address ??
        query,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected geocoding error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al localizar la dirección.",
      },
      {
        status:
          500,
      }
    );
  }
}