import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    businessId: string;
  }>;
};

const DEFAULT_PAGE_SIZE =
  10;

const MAX_PAGE_SIZE =
  50;

/*
 * ============================================================
 * CONVERTIR FECHA DE EUROPE/MADRID A UTC
 * ============================================================
 *
 * El input type="date" devuelve una fecha YYYY-MM-DD sin zona
 * horaria. Esta función genera correctamente el inicio y final
 * de ese día en Europe/Madrid, incluyendo cambios de horario
 * de invierno y verano.
 */

function madridDateTimeToUtc(
  date:
    string,
  hour:
    number,
  minute =
    0,
  second =
    0
) {
  const [
    year,
    month,
    day,
  ] =
    date
      .split("-")
      .map(
        Number
      );

  /*
   * Primera aproximación:
   * interpretamos los componentes como UTC.
   */

  let utcDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      )
    );

  /*
   * Ajustamos iterativamente hasta que los componentes
   * vistos desde Europe/Madrid coincidan con los pedidos.
   */

  for (
    let iteration =
      0;
    iteration <
    3;
    iteration++
  ) {
    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Madrid",

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hourCycle:
            "h23",
        }
      ).formatToParts(
        utcDate
      );

    const values =
      Object.fromEntries(
        parts.map(
          (
            part
          ) => [
            part.type,
            part.value,
          ]
        )
      );

    const displayedAsUtc =
      Date.UTC(
        Number(
          values.year
        ),
        Number(
          values.month
        ) -
          1,
        Number(
          values.day
        ),
        Number(
          values.hour
        ),
        Number(
          values.minute
        ),
        Number(
          values.second
        )
      );

    const expectedAsUtc =
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );

    const difference =
      expectedAsUtc -
      displayedAsUtc;

    if (
      difference ===
      0
    ) {
      break;
    }

    utcDate =
      new Date(
        utcDate.getTime() +
          difference
      );
  }

  return utcDate;
}

/*
 * ============================================================
 * VALIDAR FECHA YYYY-MM-DD
 * ============================================================
 */

function isValidDateFilter(
  value:
    string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(
        Number
      );

  const parsed =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    parsed.getUTCFullYear() ===
      year &&
    parsed.getUTCMonth() ===
      month -
        1 &&
    parsed.getUTCDate() ===
      day
  );
}

/*
 * ============================================================
 * GET /api/businesses/[businessId]/available-slots
 * ============================================================
 *
 * Parámetros:
 *
 * page=1
 * pageSize=5 // días por página
 * serviceId=all | UUID
 * date=YYYY-MM-DD
 */

