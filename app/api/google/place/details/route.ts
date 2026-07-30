import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    /*
     * ============================================================
     * USUARIO AUTENTICADO
     * ============================================================
     */

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "No autorizado",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ============================================================
     * INPUT
     * ============================================================
     */

    const {
      placeId,
    } =
      await request.json();

    if (!placeId) {
      return NextResponse.json(
        {
          error:
            "Falta placeId",
        },
        {
          status: 400,
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

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_MAPS_API_KEY no está configurada",
        },
        {
          status: 500,
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
          method: "GET",

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
              ].join(","),
          },

          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      const googleError =
        await response.text();

      console.error(
        "Google Place Details error:",
        googleError
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron obtener los datos de Google Maps",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ============================================================
     * NORMALIZAR RESPUESTA
     * ============================================================
     */

    const place =
      await response.json();

    const postalAddress =
      place.postalAddress ??
      {};

    return NextResponse.json({
      success: true,

      place: {
        placeId:
          place.id,

        name:
          place.displayName
            ?.text ??
          null,

        formattedAddress:
          place.formattedAddress ??
          null,

        addressLines:
          postalAddress
            .addressLines ??
          [],

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
          place.location
            ?.latitude ??
          null,

        longitude:
          place.location
            ?.longitude ??
          null,

        rating:
          place.rating ??
          null,

        reviewCount:
          place
            .userRatingCount ??
          0,

        googleMapsUrl:
          place
            .googleMapsUri ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Google place details error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error consultando Google Maps",
      },
      {
        status: 500,
      }
    );
  }
}