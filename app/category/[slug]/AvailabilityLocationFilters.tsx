"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useState,
} from "react";

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

    router.push(
      `/category/${categorySlug}?${params.toString()}`
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
    <div
      style={{
        marginBottom:
          20,

        padding:
          16,

        border:
          "1px solid var(--border)",

        borderRadius:
          18,

        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            12,

          flexWrap:
            "wrap",
        }}
      >
        {/* ================================================
            UBICACIÓN
            ================================================ */}

        {hasLocation ? (
          <div
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              minHeight:
                46,

              padding:
                "0 16px",

              border:
                "1px solid #6d5dfc",

              borderRadius:
                14,

              background:
                "#6d5dfc",

              color:
                "#ffffff",

              fontWeight:
                800,

              fontSize:
                14,

              whiteSpace:
                "nowrap",
            }}
          >
            📍 Ubicación activada
          </div>
        ) : (
          <button
            type="button"
            className="btn primary"
            disabled={
              locating
            }
            onClick={
              requestLocation
            }
            style={{
              minHeight:
                46,

              whiteSpace:
                "nowrap",
            }}
          >
            {locating
              ? "Obteniendo ubicación..."
              : "📍 Activar ubicación"}
          </button>
        )}

        {/* ================================================
            ORDEN
            ================================================ */}

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              8,
          }}
        >
          <span
            className="muted"
            style={{
              whiteSpace:
                "nowrap",
            }}
          >
            Ordenar:
          </span>

          <select
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
            style={
              selectStyle
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

        {/* ================================================
            DISTANCIA MÁXIMA
            ================================================ */}

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              8,
          }}
        >
          <span
            className="muted"
            style={{
              whiteSpace:
                "nowrap",
            }}
          >
            Distancia máxima:
          </span>

          <select
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
            style={{
              ...selectStyle,

              opacity:
                hasLocation
                  ? 1
                  : 0.55,

              cursor:
                hasLocation
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            <option value="">
              Cualquier distancia
            </option>

            <option value="5">
              5 km
            </option>

            <option value="10">
              10 km
            </option>

            <option value="25">
              25 km
            </option>

            <option value="50">
              50 km
            </option>

            <option value="100">
              100 km
            </option>
          </select>
        </div>

        {/* ================================================
            LIMPIAR
            ================================================ */}

        {hasFilters && (
          <button
            type="button"
            className="btn"
            onClick={
              clearFilters
            }
            style={{
              minHeight:
                46,

              whiteSpace:
                "nowrap",
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {hasLocation && (
        <p
          className="muted"
          style={{
            margin:
              "14px 0 0",

            fontSize:
              14,
          }}
        >
          📍 Distancias calculadas desde tu ubicación actual.
        </p>
      )}

      {locationError && (
        <p
          style={{
            margin:
              "14px 0 0",

            color:
              "#b91c1c",

            fontSize:
              13,
          }}
        >
          {locationError}
        </p>
      )}
    </div>
  );
}

const selectStyle = {
  minHeight:
    46,

  padding:
    "0 14px",

  border:
    "1px solid var(--border)",

  borderRadius:
    12,

  background:
    "#ffffff",

  color:
    "var(--text)",

  font:
    "inherit",

  cursor:
    "pointer",
};