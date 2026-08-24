import Link from "next/link";
import CategorySearchControls from "./CategorySearchControls";

import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Phone,
  Sparkles,
  Star,
} from "lucide-react";

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

  searchCategories: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  }[];

  initialQuery:
    string;

  initialCategorySlug:
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


type BusinessMeta = {
  id: string;
  description: string | null;
  phone: string | null;

  reviews:
    | {
        rating: number;
      }[]
    | null;
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

  searchCategories,

  initialQuery,

  initialCategorySlug,
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
   * DATOS DEL NEGOCIO PARA LAS TARJETAS
   * ============================================================
   */

  const businessIds =
    Array.from(
      new Set(
        slots
          .map(
            (
              slot
            ) =>
              firstRelation(
                slot.businesses
              )?.id ??
              null
          )
          .filter(
            (
              value
            ): value is string =>
              !!value
          )
      )
    );

  const businessMetaById =
    new Map<
      string,
      {
        description: string;
        phone: string;
        averageRating: number | null;
        reviewCount: number;
      }
    >();

  if (
    businessIds.length >
    0
  ) {
    const {
      data:
        businessMetaData,
      error:
        businessMetaError,
    } =
      await supabase
        .from(
          "businesses"
        )
        .select(`
          id,
          description,
          phone,
          reviews (
            rating
          )
        `)
        .in(
          "id",
          businessIds
        );

    if (
      businessMetaError
    ) {
      console.error(
        "Error loading business metadata for availability cards:",
        businessMetaError
      );
    } else {
      (
        (
          businessMetaData ??
          []
        ) as unknown as
          BusinessMeta[]
      ).forEach(
        (
          business
        ) => {
          const reviews =
            Array.isArray(
              business.reviews
            )
              ? business.reviews
              : [];

          const reviewCount =
            reviews.length;

          const averageRating =
            reviewCount >
            0
              ? reviews.reduce(
                  (
                    total,
                    review
                  ) =>
                    total +
                    Number(
                      review.rating
                    ),
                  0
                ) /
                reviewCount
              : null;

          businessMetaById.set(
            business.id,
            {
              description:
                business.description ??
                "",

              phone:
                business.phone ??
                "",

              averageRating,

              reviewCount,
            }
          );
        }
      );
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
      <div className="availability13">
        <section className="availability13-tools">
          <div className="availability13-search">
            <CategorySearchControls
              categories={
                searchCategories
              }
              categorySlug={
                categorySlug
              }
              initialQuery={
                initialQuery
              }
              initialCategorySlug={
                initialCategorySlug
              }
              initialMode="availability"
              initialWhen={
                when
              }
              initialSelectedDate={
                selectedDate ??
                ""
              }
            />
          </div>

          <AvailabilityLocationFilters
            categorySlug={
              categorySlug
            }
          />
        </section>

        <div className="panel availability13-state">
          <h3>
            No se han podido cargar las citas
          </h3>

          <p className="muted">
            Inténtalo de nuevo dentro de unos momentos.
          </p>
        </div>

        <style>{`
        .availability13-tools {
          display: grid;
          grid-template-columns:
            minmax(0, 1.55fr)
            minmax(330px, .85fr);
          gap: 18px;
          padding: 15px 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 12px 34px
            rgba(31,27,48,.03);
        }

        .availability13-search {
          min-width: 0;
        }

        .availability13-meta {
          display: grid;
          gap: 2px;
          margin: 16px 2px 9px;
        }

        .availability13-meta strong {
          font-size: 13px;
        }

        .availability13-meta span {
          color: var(--muted);
          font-size: 10.5px;
        }

        .availability13-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
          gap: 16px;
        }

        .availability14-card {
          display: grid;
          grid-template-rows:
            132px
            minmax(0,1fr);
          overflow: hidden;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          color: var(--text);
          box-shadow:
            0 10px 28px
            rgba(31,27,48,.025);
          transition:
            transform .16s ease,
            box-shadow .16s ease,
            border-color .16s ease;
        }

        .availability14-card:hover {
          transform: translateY(-1px);
          border-color: #d9d3ea;
          box-shadow:
            0 14px 34px
            rgba(31,27,48,.055);
        }

        .availability14-card.is-first {
          border-color: #c9bfff;
        }

        .availability14-media {
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 11px;
          box-sizing: border-box;
          background:
            radial-gradient(
              circle at 70% 20%,
              rgba(87,200,139,.18),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #f0ecff,
              #f7f6fb
            );
          background-position: center;
          background-size: cover;
        }

        .availability14-media.has-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.02),
              rgba(0,0,0,.06)
            );
          pointer-events: none;
        }

        .availability14-distance-badge,
        .availability14-first-badge {
          position: absolute;
          z-index: 2;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255,255,255,.94);
          box-shadow:
            0 4px 12px
            rgba(31,27,48,.08);
          font-size: 11px;
          font-weight: 800;
        }

        .availability14-distance-badge {
          top: 11px;
          left: 11px;
        }

        .availability14-first-badge {
          top: 11px;
          right: 11px;
          color: var(--accent-dark);
        }

        .availability14-placeholder {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: rgba(255,255,255,.72);
          color: #9d8df2;
          font-size: 28px;
          font-weight: 850;
        }

        .availability14-main {
          display: grid;
          grid-template-columns:
            minmax(0,1fr)
            155px;
          min-height: 0;
          padding: 15px 16px;
        }

        .availability14-copy {
          min-width: 0;
          padding-right: 15px;
        }

        .availability14-copy h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.25;
          letter-spacing: -.015em;
        }

        .availability14-service {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }

        .availability14-rating,
        .availability14-no-reviews {
          margin-top: 7px;
          font-size: 12px;
        }

        .availability14-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #e49a00;
        }

        .availability14-rating span {
          color: var(--muted);
        }

        .availability14-no-reviews {
          display: block;
          color: var(--muted);
        }

        .availability14-meta {
          display: grid;
          gap: 7px;
          margin-top: 9px;
        }

        .availability14-meta > div {
          display: grid;
          grid-template-columns:
            17px
            minmax(0,1fr);
          align-items: center;
          gap: 7px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }

        .availability14-meta svg {
          color: var(--accent);
        }

        .availability14-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          padding-left: 15px;
          border-left: 1px solid #ececf1;
          text-align: center;
        }

        .availability14-slot-label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
        }

        .availability14-day {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.25;
        }

        .availability14-time {
          margin-top: 3px;
          font-size: 24px;
          font-weight: 850;
          line-height: 1;
        }

        .availability14-reserve {
          width: 100%;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
          padding: 0 10px;
          box-sizing: border-box;
          border-radius: 10px;
          background: var(--accent);
          color: #fff;
          font-size: 10px;
          font-weight: 850;
          text-decoration: none;
          box-shadow:
            0 7px 16px
            rgba(112,87,245,.14);
        }

        .availability14-business-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 8px;
          color: var(--accent-dark);
          font-size: 10px;
          font-weight: 850;
          text-decoration: none;
        }

        .availability14-business-link:hover {
          text-decoration: underline;
        }

        .availability13-state {
          display: grid;
          place-items: center;
          min-height: 220px;
          margin-top: 16px;
          padding: 26px;
          text-align: center;
        }

        .availability13-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 20px;
        }

        .availability13-pagination > span:not(.btn) {
          color: var(--muted);
          font-size: 10px;
        }

        .availability13-disabled {
          opacity: .4;
          pointer-events: none;
        }

        @media (max-width: 1100px) {
          .availability13-grid {
            grid-template-columns:
              minmax(0,1fr);
          }
        }

        @media (max-width: 980px) {
          .availability13-tools {
            grid-template-columns:
              minmax(0,1fr);
          }
        }

        @media (max-width: 620px) {
          .availability14-card {
            grid-template-rows:
              160px
              auto;
          }

          .availability14-main {
            grid-template-columns:
              minmax(0,1fr);
            padding: 16px;
          }

          .availability14-copy {
            padding-right: 0;
          }

          .availability14-copy h3 {
            font-size: 19px;
          }

          .availability14-slot {
            align-items: flex-start;
            margin-top: 13px;
            padding: 12px 0 0;
            border-top: 1px solid #ececf1;
            border-left: 0;
            text-align: left;
          }

          .availability14-reserve {
            max-width: 180px;
          }
        }
      `}</style>
      </div>
    );
  }

  return (
    <div className="availability13">
      <section className="availability13-tools">
        <div className="availability13-search">
          <CategorySearchControls
            categories={
              searchCategories
            }
            categorySlug={
              categorySlug
            }
            initialQuery={
              initialQuery
            }
            initialCategorySlug={
              initialCategorySlug
            }
            initialMode="availability"
            initialWhen={
              when
            }
            initialSelectedDate={
              selectedDate
            }
          />
        </div>

        <AvailabilityLocationFilters
          categorySlug={
            categorySlug
          }
        />
      </section>

      <div className="availability13-meta">
        <strong>
          {total}{" "}
          {total ===
          1
            ? "cita disponible"
            : "citas disponibles"}
        </strong>

        <span>
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
        </span>
      </div>

      {slots.length ===
      0 ? (
        <div className="panel availability13-state">
          <CalendarDays
            size={24}
            strokeWidth={2}
            aria-hidden="true"
          />

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
        <div className="availability13-grid">
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

              const distanceKm =
                distanceBySlot.get(
                  slot.id
                ) ??
                null;

              const firstResult =
                currentPage ===
                  1 &&
                index ===
                  0;

              const meta =
                businessMetaById.get(
                  business.id
                );

              const fullAddress =
                [
                  business.address,
                  business.city,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " · "
                  );

              const hasReviews =
                meta?.averageRating !==
                  null &&
                meta?.averageRating !==
                  undefined &&
                (
                  meta?.reviewCount ??
                  0
                ) >
                  0;

              return (
                <article
                  key={
                    slot.id
                  }
                  className={
                    firstResult
                      ? "availability14-card is-first"
                      : "availability14-card"
                  }
                >
                  <div
                    className={
                      image
                        ? "availability14-media has-image"
                        : "availability14-media"
                    }
                    style={
                      image
                        ? {
                            backgroundImage:
                              `url(${image})`,
                          }
                        : undefined
                    }
                  >
                    <span className="availability14-distance-badge">
                      <MapPin
                        size={14}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />

                      {distanceKm !==
                      null
                        ? `${
                            distanceKm <
                            10
                              ? distanceKm.toFixed(
                                  1
                                )
                              : distanceKm.toFixed(
                                  0
                                )
                          } km`
                        : "Ver ubicación"}
                    </span>

                    {firstResult && (
                      <span className="availability14-first-badge">
                        <Sparkles
                          size={13}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />

                        {effectiveSortMode ===
                        "distance"
                          ? "Más cercana"
                          : "Primera disponible"}
                      </span>
                    )}

                    {!image && (
                      <span className="availability14-placeholder">
                        {business.name
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="availability14-main">
                    <div className="availability14-copy">
                      <h3>
                        {business.name}
                      </h3>

                      <p className="availability14-service">
                        {service.name}
                        {" · "}
                        {
                          service.duration_minutes
                        }{" "}
                        min
                      </p>

                      {hasReviews ? (
                        <div className="availability14-rating">
                          <Star
                            size={15}
                            fill="currentColor"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />

                          <strong>
                            {meta!.averageRating!.toFixed(
                              1
                            )}
                          </strong>

                          <span>
                            (
                            {
                              meta!.reviewCount
                            }{" "}
                            {meta!.reviewCount ===
                            1
                              ? "opinión"
                              : "opiniones"}
                            )
                          </span>
                        </div>
                      ) : (
                        <span className="availability14-no-reviews">
                          Sin opiniones todavía
                        </span>
                      )}

                      <div className="availability14-meta">
                        {fullAddress && (
                          <div>
                            <MapPin
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            <span>
                              {fullAddress}
                            </span>
                          </div>
                        )}

                        {meta?.phone && (
                          <div>
                            <Phone
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            <span>
                              {
                                meta.phone
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="availability14-slot">
                      <span className="availability14-slot-label">
                        Cita disponible
                      </span>

                      <strong className="availability14-day">
                        {formatDate(
                          slot.start_at
                        )}
                      </strong>

                      <span className="availability14-time">
                        {formatTime(
                          slot.start_at
                        )}
                      </span>

                      <Link
                        href={`/business/${business.slug}?slot=${encodeURIComponent(
                          slot.id
                        )}`}
                        className="availability14-reserve"
                      >
                        Reservar cita
                      </Link>

                      <Link
                        href={`/business/${business.slug}`}
                        className="availability14-business-link"
                      >
                        Ver negocio

                        <ArrowRight
                          size={14}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {totalPages >
        1 && (
        <nav
          className="availability13-pagination"
          aria-label="Paginación de citas"
        >
          {currentPage >
            1 ? (
            <Link
              href={pageHref(
                currentPage -
                  1
              )}
              className="btn"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="btn availability13-disabled">
              ← Anterior
            </span>
          )}

          <span>
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
            totalPages ? (
            <Link
              href={pageHref(
                currentPage +
                  1
              )}
              className="btn"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="btn availability13-disabled">
              Siguiente →
            </span>
          )}
        </nav>
      )}

      <style>{`
        .availability14-card {
          display: grid;
          grid-template-rows: 170px minmax(0, 1fr);
          overflow: hidden;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          color: var(--text);
          box-shadow: 0 10px 28px rgba(31, 27, 48, .035);
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }

        .availability14-card:hover {
          transform: translateY(-2px);
          border-color: #d9d3ea;
          box-shadow: 0 16px 38px rgba(31, 27, 48, .07);
        }

        .availability14-card.is-first {
          border-color: #c9bfff;
        }

        .availability14-media {
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 12px;
          box-sizing: border-box;
          background: radial-gradient(circle at 70% 20%, rgba(87, 200, 139, .18), transparent 30%), linear-gradient(135deg, #f0ecff, #f7f6fb);
          background-position: center;
          background-size: cover;
        }

        .availability14-media.has-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, .01), rgba(0, 0, 0, .1));
          pointer-events: none;
        }

        .availability14-distance-badge,
        .availability14-first-badge {
          position: absolute;
          z-index: 2;
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .95);
          box-shadow: 0 4px 14px rgba(31, 27, 48, .1);
          font-size: 12px;
          font-weight: 800;
        }

        .availability14-distance-badge { top: 12px; left: 12px; }
        .availability14-first-badge { top: 12px; right: 12px; color: var(--accent-dark); }

        .availability14-placeholder {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: rgba(255, 255, 255, .75);
          color: #9d8df2;
          font-size: 30px;
          font-weight: 850;
        }

        .availability14-main {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px;
          min-height: 190px;
          padding: 18px;
        }

        .availability14-copy { min-width: 0; padding-right: 18px; }

        .availability14-copy h3 {
          margin: 0;
          font-size: 19px;
          line-height: 1.25;
          letter-spacing: -.015em;
        }

        .availability14-service {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
        }

        .availability14-rating,
        .availability14-no-reviews { margin-top: 9px; font-size: 13px; }

        .availability14-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #e49a00;
        }

        .availability14-rating span,
        .availability14-no-reviews { color: var(--muted); }

        .availability14-meta { display: grid; gap: 8px; margin-top: 12px; }

        .availability14-meta > div {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          align-items: center;
          gap: 7px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
        }

        .availability14-meta svg { color: var(--accent); }

        .availability14-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          padding-left: 18px;
          border-left: 1px solid #ececf1;
          text-align: center;
        }

        .availability14-slot-label { color: var(--muted); font-size: 12px; font-weight: 800; }
        .availability14-day { margin-top: 9px; font-size: 14px; line-height: 1.3; }
        .availability14-time { margin-top: 4px; font-size: 26px; font-weight: 850; line-height: 1; }

        .availability14-reserve {
          width: 100%;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 13px;
          padding: 0 14px;
          box-sizing: border-box;
          border-radius: 11px;
          background: var(--accent);
          color: #fff;
          font-size: 12px;
          font-weight: 850;
          text-decoration: none;
          box-shadow: 0 8px 18px rgba(112, 87, 245, .18);
        }

        .availability14-business-link {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 7px;
          color: var(--accent-dark);
          font-size: 12px;
          font-weight: 850;
          text-decoration: none;
        }

        .availability14-business-link:hover { text-decoration: underline; }

        @media (max-width: 620px) {
          .availability14-card { grid-template-rows: 190px auto; }
          .availability14-main { grid-template-columns: minmax(0, 1fr); padding: 17px; }
          .availability14-copy { padding-right: 0; }
          .availability14-slot {
            align-items: stretch;
            margin-top: 16px;
            padding: 15px 0 0;
            border-top: 1px solid #ececf1;
            border-left: 0;
            text-align: left;
          }
          .availability14-reserve { width: 100%; }
        }
      `}</style>

      <style>{`
        .availability13-tools {
          display: grid;
          grid-template-columns:
            minmax(0, 1.55fr)
            minmax(330px, .85fr);
          gap: 18px;
          padding: 15px 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 12px 34px
            rgba(31,27,48,.03);
        }

        .availability13-search {
          min-width: 0;
        }

        .availability13-meta {
          display: grid;
          gap: 2px;
          margin: 16px 2px 9px;
        }

        .availability13-meta strong {
          font-size: 13px;
        }

        .availability13-meta span {
          color: var(--muted);
          font-size: 10.5px;
        }

        .availability13-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
          gap: 16px;
        }

        .availability14-card {
          display: grid;
          grid-template-rows:
            132px
            minmax(0,1fr);
          overflow: hidden;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          color: var(--text);
          box-shadow:
            0 10px 28px
            rgba(31,27,48,.025);
          transition:
            transform .16s ease,
            box-shadow .16s ease,
            border-color .16s ease;
        }

        .availability14-card:hover {
          transform: translateY(-1px);
          border-color: #d9d3ea;
          box-shadow:
            0 14px 34px
            rgba(31,27,48,.055);
        }

        .availability14-card.is-first {
          border-color: #c9bfff;
        }

        .availability14-media {
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 11px;
          box-sizing: border-box;
          background:
            radial-gradient(
              circle at 70% 20%,
              rgba(87,200,139,.18),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #f0ecff,
              #f7f6fb
            );
          background-position: center;
          background-size: cover;
        }

        .availability14-media.has-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.02),
              rgba(0,0,0,.06)
            );
          pointer-events: none;
        }

        .availability14-distance-badge,
        .availability14-first-badge {
          position: absolute;
          z-index: 2;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255,255,255,.94);
          box-shadow:
            0 4px 12px
            rgba(31,27,48,.08);
          font-size: 11px;
          font-weight: 800;
        }

        .availability14-distance-badge {
          top: 11px;
          left: 11px;
        }

        .availability14-first-badge {
          top: 11px;
          right: 11px;
          color: var(--accent-dark);
        }

        .availability14-placeholder {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: rgba(255,255,255,.72);
          color: #9d8df2;
          font-size: 28px;
          font-weight: 850;
        }

        .availability14-main {
          display: grid;
          grid-template-columns:
            minmax(0,1fr)
            155px;
          min-height: 0;
          padding: 15px 16px;
        }

        .availability14-copy {
          min-width: 0;
          padding-right: 15px;
        }

        .availability14-copy h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.25;
          letter-spacing: -.015em;
        }

        .availability14-service {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }

        .availability14-rating,
        .availability14-no-reviews {
          margin-top: 7px;
          font-size: 12px;
        }

        .availability14-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #e49a00;
        }

        .availability14-rating span {
          color: var(--muted);
        }

        .availability14-no-reviews {
          display: block;
          color: var(--muted);
        }

        .availability14-meta {
          display: grid;
          gap: 7px;
          margin-top: 9px;
        }

        .availability14-meta > div {
          display: grid;
          grid-template-columns:
            17px
            minmax(0,1fr);
          align-items: center;
          gap: 7px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }

        .availability14-meta svg {
          color: var(--accent);
        }

        .availability14-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          padding-left: 15px;
          border-left: 1px solid #ececf1;
          text-align: center;
        }

        .availability14-slot-label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
        }

        .availability14-day {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.25;
        }

        .availability14-time {
          margin-top: 3px;
          font-size: 24px;
          font-weight: 850;
          line-height: 1;
        }

        .availability14-reserve {
          width: 100%;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
          padding: 0 10px;
          box-sizing: border-box;
          border-radius: 10px;
          background: var(--accent);
          color: #fff;
          font-size: 10px;
          font-weight: 850;
          text-decoration: none;
          box-shadow:
            0 7px 16px
            rgba(112,87,245,.14);
        }

        .availability14-business-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 8px;
          color: var(--accent-dark);
          font-size: 10px;
          font-weight: 850;
          text-decoration: none;
        }

        .availability14-business-link:hover {
          text-decoration: underline;
        }

        .availability13-state {
          display: grid;
          place-items: center;
          min-height: 220px;
          margin-top: 16px;
          padding: 26px;
          text-align: center;
        }

        .availability13-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 20px;
        }

        .availability13-pagination > span:not(.btn) {
          color: var(--muted);
          font-size: 10px;
        }

        .availability13-disabled {
          opacity: .4;
          pointer-events: none;
        }

        @media (max-width: 1100px) {
          .availability13-grid {
            grid-template-columns:
              minmax(0,1fr);
          }
        }

        @media (max-width: 980px) {
          .availability13-tools {
            grid-template-columns:
              minmax(0,1fr);
          }
        }

        @media (max-width: 620px) {
          .availability14-card {
            grid-template-rows:
              160px
              auto;
          }

          .availability14-main {
            grid-template-columns:
              minmax(0,1fr);
            padding: 16px;
          }

          .availability14-copy {
            padding-right: 0;
          }

          .availability14-copy h3 {
            font-size: 19px;
          }

          .availability14-slot {
            align-items: flex-start;
            margin-top: 13px;
            padding: 12px 0 0;
            border-top: 1px solid #ececf1;
            border-left: 0;
            text-align: left;
          }

          .availability14-reserve {
            max-width: 180px;
          }
        }
      `}</style>
    </div>
  );
}
