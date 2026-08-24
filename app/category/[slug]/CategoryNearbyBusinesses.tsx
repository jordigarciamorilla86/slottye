"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BusinessCard } from "@/components/BusinessCard";
import CategorySearchControls from "./CategorySearchControls";
import {
  clearStoredLocation,
  readStoredLocation,
  storeLocation,
} from "@/lib/locationPreference";

import {
  MapPin,
  SlidersHorizontal,
} from "lucide-react";

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
  nextAvailableAt?: string | null;
};

type SearchCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type Props = {
  businesses: Business[];
  categories: SearchCategory[];
  categorySlug: string;
  initialQuery: string;
  initialCategorySlug: string;
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

export default function CategoryNearbyBusinesses({
  businesses,
  categories,
  categorySlug,
  initialQuery,
  initialCategorySlug,
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

  const userLocationRef =
    useRef<UserLocation | null>(null);

  const sortModeRef =
    useRef<SortMode>("default");

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

  const saveLocation = useCallback((
    position:
      GeolocationPosition
  ) => {
    const location = {
      latitude:
        position
          .coords
          .latitude,

      longitude:
        position
          .coords
          .longitude,
    };

    setUserLocation(location);
    storeLocation(location);

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
  }, []);

  /*
   * ============================================================
   * ERROR DE UBICACIÓN
   * ============================================================
   */

  const handleLocationError = useCallback((
    error:
      GeolocationPositionError,
    automatic:
      boolean
  ) => {
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
  }, []);

  /*
   * ============================================================
   * OBTENER UBICACIÓN
   * ============================================================
   */

  const getLocation = useCallback((
    automatic =
      false
  ) => {
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
  }, [handleLocationError, saveLocation]);

  /*
   * ============================================================
   * BOTÓN "USAR MI UBICACIÓN"
   * ============================================================
   */

  async function requestLocation() {
    /*
     * Si la ubicación ya está activa, el mismo botón
     * sirve para dejar de utilizarla en Slottye.
     *
     * Esto no revoca el permiso del navegador:
     * simplemente dejamos de usar la ubicación
     * hasta que el usuario vuelva a activarla.
     */
    if (
      userLocation
    ) {
      clearStoredLocation();

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

      setMessage(
        ""
      );

      return;
    }

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
    const storedLocation = readStoredLocation();

    if (!storedLocation) return;

    const timeoutId = window.setTimeout(() => {
      setUserLocation(storedLocation);
      setSortMode("distance");
      setLocationPermission("granted");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    userLocationRef.current =
      userLocation;

    sortModeRef.current =
      sortMode;
  }, [sortMode, userLocation]);

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
              !userLocationRef.current
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
                sortModeRef.current ===
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
  }, [getLocation]);

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
    <div className="categorybusiness12">
      <section className="categorybusiness12-tools">
        <div className="categorybusiness12-search">
          <CategorySearchControls
            categories={
              categories
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
            initialMode="business"
          />
        </div>

        <div className="categorybusiness12-filters">
          <div className="categorybusiness12-filter-head">
            <div>
              <span>
                Refinar
              </span>

              <strong>
                Filtros
              </strong>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
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
                Limpiar
              </button>
            )}
          </div>

          <div className="categorybusiness12-filter-grid">
            <div>
              <label>
                Ubicación
              </label>

              <button
                type="button"
                className={
                  userLocation
                    ? "categorybusiness12-location is-active"
                    : "categorybusiness12-location"
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
                  : userLocation
                    ? "Ubicación activada"
                    : "Usar mi ubicación"}
              </button>
            </div>

            <div>
              <label htmlFor="categorybusiness12-sort">
                Ordenar
              </label>

              <select
                id="categorybusiness12-sort"
                value={
                  sortMode
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target
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
            </div>

            <div>
              <label htmlFor="categorybusiness12-distance">
                Distancia
              </label>

              <select
                id="categorybusiness12-distance"
                value={
                  maxDistanceKm ??
                  ""
                }
                disabled={
                  !userLocation
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target
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
                    return;
                  }

                  setMaxDistanceKm(
                    Number(
                      value
                    )
                  );

                  setSortMode(
                    "distance"
                  );

                  setMessage(
                    ""
                  );
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
            </div>

            <div>
              <label>
                Mostrar
              </label>

              <div className="categorybusiness12-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={
                      onlyAvailable
                    }
                    onChange={(
                      event
                    ) =>
                      setOnlyAvailable(
                        event.target
                          .checked
                      )
                    }
                  />
                  Con citas
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      minimumFourStars
                    }
                    onChange={(
                      event
                    ) =>
                      setMinimumFourStars(
                        event.target
                          .checked
                      )
                    }
                  />
                  4★+
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      onlyRated
                    }
                    onChange={(
                      event
                    ) =>
                      setOnlyRated(
                        event.target
                          .checked
                      )
                    }
                  />
                  Opiniones
                </label>
              </div>
            </div>
          </div>

          {message && (
            <p className="categorybusiness12-message">
              {message}
            </p>
          )}
        </div>
      </section>

      <div className="categorybusiness12-meta">
        {
          visibleBusinesses.length
        }{" "}
        {visibleBusinesses.length ===
        1
          ? "negocio"
          : "negocios"}
      </div>

      {visibleBusinesses.length >
      0 ? (
        <div className="categorybusiness12-cards">
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

                  nextAvailableAt:
                    business.nextAvailableAt,
                }}
              />
            )
          )}
        </div>
      ) : (
        <div className="panel categorybusiness12-empty">
          <SlidersHorizontal
            size={24}
            strokeWidth={2}
            aria-hidden="true"
          />

          <h3>
            No hay negocios que coincidan con los filtros
          </h3>

          <p className="muted">
            Prueba a ampliar la distancia o quitar alguno de los filtros.
          </p>
        </div>
      )}

      <style jsx>{`
        .categorybusiness12-tools {
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

        .categorybusiness12-search {
          min-width: 0;
        }

        .categorybusiness12-filters {
          min-width: 0;
          padding-left: 18px;
          border-left: 1px solid #efedf2;
        }

        .categorybusiness12-filter-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .categorybusiness12-filter-head > div {
          display: grid;
          gap: 1px;
        }

        .categorybusiness12-filter-head span {
          color: var(--muted);
          font-size: 11px;
        }

        .categorybusiness12-filter-head strong {
          font-size: 15px;
        }

        .categorybusiness12-filter-head button {
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--accent-dark);
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }

        .categorybusiness12-filter-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
          gap: 9px;
        }

        .categorybusiness12-filter-grid > div {
          min-width: 0;
        }

        .categorybusiness12-filter-grid > div > label {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10.5px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .categorybusiness12-location,
        .categorybusiness12-filter-grid select {
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

        .categorybusiness12-location {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 5px;
          padding: 0 8px;
          cursor: pointer;
        }

        .categorybusiness12-location.is-active {
          border-color: #c9bfff;
          background: #f4f1ff;
          color: var(--accent-dark);
        }

        .categorybusiness12-filter-grid select {
          padding: 0 8px;
        }

        .categorybusiness12-checks {
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .categorybusiness12-checks label {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 5px 6px;
          border: 1px solid #e6e2eb;
          border-radius: 999px;
          background: #faf9fc;
          color: #413d49;
          font-size: 10.5px;
          font-weight: 750;
          cursor: pointer;
        }

        .categorybusiness12-checks input {
          width: 11px;
          height: 11px;
          margin: 0;
          accent-color: var(--accent);
        }

        .categorybusiness12-message {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 10.5px;
          line-height: 1.35;
        }

        .categorybusiness12-meta {
          margin: 16px 2px 9px;
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 750;
        }

        .categorybusiness12-cards {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 15px;
        }

        .categorybusiness12-empty {
          display: grid;
          place-items: center;
          min-height: 230px;
          padding: 28px;
          text-align: center;
        }

        @media (max-width: 980px) {
          .categorybusiness12-tools {
            grid-template-columns:
              minmax(0,1fr);
          }

          .categorybusiness12-filters {
            padding-top: 14px;
            padding-left: 0;
            border-top: 1px solid #efedf2;
            border-left: 0;
          }
        }

        @media (max-width: 760px) {
          .categorybusiness12-filter-grid,
          .categorybusiness12-cards {
            grid-template-columns:
              minmax(0,1fr);
          }
        }
      `}</style>
    </div>
  );
}
