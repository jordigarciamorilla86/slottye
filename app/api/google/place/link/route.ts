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

    const {
      businessId,
      googlePlaceId,
      showGoogleReviews,
    } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Falta businessId" },
        { status: 400 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        google_place_id:
          googlePlaceId || null,

        show_google_reviews:
          !!googlePlaceId &&
          !!showGoogleReviews,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", businessId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Google place link error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo guardar la vinculación con Google",
      },
      { status: 500 }
    );
  }
}