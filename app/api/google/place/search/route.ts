import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No autorizado",
        },
        {
          status: 401,
        }
      );
    }

    const { query } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json(
        {
          error:
            "Escribe el nombre o la dirección del negocio.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY;

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

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",

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
            ].join(","),
        },

        body: JSON.stringify({
          textQuery:
            query.trim(),

          pageSize: 5,
        }),

        cache: "no-store",
      }
    );

    if (!googleResponse.ok) {
      const googleError =
        await googleResponse.text();

      console.error(
        "Google Places search error:",
        googleError
      );

      return NextResponse.json(
        {
          error:
            "Google Places no ha podido buscar el negocio",

          details:
            googleError,
        },
        {
          status: 502,
        }
      );
    }

    const result =
      await googleResponse.json();

    const candidates =
      (result.places ?? []).map(
        (place: {
          id: string;

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
        }) => ({
          placeId:
            place.id,

          name:
            place.displayName
              ?.text ?? "",

          formattedAddress:
            place.formattedAddress ??
            "",

          address:
            place.postalAddress
              ?.addressLines
              ?.join(", ") ??
            "",

          city:
            place.postalAddress
              ?.locality ??
            "",

          postalCode:
            place.postalAddress
              ?.postalCode ??
            "",

          phone:
            place.nationalPhoneNumber ??
            place.internationalPhoneNumber ??
            "",

          website:
            place.websiteUri ??
            "",

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
            place.userRatingCount ??
            0,

          googleMapsUrl:
            place.googleMapsUri ??
            null,

          types:
            place.types ?? [],
        })
      );

    return NextResponse.json({
      success: true,
      candidates,
    });
  } catch (error) {
    console.error(
      "Google Places search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error buscando el negocio en Google",
      },
      {
        status: 500,
      }
    );
  }
}