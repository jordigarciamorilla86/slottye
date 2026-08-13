import {
  NextResponse,
} from "next/server";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";

import {
  createClient,
} from "@/lib/supabase/server";

type RequestBody = {
  businessId?: unknown;
};

type GooglePlace = {
  id?: string;

  displayName?: {
    text?: string;
  };

  formattedAddress?: string;

  location?: {
    latitude?: number;
    longitude?: number;
  };

  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
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

    const businessId =
      typeof bodyResult.data
        .businessId ===
        "string"
        ? bodyResult.data
            .businessId.trim()
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
      await supabase
        .from(
          "businesses"
        )
        .select(`
          id,
          name,
          address,
          city,
          postal_code,
          latitude,
          longitude,
          google_place_id
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
        "Error checking business before Google Places search:",
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
            "Negocio no encontrado o no autorizado.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * RATE LIMIT
     * ============================================================
     *
     * Esta llamada consume Google Places, por lo que limitamos
     * las búsquedas por usuario autenticado.
     */

    const rateLimit =
      await checkRateLimit({
        identifier:
          user.id,

        prefix:
          "google-place-search",

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
     * BÚSQUEDA
     * ============================================================
     */

    const query =
      [
        business.name,
        business.address,
        business.postal_code,
        business.city,
      ]
        .filter(
          Boolean
        )
        .join(
          ", "
        );

    if (
      !query
    ) {
      return NextResponse.json(
        {
          error:
            "El negocio no tiene suficientes datos para realizar la búsqueda.",
        },
        {
          status:
            400,
        }
      );
    }

    const googleRequestBody: {
      textQuery: string;
      pageSize: number;

      locationBias?: {
        circle: {
          center: {
            latitude: number;
            longitude: number;
          };

          radius: number;
        };
      };
    } = {
      textQuery:
        query,

      pageSize:
        5,
    };

    /*
     * Si tenemos coordenadas válidas,
     * favorecemos resultados cercanos.
     */

    if (
      typeof business.latitude ===
        "number" &&
      Number.isFinite(
        business.latitude
      ) &&
      typeof business.longitude ===
        "number" &&
      Number.isFinite(
        business.longitude
      )
    ) {
      googleRequestBody.locationBias = {
        circle: {
          center: {
            latitude:
              business.latitude,

            longitude:
              business.longitude,
          },

          /*
           * 2 km alrededor del punto.
           */
          radius:
            2000,
        },
      };
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
              ].join(
                ","
              ),
          },

          body:
            JSON.stringify(
              googleRequestBody
            ),

          cache:
            "no-store",
        }
      );

    if (
      !googleResponse.ok
    ) {
      console.error(
        "Google Places search request failed:",
        {
          status:
            googleResponse.status,

          statusText:
            googleResponse.statusText ||
            null,

          businessId:
            business.id,
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

    if (
      places.length ===
        0
    ) {
      return NextResponse.json({
        success:
          true,

        found:
          false,

        candidates:
          [],
      });
    }

    /*
     * No guardamos automáticamente ningún resultado.
     * El propietario debe seleccionar el candidato correcto.
     */

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

            return {
              placeId:
                place.id as string,

              name:
                place.displayName
                  ?.text ??
                "",

              address:
                place.formattedAddress ??
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
                place.googleMapsUri ??
                null,
            };
          }
        );

    return NextResponse.json({
      success:
        true,

      found:
        candidates.length >
        0,

      candidates,
    });
  } catch (
    error
  ) {
    console.error(
      "Google place search error:",
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