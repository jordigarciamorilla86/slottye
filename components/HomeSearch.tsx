"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type SearchMode =
  | "business"
  | "availability";

type Props = {
  categories: Category[];

  businessAction?:
    string;

  initialQuery?:
    string;

  initialCategorySlug?:
    string;

  initialMode?:
    SearchMode;

  availabilityInCategory?:
    boolean;
};

function todayValue() {
  return new Date()
    .toLocaleDateString(
      "en-CA",
      {
        timeZone:
          "Europe/Madrid",
      }
    );
}

export function HomeSearch({
  categories,

  businessAction =
    "/category/todos",

  initialQuery = "",

  initialCategorySlug = "",

  initialMode =
    "business",

  availabilityInCategory =
    false,
}: Props) {
  const router =
    useRouter();

  const [
    mode,
    setMode,
  ] =
    useState<SearchMode>(
      initialMode
    );

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      initialQuery ??
        ""
    );

  const [
    when,
    setWhen,
  ] =
    useState(
      "asap"
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState("");

  const [
    selectedCategorySlug,
    setSelectedCategorySlug,
  ] =
    useState(
      initialCategorySlug ??
        ""
    );

  /*
   * ============================================================
   * DESTINO DEL BUSCADOR DE CITAS
   * ============================================================
   *
   * Tanto desde Home como desde una categoría,
   * las búsquedas de citas terminan directamente en:
   *
   * /category/[slug]?mode=availability
   *
   * Si el usuario cambia la categoría,
   * el destino cambia automáticamente.
   */

  const availabilityFormAction =
    selectedCategorySlug
      ? `/category/${selectedCategorySlug}`
      : "/category/todos";

  /*
   * ============================================================
   * CAMBIO DE MODO
   * ============================================================
   *
   * En Home únicamente cambiamos la UI.
   *
   * Dentro de /category/[slug], además limpiamos la URL
   * para no conservar parámetros pertenecientes al modo
   * anterior.
   */

  function changeMode(
    nextMode:
      SearchMode
  ) {
    setMode(
      nextMode
    );

    if (
      !availabilityInCategory
    ) {
      return;
    }

    /*
     * ==========================================================
     * BUSCAR NEGOCIO
     * ==========================================================
     *
     * Eliminamos:
     *
     * mode
     * when
     * date
     * sort
     * lat
     * lng
     * distance
     * page
     *
     * y conservamos la categoría actual.
     */

    if (
      nextMode ===
      "business"
    ) {
      const target =
        initialCategorySlug
          ? `/category/${initialCategorySlug}`
          : "/category/todos";

      /*
       * Conservamos la búsqueda de texto solamente
       * si realmente existe.
       */

      const search =
        new URLSearchParams();

      if (
        searchQuery.trim()
      ) {
        search.set(
          "q",
          searchQuery.trim()
        );
      }

      const queryString =
        search.toString();

      router.push(
        queryString
          ? `${target}?${queryString}`
          : target
      );

      return;
    }

    /*
     * ==========================================================
     * BUSCAR UNA CITA
     * ==========================================================
     *
     * Eliminamos la búsqueda textual de negocios y cualquier
     * filtro anterior. El formulario de citas empezará limpio.
     */

    const target =
      selectedCategorySlug
        ? `/category/${selectedCategorySlug}`
        : initialCategorySlug
          ? `/category/${initialCategorySlug}`
          : "/category/todos";

    router.push(
      `${target}?mode=availability`
    );
  }

  return (
    <div
      style={{
        width:
          "100%",

        maxWidth:
          760,

        margin:
          "0 auto",
      }}
    >
      {/* ================================================
          MODOS
          ================================================ */}

      <div
        style={{
          display:
            "flex",

          gap:
            8,

          marginBottom:
            14,

          flexWrap:
            "wrap",
        }}
      >
        <button
          type="button"
          onClick={() =>
            changeMode(
              "business"
            )
          }
          style={{
            padding:
              "10px 16px",

            border:
              mode ===
              "business"
                ? "1px solid #c4b5fd"
                : "1px solid var(--border)",

            borderRadius:
              12,

            background:
              mode ===
              "business"
                ? "#f5f3ff"
                : "#ffffff",

            color:
              mode ===
              "business"
                ? "#4c1d95"
                : "var(--text)",

            fontWeight:
              700,

            fontSize:
              14,

            cursor:
              "pointer",
          }}
        >
          🔎 Buscar negocio
        </button>

        <button
          type="button"
          onClick={() =>
            changeMode(
              "availability"
            )
          }
          style={{
            padding:
              "10px 16px",

            border:
              mode ===
              "availability"
                ? "1px solid #c4b5fd"
                : "1px solid var(--border)",

            borderRadius:
              12,

            background:
              mode ===
              "availability"
                ? "#f5f3ff"
                : "#ffffff",

            color:
              mode ===
              "availability"
                ? "#4c1d95"
                : "var(--text)",

            fontWeight:
              700,

            fontSize:
              14,

            cursor:
              "pointer",
          }}
        >
          ⚡ Buscar una cita
        </button>
      </div>

      {/* ================================================
          BUSCAR NEGOCIO
          ================================================ */}

      {mode ===
      "business" ? (
        <form
          className="search"
          action={
            businessAction
          }
        >
          <input
            name="q"
            value={
              searchQuery
            }
            onChange={(
              event
            ) =>
              setSearchQuery(
                event.target
                  .value
              )
            }
            placeholder="Negocio, servicio, ciudad, categoría..."
          />

          <button type="submit">
            Buscar
          </button>
        </form>
      ) : (
        /* ================================================
           BUSCAR CITA
           ================================================ */

        <form
          action={
            availabilityFormAction
          }
          method="get"
          style={{
            padding:
              18,

            border:
              "1px solid var(--border)",

            borderRadius:
              20,

            background:
              "#ffffff",

            boxShadow:
              "0 14px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          {/* Indica a /category/[slug] que queremos
              mostrar citas y no negocios. */}

          <input
            type="hidden"
            name="mode"
            value="availability"
          />

          <div
            style={{
              marginBottom:
                16,
            }}
          >
            <strong
              style={{
                display:
                  "block",

                fontSize:
                  16,
              }}
            >
              ⚡ Encuentra la primera cita disponible
            </strong>

            <span
              className="muted"
              style={{
                display:
                  "block",

                marginTop:
                  4,

                fontSize:
                  13,
              }}
            >
              Buscaremos entre todos los negocios por ti.
            </span>
          </div>

          <div
            style={{
              display:
                "flex",

              gap:
                10,

              alignItems:
                "flex-end",

              flexWrap:
                "wrap",
            }}
          >
            {/* ================================================
                CATEGORÍA
                ================================================ */}

            <label
              style={{
                flex:
                  "1 1 240px",
              }}
            >
              <span
                style={{
                  display:
                    "block",

                  marginBottom:
                    7,

                  fontSize:
                    12,

                  fontWeight:
                    700,

                  color:
                    "#64748b",
                }}
              >
                ¿Qué necesitas?
              </span>

              <select
                name="category"
                required
                value={
                  selectedCategorySlug
                }
                onChange={(
                  event
                ) =>
                  setSelectedCategorySlug(
                    event.target
                      .value
                  )
                }
                style={
                  selectStyle
                }
              >
                <option
                  value=""
                  disabled
                >
                  Selecciona una categoría
                </option>

                {categories.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.slug
                      }
                    >
                      {category.icon
                        ? `${category.icon} `
                        : ""}

                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            {/* ================================================
                CUÁNDO
                ================================================ */}

            <label
              style={{
                flex:
                  "1 1 210px",
              }}
            >
              <span
                style={{
                  display:
                    "block",

                  marginBottom:
                    7,

                  fontSize:
                    12,

                  fontWeight:
                    700,

                  color:
                    "#64748b",
                }}
              >
                ¿Cuándo?
              </span>

              <select
                name="when"
                value={
                  when
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target
                      .value;

                  setWhen(
                    value
                  );

                  if (
                    value !==
                    "date"
                  ) {
                    setSelectedDate(
                      ""
                    );
                  }
                }}
                style={
                  selectStyle
                }
              >
                <option value="asap">
                  ⚡ Lo antes posible
                </option>

                <option value="today">
                  Hoy
                </option>

                <option value="tomorrow">
                  Mañana
                </option>

                <option value="week">
                  Esta semana
                </option>

                <option value="date">
                  📅 Elegir fecha
                </option>
              </select>
            </label>

            {/* ================================================
                FECHA CONCRETA
                ================================================ */}

            {when ===
              "date" && (
              <label
                style={{
                  flex:
                    "1 1 190px",
                }}
              >
                <span
                  style={{
                    display:
                      "block",

                    marginBottom:
                      7,

                    fontSize:
                      12,

                    fontWeight:
                      700,

                    color:
                      "#64748b",
                  }}
                >
                  Fecha
                </span>

                <input
                  type="date"
                  name="date"
                  required
                  min={
                    todayValue()
                  }
                  value={
                    selectedDate
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedDate(
                      event.target
                        .value
                    )
                  }
                  style={
                    selectStyle
                  }
                />
              </label>
            )}

            {/* ================================================
                BOTÓN
                ================================================ */}

            <button
              type="submit"
              className="btn primary"
              style={{
                height:
                  48,

                padding:
                  "0 20px",

                whiteSpace:
                  "nowrap",

                flexShrink:
                  0,
              }}
            >
              Buscar citas
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const selectStyle = {
  width:
    "100%",

  height:
    48,

  padding:
    "0 14px",

  border:
    "1px solid #dbe1ea",

  borderRadius:
    12,

  background:
    "#ffffff",

  color:
    "#111827",

  fontSize:
    15,

  fontWeight:
    600,

  cursor:
    "pointer",
};