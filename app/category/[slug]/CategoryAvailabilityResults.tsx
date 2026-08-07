import Link from "next/link";

import {
  createClient,
} from "@/lib/supabase/server";

import AvailabilityLocationFilters from "./AvailabilityLocationFilters";

type Props = {
  categoryId:
    string;

  categorySlug:
    string;

  categoryName:
    string;

  when?:
    string;

  selectedDate?:
    string;

  requestedPage?:
    string;

  sort?:
    string;

  latitude?:
    string;

  longitude?:
    string;

  maxDistance?:
    string;
};

type Slot = {
  id: string;
  start_at: string;
  end_at: string;

  services:
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }[]
    | null;

  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
        latitude: number | null;
        longitude: number | null;

        business_images:
          | {
              image_url: string;
              position: number | null;
            }[]
          | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
        latitude: number | null;
        longitude: number | null;

        business_images:
          | {
              image_url: string;
              position: number | null;
            }[]
          | null;
      }[]
    | null;
};

type DistanceRow = {
  slot_id: string;
  start_at: string;
  end_at: string;

  service_id: string;
  service_name: string;
  duration_minutes: number;

  business_id: string;
  business_name: string;
  business_slug: string;
  business_address: string | null;
  business_city: string | null;
  business_latitude: number | null;
  business_longitude: number | null;

  image_url: string | null;

  distance_km: number | null;

  total_count: number | string | null;
};

const PAGE_SIZE =
  12;

const TIME_ZONE =
  "Europe/Madrid";

/*
 * ============================================================
 * RELACIONES SUPABASE
 * ============================================================
 */

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value[0] ??
      null;
  }

  return value ??
    null;
}

/*
 * ============================================================
 * FECHAS EUROPE/MADRID
 * ============================================================
 */

function getMadridParts(
  date:
    Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  function get(
    type:
      Intl.DateTimeFormatPartTypes
  ) {
    return Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          type
      )?.value ??
        0
    );
  }

  return {
    year:
      get("year"),

    month:
      get("month"),

    day:
      get("day"),
  };
}

function getOffset(
  date:
    Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          TIME_ZONE,

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
      date
    );

  function get(
    type:
      Intl.DateTimeFormatPartTypes
  ) {
    return Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          type
      )?.value ??
        0
    );
  }

  const asUtc =
    Date.UTC(
      get("year"),
      get("month") -
        1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );

  return (
    asUtc -
    date.getTime()
  );
}

function localMadridToUtc(
  date: {
    year: number;
    month: number;
    day: number;
  }
) {
  const guess =
    new Date(
      Date.UTC(
        date.year,
        date.month -
          1,
        date.day
      )
    );

  let offset =
    getOffset(
      guess
    );

  let result =
    new Date(
      guess.getTime() -
        offset
    );

  const correctedOffset =
    getOffset(
      result
    );

  if (
    correctedOffset !==
    offset
  ) {
    offset =
      correctedOffset;

    result =
      new Date(
        guess.getTime() -
          offset
      );
  }

  return result;
}

function addDays(
  date: {
    year: number;
    month: number;
    day: number;
  },
  days:
    number
) {
  const result =
    new Date(
      Date.UTC(
        date.year,
        date.month -
          1,
        date.day +
          days
      )
    );

  return {
    year:
      result.getUTCFullYear(),

    month:
      result.getUTCMonth() +
      1,

    day:
      result.getUTCDate(),
  };
}

/*
 * ============================================================
 * RANGO TEMPORAL
 * ============================================================
 */

function getRange(
  when:
    string,
  selectedDate:
    string
) {
  const now =
    new Date();

  /*
   * Lo antes posible.
   */

  if (
    when ===
    "asap"
  ) {
    return {
      from:
        now,

      to:
        null,
    };
  }

  const today =
    getMadridParts(
      now
    );

  /*
   * Hoy.
   */

  if (
    when ===
    "today"
  ) {
    return {
      from:
        now,

      to:
        localMadridToUtc(
          addDays(
            today,
            1
          )
        ),
    };
  }

  /*
   * Mañana.
   */

  if (
    when ===
    "tomorrow"
  ) {
    const tomorrow =
      addDays(
        today,
        1
      );

    return {
      from:
        localMadridToUtc(
          tomorrow
        ),

      to:
        localMadridToUtc(
          addDays(
            tomorrow,
            1
          )
        ),
    };
  }

  /*
   * Esta semana.
   */

  if (
    when ===
    "week"
  ) {
    return {
      from:
        now,

      to:
        localMadridToUtc(
          addDays(
            today,
            7
          )
        ),
    };
  }

  /*
   * Fecha concreta.
   */

  if (
    when ===
      "date" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      selectedDate
    )
  ) {
    const [
      year,
      month,
      day,
    ] =
      selectedDate
        .split("-")
        .map(
          Number
        );

    const selected =
      {
        year,
        month,
        day,
      };

    const start =
      localMadridToUtc(
        selected
      );

    const end =
      localMadridToUtc(
        addDays(
          selected,
          1
        )
      );

    return {
      from:
        start <
        now
          ? now
          : start,

      to:
        end,
    };
  }

  /*
   * Fallback.
   */

  return {
    from:
      now,

    to:
      null,
  };
}

