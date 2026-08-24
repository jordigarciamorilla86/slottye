"use client";

import {
  useRouter,
} from "next/navigation";

import {
  CalendarDays,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  useState,
} from "react";

import { readStoredLocation } from "@/lib/locationPreference";

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
  categories:
    Category[];

  categorySlug:
    string;

  initialQuery?:
    string;

  initialCategorySlug?:
    string;

  initialMode:
    SearchMode;

  initialWhen?:
    string;

  initialSelectedDate?:
    string;
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

export default function CategorySearchControls({
  categories,
  categorySlug,
  initialQuery = "",
  initialCategorySlug = "",
  initialMode,
  initialWhen = "asap",
  initialSelectedDate = "",
}: Props) {
  const router =
    useRouter();

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      initialQuery
    );

  const [
    selectedCategorySlug,
    setSelectedCategorySlug,
  ] =
    useState(
      initialCategorySlug
    );

  const [
    when,
    setWhen,
  ] =
    useState(
      initialWhen
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      initialSelectedDate
    );

  function changeMode(
    mode:
      SearchMode
  ) {
    if (
      mode ===
      initialMode
    ) {
      return;
    }

    if (
      mode ===
      "availability"
    ) {
      const targetSlug =
        selectedCategorySlug ||
        categorySlug;

      const params = new URLSearchParams({
        mode: "availability",
      });
      const location = readStoredLocation();

      if (location) {
        params.set("lat", String(location.latitude));
        params.set("lng", String(location.longitude));
        params.set("sort", "distance");
      }

      router.push(`/category/${targetSlug}?${params.toString()}`);

      return;
    }

    router.push(
      `/category/${categorySlug}`
    );
  }

  const availabilityAction =
    selectedCategorySlug
      ? `/category/${selectedCategorySlug}`
      : `/category/${categorySlug}`;

  return (
    <div className="categorysearch12">
      <div
        className="categorysearch12-tabs"
        role="tablist"
        aria-label="Tipo de búsqueda"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            initialMode ===
            "business"
          }
          className={
            initialMode ===
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
            size={15}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          Buscar negocio
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            initialMode ===
            "availability"
          }
          className={
            initialMode ===
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
            size={15}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          Buscar una cita
        </button>
      </div>

      {initialMode ===
      "business" ? (
        <form
          className="categorysearch12-business"
          action={`/category/${categorySlug}`}
        >
          <Search
            size={18}
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

          <button
            type="submit"
            className="btn primary"
          >
            Buscar
          </button>
        </form>
      ) : (
        <form
          className="categorysearch12-availability"
          action={
            availabilityAction
          }
          method="get"
        >
          <input
            type="hidden"
            name="mode"
            value="availability"
          />

          <div className="categorysearch12-intro">
            <span className="categorysearch12-intro-icon">
              <Sparkles
                size={17}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Primera cita disponible
              </strong>

              <small>
                Busca entre los negocios disponibles.
              </small>
            </div>
          </div>

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

              <div className="categorysearch12-date">
                <CalendarDays
                  size={15}
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
            className="btn primary categorysearch12-submit"
          >
            <Zap
              size={15}
              strokeWidth={2.2}
              aria-hidden="true"
            />

            Buscar citas
          </button>
        </form>
      )}

      <style jsx>{`
        .categorysearch12 {
          min-width: 0;
        }

        .categorysearch12-tabs {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: #faf9fc;
        }

        .categorysearch12-tabs button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 11px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .categorysearch12-tabs button.is-active {
          background: #fff;
          color: var(--accent-dark);
          box-shadow:
            0 2px 8px
            rgba(31, 27, 48, .06);
        }

        .categorysearch12-business {
          min-height: 46px;
          display: grid;
          grid-template-columns:
            20px
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 9px;
          margin-top: 11px;
          padding: 5px 6px 5px 13px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: #fff;
        }

        .categorysearch12-business > svg {
          color: #8d8898;
        }

        .categorysearch12-business input {
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 13px;
        }

        .categorysearch12-business input::placeholder {
          color: #aaa5b2;
        }

        .categorysearch12-business .btn {
          min-height: 40px;
          padding: 0 16px;
        }

        .categorysearch12-availability {
          display: grid;
          grid-template-columns:
            minmax(155px, .8fr)
            minmax(140px, .8fr)
            minmax(140px, .8fr)
            auto;
          align-items: end;
          gap: 9px;
          margin-top: 11px;
        }

        .categorysearch12-intro {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1px;
        }

        .categorysearch12-intro-icon {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 31px;
          border-radius: 9px;
          background: #f0ecff;
          color: var(--accent);
        }

        .categorysearch12-intro strong,
        .categorysearch12-intro small {
          display: block;
        }

        .categorysearch12-intro strong {
          font-size: 13px;
        }

        .categorysearch12-intro small {
          margin-top: 1px;
          color: var(--muted);
          font-size: 11px;
        }

        .categorysearch12-availability label {
          min-width: 0;
        }

        .categorysearch12-availability label > span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 10.5px;
          font-weight: 850;
        }

        .categorysearch12-availability select,
        .categorysearch12-date {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 11.5px;
          font-weight: 700;
        }

        .categorysearch12-availability select {
          padding: 0 9px;
        }

        .categorysearch12-date {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 9px;
        }

        .categorysearch12-date input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 11.5px;
        }

        .categorysearch12-submit {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 14px;
        }

        @media (max-width: 760px) {
          .categorysearch12-tabs {
            width: 100%;
          }

          .categorysearch12-tabs button {
            flex: 1;
          }

          .categorysearch12-availability {
            grid-template-columns:
              minmax(0, 1fr);
          }

          .categorysearch12-intro {
            grid-column: auto;
          }

          .categorysearch12-submit {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
