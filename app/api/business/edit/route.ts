import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  checkRateLimit,
} from "@/lib/api/rate-limit";

type RequestBody = {
  businessId?: unknown;

  name?: unknown;
  categoryId?: unknown;
  description?: unknown;
  address?: unknown;
  city?: unknown;
  postalCode?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;

  latitude?: unknown;
  longitude?: unknown;

  minBookingNoticeHours?: unknown;
  maxBookingAdvanceDays?: unknown;
  allowCancellations?: unknown;
  minCancellationNoticeHours?: unknown;
  autoCompleteBookings?: unknown;
};

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
    NextRequest
) {
  try {
    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    /*
     * ============================================================
     * USUARIO AUTENTICADO
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

    const rateLimit =
      await checkRateLimit({
        identifier: user.id,
        prefix: "business-edit",
        limit: 20,
        window: "1 m",
      });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: rateLimit.status }
      );
    }

    /*
     * ============================================================
     * COMPROBAR CUENTA BUSINESS ACTIVA
     * ============================================================
     */

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
          role,
          is_blocked
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Error checking business profile before edit:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar tu cuenta.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !profile ||
      profile.role !==
        "business"
    ) {
      return NextResponse.json(
        {
          error:
            "No autorizado.",
        },
        {
          status:
            403,
        }
      );
    }

    if (
      profile.is_blocked
    ) {
      return NextResponse.json(
        {
          error:
            "Tu cuenta está bloqueada.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * LEER DATOS
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

    const body =
      bodyResult.data;

    const businessId =
      typeof body.businessId ===
        "string"
        ? body.businessId.trim()
        : "";

    if (
      !businessId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del negocio.",
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
     * COMPROBAR PROPIEDAD DEL NEGOCIO
     * ============================================================
     */

    const {
      data:
        currentBusiness,
      error:
        businessError,
    } =
      await admin
        .from(
          "businesses"
        )
        .select(`
          id,
          owner_id,
          category_id
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
        "Error checking business owner before edit:",
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
      !currentBusiness
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permiso para modificar este negocio.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * VALIDAR NOMBRE
     * ============================================================
     */

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : "";

    if (
      !name
    ) {
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

    /*
     * ============================================================
     * VALIDAR CATEGORÍA
     * ============================================================
     */

    const categoryId =
      body.categoryId ===
      undefined
        ? currentBusiness.category_id
        : typeof body.categoryId ===
            "string"
          ? body.categoryId.trim()
          : "";

    if (
      !categoryId ||
      !isUuid(
        categoryId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Selecciona una categoría válida.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        category,
      error:
        categoryError,
    } =
      await admin
        .from(
          "categories"
        )
        .select(`
          id
        `)
        .eq(
          "id",
          categoryId
        )
        .maybeSingle();

    if (
      categoryError
    ) {
      console.error(
        "Error checking business category:",
        categoryError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la categoría.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !category
    ) {
      return NextResponse.json(
        {
          error:
            "La categoría seleccionada no existe.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * VALIDAR EMAIL
     * ============================================================
     */

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

    /*
     * ============================================================
     * VALIDAR WEB
     * ============================================================
     */

    const website =
      optionalText(
        body.website
      );

    if (
      website
    ) {
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

    /*
     * ============================================================
     * VALIDAR COORDENADAS
     * ============================================================
     */

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

    /*
     * ============================================================
     * POLÍTICAS DE RESERVA
     * ============================================================
     */

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
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "La política de cancelación no es válida.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      typeof body.autoCompleteBookings !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "La política de autocompletado no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * ACTUALIZAR NEGOCIO
     * ============================================================
     */

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

          category_id:
            categoryId,

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

          min_booking_notice_hours:
            minBookingNoticeHours,

          max_booking_advance_days:
            maxBookingAdvanceDays,

          allow_cancellations:
            body.allowCancellations,

          min_cancellation_notice_hours:
            minCancellationNoticeHours,

          auto_complete_bookings:
            body.autoCompleteBookings,

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
        .eq(
          "owner_id",
          user.id
        )
        .select(`
          id,
          name,
          category_id,
          description,
          address,
          city,
          postal_code,
          phone,
          email,
          website,
          latitude,
          longitude,
          min_booking_notice_hours,
          max_booking_advance_days,
          allow_cancellations,
          min_cancellation_notice_hours,
          auto_complete_bookings,
          booking_policies_reviewed_at
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Error updating owned business:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido actualizar el negocio.",
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
            "No se ha podido actualizar el negocio.",
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
  } catch (
    error
  ) {
    console.error(
      "Unexpected business edit error:",
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
