"use client";

import {
  useState,
} from "react";

import {
  CalendarDays,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";

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
}: Props) {
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
   */

  function changeMode(
    nextMode:
      SearchMode
  ) {
    setMode(
      nextMode
    );
  }

  return (
    <div className="home3-search">
      <div
        className="home3-search-tabs"
        role="tablist"
        aria-label="Tipo de búsqueda"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            mode ===
            "business"
          }
          className={
            mode ===
            "business"
              ? "is-active"
              : ""
          }
          onClick={() =>
            changeMode(
              "business"
            )
          }
        >
          <Search
            size={17}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          Buscar negocio
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            mode ===
            "availability"
          }
          className={
            mode ===
            "availability"
              ? "is-active"
              : ""
          }
          onClick={() =>
            changeMode(
              "availability"
            )
          }
        >
          <Zap
            size={17}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          Buscar una cita
        </button>
      </div>

      {mode ===
      "business" ? (
        <form
          className="home3-search-form"
          action={
            businessAction
          }
        >
          <div className="home3-search-input">
            <Search
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />

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
              placeholder="Negocio, servicio, ciudad..."
              aria-label="Buscar negocio, servicio, ciudad o categoría"
            />
          </div>

          <button
            type="submit"
            className="home3-search-submit"
          >
            Buscar
          </button>
        </form>
      ) : (
        <form
          action={
            availabilityFormAction
          }
          method="get"
          className="home3-availability"
        >
          <input
            type="hidden"
            name="mode"
            value="availability"
          />

          <div className="home3-availability-intro">
            <span>
              <Sparkles
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Primera cita disponible
              </strong>

              <small>
                Buscaremos entre los negocios disponibles.
              </small>
            </div>
          </div>

          <div className="home3-availability-fields">
            <label>
              <span>
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
                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
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
              >
                <option value="asap">
                  Lo antes posible
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
                  Elegir fecha
                </option>
              </select>
            </label>

            {when ===
              "date" && (
              <label>
                <span>
                  Fecha
                </span>

                <div className="home3-date-field">
                  <CalendarDays
                    size={17}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

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
                  />
                </div>
              </label>
            )}

            <button
              type="submit"
              className="home3-search-submit home3-search-submit-availability"
            >
              <Zap
                size={17}
                strokeWidth={2.2}
                aria-hidden="true"
              />

              Buscar citas
            </button>
          </div>
        </form>
      )}
    </div>
  );
}