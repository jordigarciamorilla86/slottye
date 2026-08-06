import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  type RouteContext = {
    params: Promise<{
      businessId: string;
    }>;
  };
  
  type RequestBody = {
    name?: unknown;
    description?: unknown;
    address?: unknown;
    city?: unknown;
    postalCode?: unknown;
    phone?: unknown;
    email?: unknown;
    website?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  
    googlePlaceId?: unknown;
    showGoogleReviews?: unknown;
  
    minBookingNoticeHours?: unknown;
    maxBookingAdvanceDays?: unknown;
    allowCancellations?: unknown;
    minCancellationNoticeHours?: unknown;
  };
  
  async function requireAdmin() {
    const supabase =
      await createClient();
  
    const admin =
      createAdminClient();
  
    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();
  
    if (!user) {
      return {
        admin: null,
  
        response:
          NextResponse.json(
            {
              error:
                "No autorizado.",
            },
            {
              status:
                401,
            }
          ),
      };
    }
  
    const {
      data:
        profile,
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .select(`
          id,
          is_admin
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();
  
    if (
      profileError ||
      !profile?.is_admin
    ) {
      return {
        admin: null,
  
        response:
          NextResponse.json(
            {
              error:
                "No autorizado.",
            },
            {
              status:
                403,
            }
          ),
      };
    }
  
    return {
      admin,
  
      response:
        null,
    };
  }
  
  function optionalText(
    value:
      unknown
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return null;
    }
  
    const normalized =
      value.trim();
  
    return normalized ||
      null;
  }
  
  function validCoordinate(
    value:
      unknown,
    minimum:
      number,
    maximum:
      number
  ) {
    if (
      value ===
        null ||
      value ===
        undefined ||
      value ===
        ""
    ) {
      return null;
    }
  
    const parsed =
      Number(
        value
      );
  
    if (
      !Number.isFinite(
        parsed
      ) ||
      parsed <
        minimum ||
      parsed >
        maximum
    ) {
      return undefined;
    }
  
    return parsed;
  }
  
  export async function PUT(
    request:
      NextRequest,
    {
      params,
    }:
      RouteContext
  ) {
    try {
      const {
        businessId,
      } =
        await params;
  
      const {
        admin,
        response:
          authorizationResponse,
      } =
        await requireAdmin();
  
      if (
        authorizationResponse ||
        !admin
      ) {
        return authorizationResponse;
      }
  
      const body =
        (
          await request.json()
        ) as RequestBody;
  
      const name =
        typeof body.name ===
        "string"
          ? body.name.trim()
          : "";
  
      if (!name) {
        return NextResponse.json(
          {
            error:
              "El nombre del negocio es obligatorio.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const email =
        optionalText(
          body.email
        );
  
      if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El correo electrónico no es válido.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const website =
        optionalText(
          body.website
        );
  
      if (website) {
        try {
          const parsedUrl =
            new URL(
              website
            );
  
          if (
            parsedUrl.protocol !==
              "http:" &&
            parsedUrl.protocol !==
              "https:"
          ) {
            throw new Error();
          }
        } catch {
          return NextResponse.json(
            {
              error:
                "La página web no es válida.",
            },
            {
              status:
                400,
            }
          );
        }
      }
  
      const latitude =
        validCoordinate(
          body.latitude,
          -90,
          90
        );
  
      const longitude =
        validCoordinate(
          body.longitude,
          -180,
          180
        );
  
      if (
        latitude ===
          undefined ||
        longitude ===
          undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Las coordenadas no son válidas.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const minBookingNoticeHours =
        Number(
          body.minBookingNoticeHours
        );
  
      const maxBookingAdvanceDays =
        Number(
          body.maxBookingAdvanceDays
        );
  
      const minCancellationNoticeHours =
        Number(
          body.minCancellationNoticeHours
        );
  
      if (
        !Number.isInteger(
          minBookingNoticeHours
        ) ||
        minBookingNoticeHours <
          0 ||
        minBookingNoticeHours >
          8760
      ) {
        return NextResponse.json(
          {
            error:
              "La antelación mínima para reservar no es válida.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !Number.isInteger(
          maxBookingAdvanceDays
        ) ||
        maxBookingAdvanceDays <
          1 ||
        maxBookingAdvanceDays >
          3650
      ) {
        return NextResponse.json(
          {
            error:
              "La antelación máxima para reservar no es válida.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !Number.isInteger(
          minCancellationNoticeHours
        ) ||
        minCancellationNoticeHours <
          0 ||
        minCancellationNoticeHours >
          8760
      ) {
        return NextResponse.json(
          {
            error:
              "La antelación mínima para cancelar no es válida.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        typeof body.allowCancellations !==
          "boolean" ||
        typeof body.showGoogleReviews !==
          "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "Las opciones enviadas no son válidas.",
          },
          {
            status:
              400,
          }
        );
      }
  
      const {
        data:
          business,
        error:
          updateError,
      } =
        await admin
          .from(
            "businesses"
          )
          .update({
            name,
  
            description:
              optionalText(
                body.description
              ),
  
            address:
              optionalText(
                body.address
              ),
  
            city:
              optionalText(
                body.city
              ),
  
            postal_code:
              optionalText(
                body.postalCode
              ),
  
            phone:
              optionalText(
                body.phone
              ),
  
            email,
  
            website,
  
            latitude,
            longitude,
  
            google_place_id:
              optionalText(
                body.googlePlaceId
              ),
  
            show_google_reviews:
              body.showGoogleReviews,
  
            min_booking_notice_hours:
              minBookingNoticeHours,
  
            max_booking_advance_days:
              maxBookingAdvanceDays,
  
            allow_cancellations:
              body.allowCancellations,
  
            min_cancellation_notice_hours:
              minCancellationNoticeHours,
  
            booking_policies_reviewed_at:
              new Date()
                .toISOString(),
  
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            businessId
          )
          .select(`
            id,
            name,
            description,
            address,
            city,
            postal_code,
            phone,
            email,
            website,
            latitude,
            longitude,
            google_place_id,
            show_google_reviews,
            min_booking_notice_hours,
            max_booking_advance_days,
            allow_cancellations,
            min_cancellation_notice_hours,
            booking_policies_reviewed_at
          `)
          .maybeSingle();
  
      if (updateError) {
        console.error(
          "Error updating business as admin:",
          updateError
        );
  
        return NextResponse.json(
          {
            error:
              updateError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
      if (!business) {
        return NextResponse.json(
          {
            error:
              "El negocio no existe.",
          },
          {
            status:
              404,
          }
        );
      }
  
      return NextResponse.json({
        business,
      });
    } catch (error) {
      console.error(
        "Unexpected admin business edit error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Ha ocurrido un error inesperado al guardar el negocio.",
        },
        {
          status:
            500,
        }
      );
    }
  }