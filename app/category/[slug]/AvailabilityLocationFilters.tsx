"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  MapPin,
} from "lucide-react";

import {
  useState,
} from "react";

import { storeLocation } from "@/lib/locationPreference";

type Props = {
  categorySlug:
    string;
};

type SortMode =
  | "time"
  | "distance";

export default function AvailabilityLocationFilters({
  categorySlug,
}: Props) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    locating,
    setLocating,
  ] =
    useState(false);

  const [
    locationError,
    setLocationError,
  ] =
    useState("");

  const sortMode:
    SortMode =
    searchParams.get(
      "sort"
    ) === "distance"
      ? "distance"
      : "time";

  const latitude =
    searchParams.get(
      "lat"
    );

  const longitude =
    searchParams.get(
      "lng"
    );

  const maxDistance =
    searchParams.get(
      "distance"
    ) ?? "";

  const hasLocation =
    !!latitude &&
    !!longitude;

  const hasFilters =
    sortMode ===
      "distance" ||
    !!maxDistance;

  function navigate(
    changes: Record<
      string,
      string | null
    >
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    for (
      const [
        key,
        value,
      ] of Object.entries(
        changes
      )
    ) {
      if (
        value ===
          null ||
        value ===
          ""
      ) {
        params.delete(
          key
        );
      } else {
        params.set(
          key,
          value
        );
      }
    }

    params.delete(
      "page"
    );

    const query =
      params.toString();

    router.push(
      query
        ? `/category/${categorySlug}?${query}`
        : `/category/${categorySlug}`
    );
  }

  function requestLocation() {
    setLocationError("");

    if (
      !navigator.geolocation
    ) {
      setLocationError(
        "Tu navegador no permite obtener la ubicación."
      );

      return;
    }

    setLocating(
      true
    );

    navigator.geolocation
      .getCurrentPosition(
        (
          position
        ) => {
          const lat =
            position.coords
              .latitude
              .toString();

          const lng =
            position.coords
              .longitude
              .toString();

          storeLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setLocating(
            false
          );

          navigate({
            lat,
            lng,
            sort:
              "distance",
          });
        },

        () => {
          setLocating(
            false
          );

          setLocationError(
            "No hemos podido acceder a tu ubicación."
          );
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            10000,

          maximumAge:
            300000,
        }
      );
  }

  function changeSort(
    value:
      SortMode
  ) {
    if (
      value ===
        "distance" &&
      !hasLocation
    ) {
      requestLocation();

      return;
    }

    navigate({
      sort:
        value ===
        "distance"
          ? "distance"
          : null,
    });
  }

  function changeDistance(
    value:
      string
  ) {
    if (
      !hasLocation
    ) {
      return;
    }

    navigate({
      distance:
        value ||
        null,

      sort:
        "distance",
    });
  }

  function clearFilters() {
    navigate({
      sort:
        null,

      distance:
        null,
    });
  }

  return (
    <div className="categoryfilters12">
      <div className="categoryfilters12-head">
        <div>
          <span>
            Refinar
          </span>

          <strong>
            Filtros
          </strong>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={
              clearFilters
            }
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="categoryfilters12-grid">
        <div>
          <label>
            Ubicación
          </label>

          <button
            type="button"
            className={
              hasLocation
                ? "categoryfilters12-location is-active"
                : "categoryfilters12-location"
            }
            onClick={
              requestLocation
            }
            disabled={
              locating
            }
          >
            <MapPin
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
            />

            {locating
              ? "Localizando..."
              : hasLocation
                ? "Ubicación activada"
                : "Usar mi ubicación"}
          </button>
        </div>

        <div>
          <label htmlFor="availability-sort">
            Ordenar
          </label>

          <select
            id="availability-sort"
            value={
              sortMode
            }
            onChange={(
              event
            ) =>
              changeSort(
                event.target
                  .value as
                  SortMode
              )
            }
          >
            <option value="time">
              Próxima cita
            </option>

            <option value="distance">
              Distancia
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="availability-distance">
            Distancia máxima
          </label>

          <select
            id="availability-distance"
            value={
              maxDistance
            }
            disabled={
              !hasLocation
            }
            onChange={(
              event
            ) =>
              changeDistance(
                event.target
                  .value
              )
            }
          >
            <option value="">
              Cualquier distancia
            </option>

            <option value="1">
              Hasta 1 km
            </option>

            <option value="5">
              Hasta 5 km
            </option>

            <option value="10">
              Hasta 10 km
            </option>

            <option value="25">
              Hasta 25 km
            </option>

            <option value="50">
              Hasta 50 km
            </option>
          </select>
        </div>
      </div>

      {locationError && (
        <p
          className="categoryfilters12-error"
          role="alert"
        >
          {locationError}
        </p>
      )}

      <style jsx>{`
        .categoryfilters12 {
          min-width: 0;
          padding-left: 18px;
          border-left: 1px solid #efedf2;
        }

        .categoryfilters12-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .categoryfilters12-head > div {
          display: grid;
          gap: 1px;
        }

        .categoryfilters12-head span {
          color: var(--muted);
          font-size: 11px;
        }

        .categoryfilters12-head strong {
          font-size: 15px;
        }

        .categoryfilters12-head button {
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--accent-dark);
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }

        .categoryfilters12-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 9px;
        }

        .categoryfilters12-grid > div {
          min-width: 0;
        }

        .categoryfilters12-grid > div:last-child {
          grid-column: 1 / -1;
        }

        .categoryfilters12-grid label {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10.5px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .categoryfilters12-location,
        .categoryfilters12-grid select {
          width: 100%;
          min-height: 38px;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 11.5px;
          font-weight: 750;
        }

        .categoryfilters12-location {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 5px;
          padding: 0 8px;
          cursor: pointer;
        }

        .categoryfilters12-location svg {
          flex: 0 0 auto;
          color: var(--accent);
        }

        .categoryfilters12-location.is-active {
          border-color: #c9bfff;
          background: #f4f1ff;
          color: var(--accent-dark);
        }

        .categoryfilters12-grid select {
          padding: 0 8px;
        }

        .categoryfilters12-grid select:disabled {
          opacity: .5;
          background: #f8f8fb;
        }

        .categoryfilters12-error {
          margin: 8px 0 0;
          color: #b91c1c;
          font-size: 10.5px;
          line-height: 1.35;
        }

        @media (max-width: 900px) {
          .categoryfilters12 {
            padding-top: 14px;
            padding-left: 0;
            border-top: 1px solid #efedf2;
            border-left: 0;
          }

          .categoryfilters12-grid > div:last-child {
            grid-column: auto;
          }
        }

        @media (max-width: 620px) {
          .categoryfilters12-grid {
            grid-template-columns:
              minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
