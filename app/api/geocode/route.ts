import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  const {
    address,
    city,
    postalCode,
  }: {
    address: string;
    city: string;
    postalCode: string;
  } = await request.json();

  const query = [
    address,
    postalCode,
    city,
    "España",
  ]
    .filter(Boolean)
    .join(", ");

  const key =
    process.env.GOOGLE_GEOCODING_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "Geocoding no configurado" },
      { status: 500 }
    );
  }

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(query)}` +
    `&key=${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await response.json();

  if (
    !response.ok ||
    data.status !== "OK" ||
    !data.results?.[0]
  ) {
    return NextResponse.json(
      {
        error:
          data.error_message ??
          "No se pudo localizar la dirección",
      },
      { status: 400 }
    );
  }

  const location =
    data.results[0].geometry.location;

  return NextResponse.json({
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress:
      data.results[0].formatted_address,
  });
}