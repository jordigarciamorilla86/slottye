import {
  NextResponse,
} from "next/server";

import {
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

type RequestBody = {
  query?: unknown;
};

type GooglePlace = {
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

  location?: {
    latitude?: number;
    longitude?: number;
  };

  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;

  websiteUri?: string;

  rating?: number;
  userRatingCount?: number;

  googleMapsUri?: string;

  types?: string[];
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
};

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

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

    const query =
      typeof bodyResult.data
        .query ===
        "string"
        ? bodyResult.data
            .query.trim()
        : "";

    if (
      !query
    ) {
      return NextResponse.json(
        {
          error:
            "Escribe el nombre o la dirección del negocio.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * Evitamos enviar búsquedas absurdamente grandes
     * al servicio externo.
     */

    if (
      query.length >
      300
    ) {
      return NextResponse.json(
        {
          error:
            "La búsqueda es demasiado larga.",
        },
        {
          status:
            400,
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
     * GOOGLE PLACES
     * ============================================================
     */

    const googleResponse =
      await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Goog-Api-Key":
              apiKey,

            "X-Goog-FieldMask":
              [
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.location",
                "places.rating",
                "places.userRatingCount",
                "places.googleMapsUri",
                "places.nationalPhoneNumber",
                "places.internationalPhoneNumber",
                "places.websiteUri",
                "places.postalAddress",
                "places.types",
              ].join(
                ","
              ),
          },

          body:
            JSON.stringify({
              textQuery:
                query,

              pageSize:
                5,
            }),

          cache:
            "no-store",
        }
      );

    if (
      !googleResponse.ok
    ) {
      /*
       * No devolvemos el cuerpo de error de Google
       * al navegador.
       */

      console.error(
        "Google Places search request failed:",
        {
          status:
            googleResponse.status,

          statusText:
            googleResponse.statusText ||
            null,
        }
      );

      return NextResponse.json(
        {
          error:
            "Google Places no ha podido buscar el negocio.",
        },
        {
          status:
            502,
        }
      );
    }

    /*
     * ============================================================
     * RESPUESTA
     * ============================================================
     */

    let result:
      GooglePlacesResponse;

    try {
      result =
        (
          await googleResponse.json()
        ) as GooglePlacesResponse;
    } catch (
      parseError
    ) {
      console.error(
        "Could not parse Google Places search response:",
        parseError
      );

      return NextResponse.json(
        {
          error:
            "Google Places ha devuelto una respuesta no válida.",
        },
        {
          status:
            502,
        }
      );
    }

    const places =
      Array.isArray(
        result.places
      )
        ? result.places
        : [];

    const candidates =
      places
        .filter(
          (
            place
          ) =>
            typeof place.id ===
              "string" &&
            place.id.trim()
              .length >
              0
        )
        .map(
          (
            place
          ) => {
            const latitude =
              place.location
                ?.latitude;

            const longitude =
              place.location
                ?.longitude;

            const rating =
              place.rating;

            const reviewCount =
              place.userRatingCount;

            return {
              placeId:
                place.id as string,

              name:
                place.displayName
                  ?.text ??
                "",

              formattedAddress:
                place.formattedAddress ??
                "",

              address:
                Array.isArray(
                  place.postalAddress
                    ?.addressLines
                )
                  ? place.postalAddress
                      ?.addressLines
                      ?.join(
                        ", "
                      ) ??
                    ""
                  : "",

              city:
                place.postalAddress
                  ?.locality ??
                "",

              postalCode:
                place.postalAddress
                  ?.postalCode ??
                "",

              phone:
                place
                  .nationalPhoneNumber ??
                place
                  .internationalPhoneNumber ??
                "",

              website:
                place.websiteUri ??
                "",

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
                typeof rating ===
                  "number" &&
                Number.isFinite(
                  rating
                )
                  ? rating
                  : null,

              reviewCount:
                typeof reviewCount ===
                  "number" &&
                Number.isFinite(
                  reviewCount
                )
                  ? reviewCount
                  : 0,

              googleMapsUrl:
                place.googleMapsUri ??
                null,

              types:
                Array.isArray(
                  place.types
                )
                  ? place.types
                  : [],
            };
          }
        );

    return NextResponse.json({
      success:
        true,

      candidates,
    });
  } catch (
    error
  ) {
    console.error(
      "Google Places search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error buscando el negocio en Google.",
      },
      {
        status:
          500,
      }
    );
  }
}