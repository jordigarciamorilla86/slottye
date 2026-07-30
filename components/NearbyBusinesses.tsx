"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BusinessCard } from "@/components/BusinessCard";

type Business = {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;

  averageRating: number | null;
  reviewCount: number;

  hasAvailableSlots: boolean;
};

type Props = {
  businesses: Business[];
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type SortMode =
  | "default"
  | "distance"
  | "rating"
  | "name";

type LocationPermission =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported"
  | "unknown";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm =
    6371;

  const toRadians = (
    degrees: number
  ) =>
    (degrees *
      Math.PI) /
    180;

  const dLat =
    toRadians(
      lat2 -
        lat1
    );

  const dLon =
    toRadians(
      lon2 -
        lon1
    );

  const a =
    Math.sin(
      dLat /
        2
    ) **
      2 +
    Math.cos(
      toRadians(
        lat1
      )
    ) *
      Math.cos(
        toRadians(
          lat2
        )
      ) *
      Math.sin(
        dLon /
          2
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        a
      ),
      Math.sqrt(
        1 -
          a
      )
    );

  return (
    earthRadiusKm *
    c
  );
}

function formatDistance(
  km: number
) {
  if (
    km <
    1
  ) {
    return `${Math.round(
      km *
        1000
    )} m`;
  }

  return `${km.toLocaleString(
    "es-ES",
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    }
  )} km`;
}