export async function GET(
  request:
    NextRequest,
  {
    params,
  }:
    Props
) {
  try {
    const {
      businessId,
    } =
      await params;

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

    const searchParams =
      request.nextUrl
        .searchParams;

    const requestedPage =
      Number(
        searchParams.get(
          "page"
        ) ??
          "1"
      );

    const requestedPageSize =
      Number(
        searchParams.get(
          "pageSize"
        ) ??
          DEFAULT_PAGE_SIZE
      );

    const serviceId =
      searchParams.get(
        "serviceId"
      )?.trim() ??
      "all";

    const date =
      searchParams.get(
        "date"
      )?.trim() ??
      "";

    /*
     * ==========================================================
     * VALIDACIÓN
     * ==========================================================
     */

    const page =
      Number.isInteger(
        requestedPage
      ) &&
      requestedPage >
        0
        ? requestedPage
        : 1;

    const pageSize =
      Number.isInteger(
        requestedPageSize
      )
        ? Math.min(
            Math.max(
              requestedPageSize,
              1
            ),
            MAX_PAGE_SIZE
          )
        : DEFAULT_PAGE_SIZE;

    if (
      date &&
      !isValidDateFilter(
        date
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha seleccionada no es válida.",
        },
        {
          status:
            400,
        }
      );
    }

    const supabase =
      await createClient();

    /*
     * ==========================================================
     * COMPROBAR NEGOCIO PÚBLICO Y ACTIVO
     * ==========================================================
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
          active
        `)
        .eq(
          "id",
          businessId
        )
        .eq(
          "active",
          true
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error checking public business for available slots:",
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
            "El negocio no existe o no está disponible.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ==========================================================
     * COMPROBAR SERVICIO
     * ==========================================================
     *
     * Evita que se pueda filtrar por un servicio ajeno,
     * inactivo o inexistente.
     */

    if (
      serviceId !==
      "all"
    ) {
      const {
        data:
          service,
        error:
          serviceError,
      } =
        await supabase
          .from(
            "services"
          )
          .select(`
            id
          `)
          .eq(
            "id",
            serviceId
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "active",
            true
          )
          .maybeSingle();

      if (
        serviceError
      ) {
        console.error(
          "Error checking available-slots service:",
          serviceError
        );

        return NextResponse.json(
          {
            error:
              "No se ha podido comprobar el servicio.",
          },
          {
            status:
              500,
          }
        );
      }

      if (
        !service
      ) {
        return NextResponse.json(
          {
            error:
              "El servicio seleccionado no está disponible.",
          },
          {
            status:
              404,
          }
        );
      }
    }

    /*
     * ==========================================================
     * PAGINACIÓN POR DÍAS
     * ==========================================================
     *
     * Se cargan las citas que cumplen los filtros, se agrupan
     * por fecha de Europe/Madrid y se paginan 5 fechas por página.
     * Así cada página muestra hasta 5 filas completas y nunca se
     * parte un mismo día entre dos páginas.
     */

    let query =
      supabase
        .from("slots")
        .select(`
          id,
          service_id,
          start_at,
          end_at,
          status
        `)
        .eq("business_id", businessId)
        .eq("status", "AVAILABLE")
        .gte(
          "start_at",
          new Date().toISOString()
        );

    if (serviceId !== "all") {
      query =
        query.eq(
          "service_id",
          serviceId
        );
    }

    if (date) {
      const startOfDay =
        madridDateTimeToUtc(
          date,
          0
        );

      const nextDate =
        new Date(
          `${date}T00:00:00.000Z`
        );

      nextDate.setUTCDate(
        nextDate.getUTCDate() +
          1
      );

      const endOfDay =
        madridDateTimeToUtc(
          nextDate
            .toISOString()
            .slice(0, 10),
          0
        );

      query =
        query
          .gte(
            "start_at",
            startOfDay.toISOString()
          )
          .lt(
            "start_at",
            endOfDay.toISOString()
          );
    }

    const {
      data: allSlots,
      error: slotsError,
    } =
      await query.order(
        "start_at",
        {
          ascending: true,
        }
      );

    if (slotsError) {
      console.error(
        "Error loading available slots:",
        slotsError
      );

      return NextResponse.json(
        {
          error:
            "No se han podido cargar las citas disponibles.",
        },
        {
          status: 500,
        }
      );
    }

    const normalizedSlots =
      allSlots ?? [];

    const madridDateFormatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Madrid",
          year:
            "numeric",
          month:
            "2-digit",
          day:
            "2-digit",
        }
      );

    const getMadridDateKey =
      (startAt: string) =>
        madridDateFormatter.format(
          new Date(startAt)
        );

    const uniqueDates =
      Array.from(
        new Set(
          normalizedSlots.map(
            (slot) =>
              getMadridDateKey(
                slot.start_at
              )
          )
        )
      );

    const total =
      normalizedSlots.length;

    const totalDays =
      uniqueDates.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalDays /
            pageSize
        )
      );

    const safePage =
      totalDays > 0
        ? Math.min(
            page,
            totalPages
          )
        : 1;

    const dayFrom =
      (safePage - 1) *
      pageSize;

    const dayTo =
      dayFrom +
      pageSize;

    const visibleDates =
      new Set(
        uniqueDates.slice(
          dayFrom,
          dayTo
        )
      );

    const visibleSlots =
      normalizedSlots.filter(
        (slot) =>
          visibleDates.has(
            getMadridDateKey(
              slot.start_at
            )
          )
      );

    return NextResponse.json(
      {
        slots:
          visibleSlots,

        pagination: {
          page:
            safePage,
          pageSize,
          total,
          totalPages,
          from:
            totalDays > 0
              ? dayFrom + 1
              : 0,
          to:
            Math.min(
              dayTo,
              totalDays
            ),
        },

        filters: {
          serviceId,
          date:
            date || null,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Unexpected available-slots API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al cargar las citas.",
      },
      {
        status:
          500,
      }
    );
  }
}