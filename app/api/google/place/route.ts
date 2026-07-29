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
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Falta businessId" },
        { status: 400 }
      );
    }

    /*
     * Comprobamos que el negocio pertenece
     * al usuario autenticado.
     */
    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
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
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json(
        {
          error:
            "Negocio no encontrado o no autorizado",
        },
        { status: 404 }
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
        { status: 500 }
      );
    }

    /*
     * Construimos una búsqueda bastante precisa:
     *
     * Nombre + dirección + CP + ciudad.
     */
    const query = [
      business.name,
      business.address,
      business.postal_code,
      business.city,
    ]
      .filter(Boolean)
      .join(", ");

    const body: {
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
      textQuery: query,
      pageSize: 5,
    };

    /*
     * Si tenemos coordenadas,
     * favorecemos resultados cercanos.
     */
    if (
      business.latitude !== null &&
      business.longitude !== null
    ) {
      body.locationBias = {
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
          radius: 2000,
        },
      };
    }

    const googleResponse =
      await fetch(
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
              ].join(","),
          },

          body:
            JSON.stringify(body),

          cache: "no-store",
        }
      );

    if (!googleResponse.ok) {
      const googleError =
        await googleResponse.text();

      console.error(
        "Google Places error:",
        googleError
      );

      return NextResponse.json(
        {
          error:
            "Google Places no ha podido buscar el negocio",
        },
        { status: 502 }
      );
    }

    const result =
      await googleResponse.json();

    const places =
      result.places ?? [];

    if (places.length === 0) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          places: [],
        }
      );
    }

    /*
     * De momento NO guardamos automáticamente
     * el primer resultado.
     *
     * Primero enseñaremos los candidatos
     * al propietario para evitar asociar
     * un negocio incorrecto.
     */
    const candidates =
      places.map(
        (place: {
          id: string;
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
        }) => ({
          placeId:
            place.id,

          name:
            place.displayName
              ?.text ?? "",

          address:
            place.formattedAddress ??
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
        })
      );

    return NextResponse.json({
      success: true,
      found: true,
      candidates,
    });
  } catch (error) {
    console.error(
      "Google place search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error buscando el negocio en Google",
      },
      { status: 500 }
    );
  }
}