export function NearbyBusinesses({
  businesses,
}: Props) {
  const [
    userLocation,
    setUserLocation,
  ] =
    useState<UserLocation | null>(
      null
    );

  const [
    locating,
    setLocating,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    locationPermission,
    setLocationPermission,
  ] =
    useState<LocationPermission>(
      "unknown"
    );

  /*
   * Evita comprobaciones duplicadas
   * durante desarrollo con React Strict Mode.
   */
  const permissionChecked =
    useRef(false);

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "default"
    );

  const [
    onlyRated,
    setOnlyRated,
  ] =
    useState(
      false
    );

  const [
    minimumFourStars,
    setMinimumFourStars,
  ] =
    useState(
      false
    );

  const [
    onlyAvailable,
    setOnlyAvailable,
  ] =
    useState(
      false
    );

  const [
    maxDistanceKm,
    setMaxDistanceKm,
  ] =
    useState<
      number | null
    >(
      null
    );

  /*
   * ============================================================
   * GUARDAR UBICACIÓN
   * ============================================================
   */

  function saveLocation(
    position:
      GeolocationPosition
  ) {
    setUserLocation({
      latitude:
        position
          .coords
          .latitude,

      longitude:
        position
          .coords
          .longitude,
    });

    setLocating(
      false
    );

    setMessage(
      ""
    );

    setLocationPermission(
      "granted"
    );

    /*
     * Cuando conocemos la ubicación,
     * ordenamos automáticamente
     * por distancia.
     */
    setSortMode(
      "distance"
    );
  }

  /*
   * ============================================================
   * ERROR DE UBICACIÓN
   * ============================================================
   */

  function handleLocationError(
    error:
      GeolocationPositionError,
    automatic:
      boolean
  ) {
    setLocating(
      false
    );

    if (
      error.code ===
      error.PERMISSION_DENIED
    ) {
      setLocationPermission(
        "denied"
      );

      /*
       * Si estábamos comprobando un permiso
       * ya concedido y ha cambiado,
       * no mostramos un aviso intrusivo.
       */
      if (
        automatic
      ) {
        return;
      }

      setMessage(
        "No has permitido acceder a tu ubicación. Puedes activarla en los permisos del navegador y volver a intentarlo."
      );

      return;
    }

    if (
      automatic
    ) {
      return;
    }

    if (
      error.code ===
      error.POSITION_UNAVAILABLE
    ) {
      setMessage(
        "No hemos podido determinar tu ubicación en este momento."
      );

      return;
    }

    if (
      error.code ===
      error.TIMEOUT
    ) {
      setMessage(
        "La ubicación está tardando demasiado. Puedes volver a intentarlo."
      );

      return;
    }

    setMessage(
      "No hemos podido acceder a tu ubicación. Puedes seguir viendo los negocios igualmente."
    );
  }

  /*
   * ============================================================
   * OBTENER UBICACIÓN
   * ============================================================
   */

  function getLocation(
    automatic =
      false
  ) {
    if (
      !navigator.geolocation
    ) {
      setLocationPermission(
        "unsupported"
      );

      if (
        !automatic
      ) {
        setMessage(
          "Tu navegador no permite obtener la ubicación."
        );
      }

      return;
    }

    setLocating(
      true
    );

    if (
      !automatic
    ) {
      setMessage(
        ""
      );
    }

    navigator.geolocation.getCurrentPosition(
      saveLocation,

      (
        error
      ) =>
        handleLocationError(
          error,
          automatic
        ),

      {
        /*
         * No necesitamos precisión GPS extrema
         * para ordenar negocios cercanos.
         */
        enableHighAccuracy:
          false,

        timeout:
          10000,

        maximumAge:
          300000,
      }
    );
  }

  /*
   * ============================================================
   * BOTÓN "USAR MI UBICACIÓN"
   * ============================================================
   */

  async function requestLocation() {
    /*
     * Si sabemos que está denegado,
     * evitamos hacer una petición que el
     * navegador rechazará inmediatamente.
     */
    if (
      locationPermission ===
      "denied"
    ) {
      setMessage(
        "La ubicación está bloqueada para Slottye. Actívala en los permisos del navegador y vuelve a intentarlo."
      );

      return;
    }

    /*
     * Si está en prompt, esta llamada se realiza
     * como consecuencia directa del clic del usuario,
     * por lo que el navegador puede mostrar:
     *
     * "slottye.com quiere usar tu ubicación"
     */
    getLocation(
      false
    );
  }

  /*
   * ============================================================
   * COMPROBAR PERMISO AL ENTRAR
   * ============================================================
   */

  useEffect(() => {
    if (
      permissionChecked.current
    ) {
      return;
    }

    permissionChecked.current =
      true;

    async function checkLocationPermission() {
      /*
       * Sin geolocalización disponible.
       */
      if (
        !navigator.geolocation
      ) {
        setLocationPermission(
          "unsupported"
        );

        return;
      }

      /*
       * Algunos navegadores no implementan
       * navigator.permissions correctamente.
       *
       * En ese caso no pedimos ubicación
       * automáticamente y dejamos el botón.
       */
      if (
        !navigator.permissions
      ) {
        setLocationPermission(
          "unsupported"
        );

        return;
      }

      try {
        const permission =
          await navigator.permissions.query({
            name:
              "geolocation",
          });

        setLocationPermission(
          permission.state
        );

        /*
         * Si ya nos había dado permiso,
         * usamos la ubicación automáticamente.
         *
         * Aquí NO aparecerá ningún popup,
         * porque ya está concedido.
         */
        if (
          permission.state ===
          "granted"
        ) {
          getLocation(
            true
          );
        }

        /*
         * prompt:
         *
         * No pedimos nada automáticamente.
         * Esperamos a que pulse
         * "Usar mi ubicación".
         *
         * denied:
         *
         * Tampoco hacemos una llamada.
         */

        permission.onchange =
          () => {
            setLocationPermission(
              permission.state
            );

            if (
              permission.state ===
              "granted" &&
              !userLocation
            ) {
              getLocation(
                true
              );
            }

            if (
              permission.state ===
              "denied"
            ) {
              setUserLocation(
                null
              );

              setMaxDistanceKm(
                null
              );

              if (
                sortMode ===
                "distance"
              ) {
                setSortMode(
                  "default"
                );
              }
            }
          };
      } catch {
        /*
         * Si Permissions API falla,
         * dejamos simplemente el botón manual.
         */
        setLocationPermission(
          "unsupported"
        );
      }
    }

    checkLocationPermission();
  }, []);

  /*
   * ============================================================
   * FILTROS + DISTANCIA + ORDEN
   * ============================================================
   */

  const visibleBusinesses =
    useMemo(() => {
      let result =
        businesses.map(
          (
            business
          ) => {
            if (
              !userLocation ||
              business.latitude ===
                null ||
              business.longitude ===
                null
            ) {
              return {
                ...business,

                distanceKm:
                  null as
                    | number
                    | null,
              };
            }

            return {
              ...business,

              distanceKm:
                calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  business.latitude,
                  business.longitude
                ),
            };
          }
        );

      /*
       * Distancia máxima.
       */
      if (
        maxDistanceKm !==
          null &&
        userLocation
      ) {
        result =
          result.filter(
            (
              business
            ) =>
              business.distanceKm !==
                null &&
              business.distanceKm <=
                maxDistanceKm
          );
      }

      /*
       * Solo negocios con citas.
       */
      if (
        onlyAvailable
      ) {
        result =
          result.filter(
            (
              business
            ) =>
              business.hasAvailableSlots
          );
      }

      /*
       * Solo con opiniones.
       */
      if (
        onlyRated
      ) {
        result =
          result.filter(
            (
              business
            ) =>
              business.reviewCount >
              0
          );
      }

      /*
       * 4 estrellas o más.
       */
      if (
        minimumFourStars
      ) {
        result =
          result.filter(
            (
              business
            ) =>
              business.averageRating !==
                null &&
              business.averageRating >=
                4
          );
      }

      /*
       * DISTANCIA
       */
      if (
        sortMode ===
        "distance"
      ) {
        if (
          !userLocation
        ) {
          return result;
        }

        result =
          [
            ...result,
          ].sort(
            (
              a,
              b
            ) => {
              if (
                a.distanceKm ===
                  null &&
                b.distanceKm ===
                  null
              ) {
                return 0;
              }

              if (
                a.distanceKm ===
                null
              ) {
                return 1;
              }

              if (
                b.distanceKm ===
                null
              ) {
                return -1;
              }

              return (
                a.distanceKm -
                b.distanceKm
              );
            }
          );
      }

      /*
       * VALORACIÓN
       */
      if (
        sortMode ===
        "rating"
      ) {
        result =
          [
            ...result,
          ].sort(
            (
              a,
              b
            ) => {
              const ratingA =
                a.averageRating ??
                -1;

              const ratingB =
                b.averageRating ??
                -1;

              if (
                ratingB !==
                ratingA
              ) {
                return (
                  ratingB -
                  ratingA
                );
              }

              return (
                b.reviewCount -
                a.reviewCount
              );
            }
          );
      }

      /*
       * NOMBRE
       */
      if (
        sortMode ===
        "name"
      ) {
        result =
          [
            ...result,
          ].sort(
            (
              a,
              b
            ) =>
              a.name.localeCompare(
                b.name,
                "es",
                {
                  sensitivity:
                    "base",
                }
              )
          );
      }

      return result;
    }, [
      businesses,
      userLocation,
      sortMode,
      onlyRated,
      minimumFourStars,
      onlyAvailable,
      maxDistanceKm,
    ]);

  /*
   * ============================================================
   * FILTROS ACTIVOS
   * ============================================================
   */

  const hasActiveFilters =
    minimumFourStars ||
    onlyRated ||
    onlyAvailable ||
    maxDistanceKm !==
      null ||
    sortMode !==
      "default";

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <>
      <div
        style={{
          padding:
            16,

          border:
            "1px solid var(--border)",

          borderRadius:
            16,

          marginBottom:
            20,
        }}
      >
        {/* UBICACIÓN + ORDEN */}

        <div
          style={{
            display:
              "flex",

            gap:
              10,

            alignItems:
              "center",

            flexWrap:
              "wrap",
          }}
        >
          <button
            type="button"

            className={
              userLocation
                ? "btn primary"
                : "btn"
            }

            onClick={
              requestLocation
            }

            disabled={
              locating
            }
          >
            {locating
              ? "Localizando..."
              : userLocation
                ? "📍 Ubicación activada"
                : "📍 Usar mi ubicación"}
          </button>

          <label>
            <span
              className="muted"

              style={{
                marginRight:
                  8,
              }}
            >
              Ordenar:
            </span>

            <select
              value={
                sortMode
              }

              onChange={(
                e
              ) => {
                const value =
                  e.target
                    .value as SortMode;

                setSortMode(
                  value
                );

                if (
                  value ===
                    "distance" &&
                  !userLocation
                ) {
                  setMessage(
                    "Activa tu ubicación para ordenar los negocios por distancia."
                  );
                } else {
                  setMessage(
                    ""
                  );
                }
              }}

              style={{
                padding:
                  "10px 12px",

                border:
                  "1px solid var(--border)",

                borderRadius:
                  12,

                background:
                  "var(--card)",

                color:
                  "var(--text)",

                font:
                  "inherit",
              }}
            >
              <option value="default">
                Recomendados
              </option>

              <option value="distance">
                Distancia
              </option>

              <option value="rating">
                Mejor valorados
              </option>

              <option value="name">
                Nombre A-Z
              </option>
            </select>
          </label>

          {/* DISTANCIA MÁXIMA */}

          <label>
            <span
              className="muted"

              style={{
                marginRight:
                  8,
              }}
            >
              Distancia máxima:
            </span>

            <select
              value={
                maxDistanceKm ??
                ""
              }

              onChange={(
                e
              ) => {
                const value =
                  e.target
                    .value;

                if (
                  !value
                ) {
                  setMaxDistanceKm(
                    null
                  );

                  setMessage(
                    ""
                  );

                  return;
                }

                if (
                  !userLocation
                ) {
                  setMaxDistanceKm(
                    null
                  );

                  setMessage(
                    "Activa tu ubicación para filtrar por distancia."
                  );

                  return;
                }

                setMaxDistanceKm(
                  Number(
                    value
                  )
                );

                setMessage(
                  ""
                );

                setSortMode(
                  "distance"
                );
              }}

              style={{
                padding:
                  "10px 12px",

                border:
                  "1px solid var(--border)",

                borderRadius:
                  12,

                background:
                  "var(--card)",

                color:
                  "var(--text)",

                font:
                  "inherit",
              }}
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
          </label>
        </div>

        {/* FILTROS */}

        <div
          style={{
            display:
              "flex",

            gap:
              16,

            flexWrap:
              "wrap",

            alignItems:
              "center",

            marginTop:
              14,
          }}
        >
          {/* DISPONIBILIDAD */}

          <label
            style={{
              display:
                "flex",

              gap:
                7,

              alignItems:
                "center",

              cursor:
                "pointer",
            }}
          >
            <input
              type="checkbox"

              checked={
                onlyAvailable
              }

              onChange={(
                e
              ) =>
                setOnlyAvailable(
                  e.target
                    .checked
                )
              }
            />

            📅 Con citas disponibles
          </label>

          {/* 4+ */}

          <label
            style={{
              display:
                "flex",

              gap:
                7,

              alignItems:
                "center",

              cursor:
                "pointer",
            }}
          >
            <input
              type="checkbox"

              checked={
                minimumFourStars
              }

              onChange={(
                e
              ) =>
                setMinimumFourStars(
                  e.target
                    .checked
                )
              }
            />

            ⭐ 4 o más
          </label>

          {/* OPINIONES */}

          <label
            style={{
              display:
                "flex",

              gap:
                7,

              alignItems:
                "center",

              cursor:
                "pointer",
            }}
          >
            <input
              type="checkbox"

              checked={
                onlyRated
              }

              onChange={(
                e
              ) =>
                setOnlyRated(
                  e.target
                    .checked
                )
              }
            />

            Solo con opiniones
          </label>

          {/* LIMPIAR */}

          {hasActiveFilters && (
            <button
              type="button"

              className="btn"

              onClick={() => {
                setMinimumFourStars(
                  false
                );

                setOnlyRated(
                  false
                );

                setOnlyAvailable(
                  false
                );

                setMaxDistanceKm(
                  null
                );

                setSortMode(
                  userLocation
                    ? "distance"
                    : "default"
                );

                setMessage(
                  ""
                );
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {userLocation && (
          <div
            className="muted"

            style={{
              marginTop:
                12,
            }}
          >
            📍 Distancias calculadas desde tu ubicación actual.
          </div>
        )}
      </div>

      {/* MENSAJE */}

      {message && (
        <div
          style={{
            marginBottom:
              18,

            padding:
              "12px 14px",

            border:
              "1px solid #bfdbfe",

            background:
              "#eff6ff",

            color:
              "#1d4ed8",

            borderRadius:
              12,
          }}
        >
          ℹ️{" "}
          {
            message
          }
        </div>
      )}

      {/* TOTAL */}

      <div
        className="muted"

        style={{
          marginBottom:
            14,
        }}
      >
        {
          visibleBusinesses.length
        }{" "}

        {visibleBusinesses.length ===
        1
          ? "negocio"
          : "negocios"}
      </div>

      {/* RESULTADOS */}

      {visibleBusinesses.length >
      0 ? (
        <div className="cards">
          {visibleBusinesses.map(
            (
              business
            ) => (
              <BusinessCard
                key={
                  business.id
                }

                business={{
                  slug:
                    business.slug,

                  name:
                    business.name,

                  description:
                    business.description,

                  address:
                    business.address,

                  city:
                    business.city,

                  phone:
                    business.phone,

                  website:
                    business.website,

                  imageUrl:
                    business.imageUrl,

                  distance:
                    business.distanceKm !==
                    null
                      ? formatDistance(
                          business.distanceKm
                        )
                      : null,

                  averageRating:
                    business.averageRating,

                  reviewCount:
                    business.reviewCount,
                }}
              />
            )
          )}
        </div>
      ) : (
        <div className="panel">
          <h3>
            No hay negocios que coincidan con los filtros
          </h3>

          <p className="muted">
            Prueba a ampliar la distancia o quitar alguno de los filtros.
          </p>
        </div>
      )}
    </>
  );
}