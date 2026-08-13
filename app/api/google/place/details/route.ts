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
  placeId?: unknown;
};

type GooglePlaceResponse = {
  id?: string;

  displayName?: {
    text?: string;
  };

  formattedAddress?: string;

  postalAddress?: {
    addressLines?: string[];
    locality?: string;
    postalCode?: string;
    administrativeArea?: string;
  };

  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;

  websiteUri?: string;

  location?: {
    latitude?: number;
    longitude?: number;
  };

  rating?: number;
  userRatingCount?: number;

  googleMapsUri?: string;
};

export async function POST(
  request: Request
) {
  try {
    /*
     * ============================================================
     * USUARIO AUTENTICADO
     * ============================================================
     */

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
     * INPUT
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

    const placeId =
      typeof bodyResult.data
        .placeId ===
        "string"
        ? bodyResult.data
            .placeId.trim()
        : "";

    if (
      !placeId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta placeId.",
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
          "google-place-details",

        limit:
          30,

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

    /*
     * ============================================================
     * API KEY
     * ============================================================
     */

    const apiKey =
      process.env
        .GOOGLE_MAPS_API_KEY;

    if (
      !apiKey
    ) {
      console.error(
        "GOOGLE_MAPS_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          error:
            "El servicio de Google Maps no está configurado.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * ============================================================
     * GOOGLE PLACE DETAILS
     * ============================================================
     */

    const response =
      await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(
          placeId
        )}`,
        {
          method:
            "GET",

          headers: {
            "X-Goog-Api-Key":
              apiKey,

            "X-Goog-FieldMask":
              [
                "id",
                "displayName",
                "formattedAddress",
                "postalAddress",
                "nationalPhoneNumber",
                "internationalPhoneNumber",
                "websiteUri",
                "location",
                "rating",
                "userRatingCount",
                "googleMapsUri",
              ].join(
                ","
              ),
          },

          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      console.error(
        "Google Place Details request failed:",
        {
          status:
            response.status,

          statusText:
            response.statusText ||
            null,

          placeId,
        }
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron obtener los datos de Google Maps.",
        },
        {
          status:
            502,
        }
      );
    }

    /*
     * ============================================================
     * NORMALIZAR RESPUESTA
     * ============================================================
     */

    let place:
      GooglePlaceResponse;

    try {
      place =
        (
          await response.json()
        ) as GooglePlaceResponse;
    } catch (
      parseError
    ) {
      console.error(
        "Could not parse Google Place Details response:",
        parseError
      );

      return NextResponse.json(
        {
          error:
            "Google Maps ha devuelto una respuesta no válida.",
        },
        {
          status:
            502,
        }
      );
    }

    const postalAddress =
      place.postalAddress ??
      {};

    const latitude =
      place.location
        ?.latitude;

    const longitude =
      place.location
        ?.longitude;

    return NextResponse.json({
      success:
        true,

      place: {
        placeId:
          place.id ??
          null,

        name:
          place.displayName
            ?.text ??
          null,

        formattedAddress:
          place.formattedAddress ??
          null,

        addressLines:
          Array.isArray(
            postalAddress
              .addressLines
          )
            ? postalAddress
                .addressLines
            : [],

        city:
          postalAddress
            .locality ??
          null,

        postalCode:
          postalAddress
            .postalCode ??
          null,

        region:
          postalAddress
            .administrativeArea ??
          null,

        phone:
          place
            .nationalPhoneNumber ??
          place
            .internationalPhoneNumber ??
          null,

        website:
          place.websiteUri ??
          null,

        latitude:
          typeof latitude ===
            "number" &&
          Number.isFinite(
            latitude
          )
            ? latitude
            : null,

        longitude:
          typeof longitude ===
            "number" &&
          Number.isFinite(
            longitude
          )
            ? longitude
            : null,

        rating:
          typeof place.rating ===
            "number" &&
          Number.isFinite(
            place.rating
          )
            ? place.rating
            : null,

        reviewCount:
          typeof place
            .userRatingCount ===
            "number" &&
          Number.isFinite(
            place.userRatingCount
          )
            ? place.userRatingCount
            : 0,

        googleMapsUrl:
          place
            .googleMapsUri ??
          null,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Google place details error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error consultando Google Maps.",
      },
      {
        status:
          500,
      }
    );
  }
}