/*
 * ============================================================
 * FORMATO
 * ============================================================
 */

function formatDate(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday:
        "long",

      day:
        "numeric",

      month:
        "long",

      timeZone:
        TIME_ZONE,
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatTime(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      timeZone:
        TIME_ZONE,
    }
  ).format(
    new Date(
      value
    )
  );
}

function getWhenLabel(
  when:
    string,
  selectedDate:
    string
) {
  if (
    when ===
    "today"
  ) {
    return "Hoy";
  }

  if (
    when ===
    "tomorrow"
  ) {
    return "Mañana";
  }

  if (
    when ===
    "week"
  ) {
    return "Esta semana";
  }

  if (
    when ===
      "date" &&
    selectedDate
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      new Date(
        `${selectedDate}T12:00:00`
      )
    );
  }

  return "Lo antes posible";
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default async function CategoryAvailabilityResults({
  categoryId,
  categorySlug,
  categoryName,

  when:
    rawWhen,

  selectedDate:
    rawSelectedDate,

  requestedPage,

  sort:
    rawSort,

  latitude:
    rawLatitude,

  longitude:
    rawLongitude,

  maxDistance:
    rawMaxDistance,
}: Props) {
  /*
   * ============================================================
   * PARÁMETROS
   * ============================================================
   */

  const when =
    [
      "asap",
      "today",
      "tomorrow",
      "week",
      "date",
    ].includes(
      rawWhen ??
        ""
    )
      ? rawWhen!
      : "asap";

  const selectedDate =
    rawSelectedDate ??
    "";

  const sortMode =
    rawSort ===
      "distance"
      ? "distance"
      : "time";

  /*
   * ============================================================
   * UBICACIÓN
   * ============================================================
   */

  const parsedLatitude =
    rawLatitude
      ? Number(
          rawLatitude
        )
      : null;

  const parsedLongitude =
    rawLongitude
      ? Number(
          rawLongitude
        )
      : null;

  const parsedMaxDistance =
    rawMaxDistance
      ? Number(
          rawMaxDistance
        )
      : null;

  const validLocation =
    parsedLatitude !==
      null &&
    parsedLongitude !==
      null &&
    Number.isFinite(
      parsedLatitude
    ) &&
    Number.isFinite(
      parsedLongitude
    ) &&
    parsedLatitude >=
      -90 &&
    parsedLatitude <=
      90 &&
    parsedLongitude >=
      -180 &&
    parsedLongitude <=
      180;

  const latitude =
    validLocation
      ? parsedLatitude
      : null;

  const longitude =
    validLocation
      ? parsedLongitude
      : null;

  const maxDistance =
    parsedMaxDistance !==
      null &&
    Number.isFinite(
      parsedMaxDistance
    ) &&
    parsedMaxDistance >
      0
      ? parsedMaxDistance
      : null;

  /*
   * Si alguien modifica manualmente la URL y pide
   * orden por distancia sin unas coordenadas válidas,
   * volvemos de forma segura al orden cronológico.
   */

  const effectiveSortMode =
    sortMode ===
      "distance" &&
    validLocation
      ? "distance"
      : "time";

  /*
   * ============================================================
   * PÁGINA
   * ============================================================
   */

  const parsedPage =
    Number.parseInt(
      requestedPage ??
        "1",
      10
    );

  const currentPage =
    Number.isFinite(
      parsedPage
    ) &&
    parsedPage >
      0
      ? parsedPage
      : 1;

  /*
   * ============================================================
   * RANGO TEMPORAL
   * ============================================================
   */

  const range =
    getRange(
      when,
      selectedDate
    );

  /*
   * ============================================================
   * PAGINACIÓN
   * ============================================================
   */

  const from =
    (
      currentPage -
      1
    ) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  /*
   * ============================================================
   * SUPABASE
   * ============================================================
   */

  const supabase =
    await createClient();

  let slots:
    Slot[] =
    [];

  let total =
    0;

  let loadError:
    string | null =
    null;

  /*
   * La distancia se conserva aparte para no alterar
   * el modelo Slot que también utiliza la consulta normal.
   */

  const distanceBySlot =
    new Map<
      string,
      number
    >();

  /*
   * ============================================================
   * MODO DISTANCIA
   * ============================================================
   *
   * La RPC:
   *
   * - calcula distancia sobre todo el conjunto;
   * - aplica radio máximo;
   * - ordena;
   * - pagina después.
   *
   * No ordenamos únicamente los 12 elementos de la página.
   */

  if (
    effectiveSortMode ===
      "distance" &&
    latitude !==
      null &&
    longitude !==
      null
  ) {
    const {
      data:
        distanceData,
      error:
        distanceError,
    } =
      await supabase.rpc(
        "search_available_slots_by_distance",
        {
          p_category_id:
            categoryId,

          p_from:
            range.from
              .toISOString(),

          p_to:
            range.to
              ?.toISOString() ??
            null,

          p_latitude:
            latitude,

          p_longitude:
            longitude,

          p_max_distance_km:
            maxDistance,

          p_page:
            currentPage,

          p_page_size:
            PAGE_SIZE,
        }
      );

    if (
      distanceError
    ) {
      console.error(
        "Error loading category availability by distance:",
        distanceError
      );

      loadError =
        distanceError.message;
    } else {
      const rows =
        (
          distanceData ??
          []
        ) as unknown as
          DistanceRow[];

      total =
        rows.length >
          0
          ? Number(
              rows[0]
                .total_count ??
                0
            )
          : 0;

      slots =
        rows.map(
          (
            row
          ) => {
            const distance =
              row.distance_km !==
                null &&
              Number.isFinite(
                Number(
                  row.distance_km
                )
              )
                ? Number(
                    row.distance_km
                  )
                : null;

            if (
              distance !==
              null
            ) {
              distanceBySlot.set(
                row.slot_id,
                distance
              );
            }

            return {
              id:
                row.slot_id,

              start_at:
                row.start_at,

              end_at:
                row.end_at,

              services: {
                id:
                  row.service_id,

                name:
                  row.service_name,

                duration_minutes:
                  row.duration_minutes,
              },

              businesses: {
                id:
                  row.business_id,

                name:
                  row.business_name,

                slug:
                  row.business_slug,

                address:
                  row.business_address,

                city:
                  row.business_city,

                latitude:
                  row.business_latitude,

                longitude:
                  row.business_longitude,

                business_images:
                  row.image_url
                    ? [
                        {
                          image_url:
                            row.image_url,

                          position:
                            0,
                        },
                      ]
                    : [],
              },
            } satisfies Slot;
          }
        );
    }
  } else {
    /*
     * ============================================================
     * MODO PRÓXIMA CITA
     * ============================================================
     *
     * Conservamos la consulta que ya teníamos funcionando.
     */

    let query =
      supabase
        .from(
          "slots"
        )
        .select(
          `
            id,
            start_at,
            end_at,

            services!inner (
              id,
              name,
              duration_minutes
            ),

            businesses!inner (
              id,
              name,
              slug,
              address,
              city,
              latitude,
              longitude,

              business_images (
                image_url,
                position
              )
            )
          `,
          {
            count:
              "exact",
          }
        )
        .eq(
          "status",
          "AVAILABLE"
        )
        .gte(
          "start_at",
          range.from
            .toISOString()
        )
        .eq(
          "services.active",
          true
        )
        .eq(
          "businesses.active",
          true
        )
        .eq(
          "businesses.category_id",
          categoryId
        )
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
      range.to
    ) {
      query =
        query.lt(
          "start_at",
          range.to
            .toISOString()
        );
    }

    const {
      data,
      error,
      count,
    } =
      await query;

    if (
      error
    ) {
      console.error(
        "Error loading category availability:",
        error
      );

      loadError =
        error.message;
    } else {
      slots =
        (
          data ??
          []
        ) as unknown as
          Slot[];

      total =
        count ??
        0;
    }
  }

  /*
   * ============================================================
   * TOTAL DE PÁGINAS
   * ============================================================
   */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
          PAGE_SIZE
      )
    );

  /*
   * ============================================================
   * URL DE PAGINACIÓN
   * ============================================================
   */

  function pageHref(
    page:
      number
  ) {
    const search =
      new URLSearchParams();

    search.set(
      "mode",
      "availability"
    );

    search.set(
      "when",
      when
    );

    /*
     * Fecha concreta.
     */

    if (
      when ===
        "date" &&
      selectedDate
    ) {
      search.set(
        "date",
        selectedDate
      );
    }

    /*
     * Conservamos la ubicación aunque el usuario
     * esté ordenando temporalmente por hora.
     */

    if (
      validLocation &&
      latitude !==
        null &&
      longitude !==
        null
    ) {
      search.set(
        "lat",
        String(
          latitude
        )
      );

      search.set(
        "lng",
        String(
          longitude
        )
      );

      if (
        maxDistance !==
        null
      ) {
        search.set(
          "distance",
          String(
            maxDistance
          )
        );
      }
    }

    /*
     * Solo necesitamos sort=distance.
     * "time" es el comportamiento por defecto.
     */

    if (
      effectiveSortMode ===
      "distance"
    ) {
      search.set(
        "sort",
        "distance"
      );
    }

    search.set(
      "page",
      String(
        page
      )
    );

    return `/category/${categorySlug}?${search.toString()}`;
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (
    loadError
  ) {
    return (
      <>
        <AvailabilityLocationFilters
          categorySlug={
            categorySlug
          }
        />

        <div className="panel">
          <h3>
            No se han podido cargar las citas
          </h3>

          <p className="muted">
            Inténtalo de nuevo dentro de unos momentos.
          </p>
        </div>
      </>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      {/* ========================================================
          UBICACIÓN + ORDEN + DISTANCIA
          ======================================================== */}

      <AvailabilityLocationFilters
        categorySlug={
          categorySlug
        }
      />

      {/* ========================================================
          RESUMEN
          ======================================================== */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            12,

          flexWrap:
            "wrap",

          marginBottom:
            18,
        }}
      >
        <div>
          <strong>
            {total}{" "}
            {total ===
            1
              ? "cita disponible"
              : "citas disponibles"}
          </strong>

          <div
            className="muted"
            style={{
              marginTop:
                4,

              fontSize:
                14,
            }}
          >
            {getWhenLabel(
              when,
              selectedDate
            )}

            {" · "}

            {effectiveSortMode ===
            "distance"
              ? "Ordenadas por distancia"
              : "Ordenadas por la cita más próxima"}

            {effectiveSortMode ===
              "distance" &&
              maxDistance !==
                null && (
                <>
                  {" · "}
                  Hasta{" "}
                  {maxDistance} km
                </>
              )}
          </div>
        </div>
      </div>

      {/* ========================================================
          SIN RESULTADOS
          ======================================================== */}

      {slots.length ===
      0 ? (
        <div className="panel">
          <h3>
            No hay citas disponibles
          </h3>

          <p className="muted">
            {effectiveSortMode ===
              "distance" &&
            maxDistance !==
              null
              ? `No hemos encontrado citas de ${categoryName} a menos de ${maxDistance} km para el periodo seleccionado.`
              : `No hemos encontrado citas de ${categoryName} para el periodo seleccionado.`}
          </p>
        </div>
      ) : (
        /* ======================================================
           RESULTADOS
           ====================================================== */

        <div
          style={{
            display:
              "grid",

            gap:
              14,
          }}
        >
          {slots.map(
            (
              slot,
              index
            ) => {
              const service =
                firstRelation(
                  slot.services
                );

              const business =
                firstRelation(
                  slot.businesses
                );

              if (
                !service ||
                !business
              ) {
                return null;
              }

              /*
               * Imagen principal.
               */

              const images =
                Array.isArray(
                  business.business_images
                )
                  ? [
                      ...business.business_images,
                    ].sort(
                      (
                        first,
                        second
                      ) =>
                        (
                          first.position ??
                          0
                        ) -
                        (
                          second.position ??
                          0
                        )
                    )
                  : [];

              const image =
                images[0]
                  ?.image_url ??
                null;

              /*
               * Distancia.
               */

              const distanceKm =
                distanceBySlot.get(
                  slot.id
                ) ??
                null;

              /*
               * Primera tarjeta destacada.
               */

              const firstResult =
                currentPage ===
                  1 &&
                index ===
                  0;

              return (
                <article
                  key={
                    slot.id
                  }
                  className="card"
                  style={{
                    borderColor:
                      firstResult
                        ? "#c4b5fd"
                        : undefined,

                    background:
                      firstResult
                        ? "linear-gradient(135deg, #f5f3ff 0%, #ffffff 70%)"
                        : undefined,
                  }}
                >
                  <div
                    className="card-body"
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        image
                          ? "110px minmax(0, 1fr) auto"
                          : "minmax(0, 1fr) auto",

                      gap:
                        18,

                      alignItems:
                        "center",
                    }}
                  >
                    {/* ==========================================
                        IMAGEN
                        ========================================== */}

                    {image && (
                      <img
                        src={
                          image
                        }
                        alt=""
                        style={{
                          width:
                            110,

                          height:
                            90,

                          objectFit:
                            "cover",

                          borderRadius:
                            14,
                        }}
                      />
                    )}

                    {/* ==========================================
                        INFORMACIÓN
                        ========================================== */}

                    <div>
                      {firstResult && (
                        <div
                          className="kicker"
                          style={{
                            marginBottom:
                              7,
                          }}
                        >
                          {effectiveSortMode ===
                          "distance"
                            ? "📍 Más cercana"
                            : "⚡ Primera disponible"}
                        </div>
                      )}

                      <h3
                        style={{
                          margin:
                            "0 0 5px",
                        }}
                      >
                        {service.name}
                      </h3>

                      <strong>
                        {business.name}
                      </strong>

                      {(business.address ||
                        business.city) && (
                        <div
                          className="meta"
                          style={{
                            marginTop:
                              8,
                          }}
                        >
                          📍{" "}
                          {[
                            business.address,
                            business.city,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              " · "
                            )}
                        </div>
                      )}

                      {/* ========================================
                          DISTANCIA
                          ======================================== */}

                      {distanceKm !==
                        null && (
                        <div
                          className="meta"
                          style={{
                            marginTop:
                              6,

                            fontWeight:
                              700,
                          }}
                        >
                          📏{" "}
                          {distanceKm <
                          10
                            ? distanceKm.toFixed(
                                1
                              )
                            : distanceKm.toFixed(
                                0
                              )}{" "}
                          km
                        </div>
                      )}

                      {/* ========================================
                          FECHA / HORA / DURACIÓN
                          ======================================== */}

                      <div
                        style={{
                          display:
                            "flex",

                          gap:
                            14,

                          flexWrap:
                            "wrap",

                          marginTop:
                            12,
                        }}
                      >
                        <span>
                          📅{" "}
                          <strong>
                            {formatDate(
                              slot.start_at
                            )}
                          </strong>
                        </span>

                        <span>
                          🕐{" "}
                          <strong>
                            {formatTime(
                              slot.start_at
                            )}
                          </strong>
                        </span>

                        <span className="muted">
                          {
                            service.duration_minutes
                          }{" "}
                          min
                        </span>
                      </div>
                    </div>

                    {/* ==========================================
                        ACCIONES
                        ========================================== */}

                    <div
                      style={{
                        display:
                          "grid",

                        gap:
                          8,

                        minWidth:
                          135,
                      }}
                    >
                      <Link
                        href={`/business/${business.slug}?slot=${encodeURIComponent(
                          slot.id
                        )}`}
                        className="btn primary"
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        Reservar esta cita
                      </Link>

                      <Link
                        href={`/business/${business.slug}`}
                        className="btn"
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        Ver negocio
                      </Link>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {/* ========================================================
          PAGINACIÓN
          ======================================================== */}

      {totalPages >
        1 && (
        <nav
          aria-label="Paginación de citas"
          style={{
            display:
              "flex",

            justifyContent:
              "center",

            alignItems:
              "center",

            gap:
              10,

            flexWrap:
              "wrap",

            marginTop:
              28,
          }}
        >
          {currentPage >
            1 && (
            <Link
              href={pageHref(
                currentPage -
                  1
              )}
              className="btn"
            >
              ← Anterior
            </Link>
          )}

          <span className="muted">
            Página{" "}
            <strong>
              {currentPage}
            </strong>{" "}
            de{" "}
            <strong>
              {totalPages}
            </strong>
          </span>

          {currentPage <
            totalPages && (
            <Link
              href={pageHref(
                currentPage +
                  1
              )}
              className="btn"
            >
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}