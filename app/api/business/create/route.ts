import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "No has iniciado sesión.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Error checking profile before creating business:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar tu cuenta.",
        },
        {
          status: 500,
        }
      );
    }

    if (profile?.role !== "business") {
      return NextResponse.json(
        {
          error:
            "Tu cuenta no tiene permisos para crear un negocio.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const categoryId =
      typeof body.categoryId === "string"
        ? body.categoryId.trim()
        : "";

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    const city =
      typeof body.city === "string"
        ? body.city.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Introduce el nombre del negocio.",
        },
        {
          status: 400,
        }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          error: "Selecciona una categoría.",
        },
        {
          status: 400,
        }
      );
    }

    if (!address) {
      return NextResponse.json(
        {
          error: "Introduce la dirección.",
        },
        {
          status: 400,
        }
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          error: "Introduce la ciudad.",
        },
        {
          status: 400,
        }
      );
    }

    const latitude =
      typeof body.latitude === "number" &&
      Number.isFinite(body.latitude)
        ? body.latitude
        : null;

    const longitude =
      typeof body.longitude === "number" &&
      Number.isFinite(body.longitude)
        ? body.longitude
        : null;

    const googlePlaceId =
      optionalString(body.googlePlaceId);

    const baseSlug = createSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        {
          error:
            "No se ha podido generar un identificador válido para el negocio.",
        },
        {
          status: 400,
        }
      );
    }

    const slug =
      `${baseSlug}-${crypto.randomUUID().slice(
        0,
        6
      )}`;

    const { error } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,

        category_id: categoryId,

        name,

        slug,

        description:
          optionalString(body.description),

        address,

        city,

        postal_code:
          optionalString(body.postalCode),

        phone:
          optionalString(body.phone),

        email:
          optionalString(body.email),

        website:
          optionalString(body.website),

        latitude,

        longitude,

        google_place_id:
          googlePlaceId,

        show_google_reviews:
          !!googlePlaceId &&
          body.showGoogleReviews === true,

        active: true,
      });

    if (error) {
      console.error(
        "Error creating business:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido crear el negocio.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Unexpected error creating business:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se ha podido crear el negocio.",
      },
      {
        status: 500,
      }
    );
  }
}