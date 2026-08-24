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
  writeAdminAuditLog,
} from "@/lib/admin/audit";

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

type RequestBody = {
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

  googlePlaceId?: unknown;
  showGoogleReviews?: unknown;

  minBookingNoticeHours?: unknown;
  maxBookingAdvanceDays?: unknown;
  allowCancellations?: unknown;
  minCancellationNoticeHours?: unknown;
  autoCompleteBookings?: unknown;
};

/*
 * ============================================================
 * COMPROBAR ADMINISTRADOR
 * ============================================================
 */

async function requireAdmin() {
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

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
    return {
      admin:
        null,

      user:
        null,

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
    profileError
  ) {
    console.error(
      "Error checking admin permissions for business edit:",
      profileError
    );

    return {
      admin:
        null,

      user:
        null,

      response:
        NextResponse.json(
          {
            error:
              "No se han podido comprobar los permisos.",
          },
          {
            status:
              500,
          }
        ),
    };
  }

  if (
    !profile
      ?.is_admin
  ) {
    return {
      admin:
        null,

      user:
        null,

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

    user,

    response:
      null,
  };
}

/*
 * ============================================================
 * TEXTO OPCIONAL
 * ============================================================
 */

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

  return (
    normalized ||
    null
  );
}

/*
 * ============================================================
 * COORDENADAS
 * ============================================================
 */

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

/*
 * ============================================================
 * EDITAR NEGOCIO
 * ============================================================
 */

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
     * ==========================================================
     * AUTORIZACIÓN
     * ==========================================================
     */

    const {
      admin,
      user,
      response:
        authorizationResponse,
    } =
      await requireAdmin();

    if (
      authorizationResponse ||
      !admin ||
      !user
    ) {
      return authorizationResponse;
    }

    /*
     * ==========================================================
     * LEER BODY
     * ==========================================================
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

    /*
     * ==========================================================
     * NOMBRE
     * ==========================================================
     */

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

    const categoryId =
      typeof body.categoryId === "string" ? body.categoryId.trim() : "";

    if (!categoryId || !isUuid(categoryId)) {
      return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
    }

    /*
     * ==========================================================
     * EMAIL
     * ==========================================================
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
     * ==========================================================
     * WEB
     * ==========================================================
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
     * ==========================================================
     * COORDENADAS
     * ==========================================================
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
     * ==========================================================
     * POLÍTICAS DE RESERVA
     * ==========================================================
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
        "boolean" ||
      typeof body.autoCompleteBookings !==
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

    /*
     * ==========================================================
     * CARGAR ESTADO ANTERIOR
     * ==========================================================
     *
     * Necesitamos conservar los valores anteriores antes
     * de realizar el UPDATE para poder registrarlos en
     * la auditoría administrativa.
     */

    const {
      data:
        previousBusiness,
      error:
        previousBusinessError,
    } =
      await admin
        .from(
          "businesses"
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
          google_place_id,
          show_google_reviews,
          min_booking_notice_hours,
          max_booking_advance_days,
          allow_cancellations,
          min_cancellation_notice_hours,
          auto_complete_bookings,
          booking_policies_reviewed_at,
          owner_id
        `)
        .eq(
          "id",
          businessId
        )
        .maybeSingle();

    if (
      previousBusinessError
    ) {
      console.error(
        "Error loading previous business before admin edit:",
        previousBusinessError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el estado actual del negocio.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !previousBusiness
    ) {
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

    /*
     * ==========================================================
     * ACTUALIZAR
     * ==========================================================
     */

    const now =
      new Date()
        .toISOString();

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

          google_place_id:
            optionalText(
              body.googlePlaceId
            ),

          show_google_reviews:
            typeof body.showGoogleReviews === "boolean"
              ? body.showGoogleReviews
              : previousBusiness.show_google_reviews,

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
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          businessId
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
          google_place_id,
          show_google_reviews,
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
        "Error updating business as admin:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido guardar el negocio.",
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
            "El negocio no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ==========================================================
     * AUDITORÍA
     * ==========================================================
     */

    try {
      await writeAdminAuditLog({
        adminUserId:
          user.id,

        action:
          "BUSINESS_UPDATED",

        entityType:
          "BUSINESS",

        entityId:
          business.id,

        businessId:
          business.id,

        targetUserId:
          previousBusiness.owner_id,

        description:
          `Se modificaron los datos y políticas del negocio ${business.name}.`,

        oldValues: {
          name:
            previousBusiness.name,

          description:
            previousBusiness.description,

          address:
            previousBusiness.address,

          city:
            previousBusiness.city,

          postal_code:
            previousBusiness.postal_code,

          phone:
            previousBusiness.phone,

          email:
            previousBusiness.email,

          website:
            previousBusiness.website,

          latitude:
            previousBusiness.latitude,

          longitude:
            previousBusiness.longitude,

          google_place_id:
            previousBusiness.google_place_id,

          show_google_reviews:
            previousBusiness.show_google_reviews,

          min_booking_notice_hours:
            previousBusiness.min_booking_notice_hours,

          max_booking_advance_days:
            previousBusiness.max_booking_advance_days,

          allow_cancellations:
            previousBusiness.allow_cancellations,

          min_cancellation_notice_hours:
            previousBusiness.min_cancellation_notice_hours,

          booking_policies_reviewed_at:
            previousBusiness.booking_policies_reviewed_at,
        },

        newValues: {
          name:
            business.name,

          description:
            business.description,

          address:
            business.address,

          city:
            business.city,

          postal_code:
            business.postal_code,

          phone:
            business.phone,

          email:
            business.email,

          website:
            business.website,

          latitude:
            business.latitude,

          longitude:
            business.longitude,

          google_place_id:
            business.google_place_id,

          show_google_reviews:
            business.show_google_reviews,

          min_booking_notice_hours:
            business.min_booking_notice_hours,

          max_booking_advance_days:
            business.max_booking_advance_days,

          allow_cancellations:
            business.allow_cancellations,

          min_cancellation_notice_hours:
            business.min_cancellation_notice_hours,

          booking_policies_reviewed_at:
            business.booking_policies_reviewed_at,
        },
      });
    } catch (
      auditError
    ) {
      /*
       * El negocio YA ha sido actualizado.
       *
       * Un fallo escribiendo la auditoría no debe provocar que
       * el navegador crea que la actualización del negocio falló.
       */

      console.error(
        "Error writing admin business update audit:",
        auditError
      );
    }

    /*
     * ==========================================================
     * RESPUESTA
     * ==========================================================
     */

    return NextResponse.json({
      business,
    });
  } catch (
    error
  ) {
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
