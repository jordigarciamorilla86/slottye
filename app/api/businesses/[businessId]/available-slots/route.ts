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
   * pageSize=10
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
       * RANGO DE PAGINACIÓN
       * ==========================================================
       */
  
      const from =
        (
          page -
          1
        ) *
        pageSize;
  
      const to =
        from +
        pageSize -
        1;
  
      /*
       * ==========================================================
       * CONSULTA BASE
       * ==========================================================
       */
  
      let query =
        supabase
          .from(
            "slots"
          )
          .select(
            `
              id,
              service_id,
              start_at,
              end_at,
              status
            `,
            {
              count:
                "exact",
            }
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "status",
            "AVAILABLE"
          )
          .gte(
            "start_at",
            new Date()
              .toISOString()
          );
  
      /*
       * ==========================================================
       * FILTRO POR SERVICIO
       * ==========================================================
       */
  
      if (
        serviceId !==
        "all"
      ) {
        query =
          query.eq(
            "service_id",
            serviceId
          );
      }
  
      /*
       * ==========================================================
       * FILTRO POR FECHA
       * ==========================================================
       *
       * Incluye desde las 00:00 del día seleccionado hasta las
       * 00:00 del día siguiente, usando Europe/Madrid.
       */
  
      if (
        date
      ) {
        const startOfDay =
          madridDateTimeToUtc(
            date,
            0
          );
  
        const nextDate =
          new Date(
            Date.UTC(
              Number(
                date.slice(
                  0,
                  4
                )
              ),
              Number(
                date.slice(
                  5,
                  7
                )
              ) -
                1,
              Number(
                date.slice(
                  8,
                  10
                )
              ) +
                1
            )
          );
  
        const nextDateString =
          [
            nextDate
              .getUTCFullYear()
              .toString()
              .padStart(
                4,
                "0"
              ),
  
            (
              nextDate.getUTCMonth() +
              1
            )
              .toString()
              .padStart(
                2,
                "0"
              ),
  
            nextDate
              .getUTCDate()
              .toString()
              .padStart(
                2,
                "0"
              ),
          ].join(
            "-"
          );
  
        const endOfDay =
          madridDateTimeToUtc(
            nextDateString,
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
  
      /*
       * ==========================================================
       * EJECUTAR CONSULTA PAGINADA
       * ==========================================================
       */
  
      const {
        data:
          slots,
        count,
        error:
          slotsError,
      } =
        await query
          .order(
            "start_at",
            {
              ascending:
                true,
            }
          )
          .range(
            from,
            to
          );
  
      if (
        slotsError
      ) {
        console.error(
          "Error loading paginated available slots:",
          slotsError
        );
  
        return NextResponse.json(
          {
            error:
              "No se han podido cargar las citas disponibles.",
          },
          {
            status:
              500,
          }
        );
      }
  
      /*
       * ==========================================================
       * DATOS DE PAGINACIÓN
       * ==========================================================
       */
  
      const total =
        count ??
        0;
  
      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total /
              pageSize
          )
        );
  
      /*
       * Si se solicita una página superior a las existentes,
       * devolvemos la última página válida en lugar de fallar.
       */
  
      if (
        total >
          0 &&
        page >
          totalPages
      ) {
        const safeFrom =
          (
            totalPages -
            1
          ) *
          pageSize;
  
        const safeTo =
          safeFrom +
          pageSize -
          1;
  
        let safeQuery =
          supabase
            .from(
              "slots"
            )
            .select(`
              id,
              service_id,
              start_at,
              end_at,
              status
            `)
            .eq(
              "business_id",
              businessId
            )
            .eq(
              "status",
              "AVAILABLE"
            )
            .gte(
              "start_at",
              new Date()
                .toISOString()
            );
  
        if (
          serviceId !==
          "all"
        ) {
          safeQuery =
            safeQuery.eq(
              "service_id",
              serviceId
            );
        }
  
        if (
          date
        ) {
          const startOfDay =
            madridDateTimeToUtc(
              date,
              0
            );
  
          const sourceDate =
            new Date(
              `${date}T00:00:00.000Z`
            );
  
          sourceDate.setUTCDate(
            sourceDate.getUTCDate() +
              1
          );
  
          const nextDateString =
            sourceDate
              .toISOString()
              .slice(
                0,
                10
              );
  
          const endOfDay =
            madridDateTimeToUtc(
              nextDateString,
              0
            );
  
          safeQuery =
            safeQuery
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
          data:
            safeSlots,
          error:
            safeSlotsError,
        } =
          await safeQuery
            .order(
              "start_at",
              {
                ascending:
                  true,
              }
            )
            .range(
              safeFrom,
              safeTo
            );
  
        if (
          safeSlotsError
        ) {
          console.error(
            "Error loading last available-slots page:",
            safeSlotsError
          );
  
          return NextResponse.json(
            {
              error:
                "No se han podido cargar las citas disponibles.",
            },
            {
              status:
                500,
            }
          );
        }
  
        return NextResponse.json(
          {
            slots:
              safeSlots ??
              [],
  
            pagination: {
              page:
                totalPages,
  
              pageSize,
  
              total,
  
              totalPages,
  
              from:
                total >
                0
                  ? safeFrom +
                    1
                  : 0,
  
              to:
                Math.min(
                  safeFrom +
                    pageSize,
                  total
                ),
            },
  
            filters: {
              serviceId,
              date:
                date ||
                null,
            },
          },
          {
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }
  
      return NextResponse.json(
        {
          slots:
            slots ??
            [],
  
          pagination: {
            page,
  
            pageSize,
  
            total,
  
            totalPages,
  
            from:
              total >
              0
                ? from +
                  1
                : 0,
  
            to:
              Math.min(
                from +
                  pageSize,
                total
              ),
          },
  
          filters: {
            serviceId,
  
            date:
              date ||
              null,
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