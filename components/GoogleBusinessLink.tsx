"use client";

import { useState } from "react";

type Candidate = {
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string | null;
};

type GooglePlaceData = {
    name: string | null;
    formattedAddress: string | null;
    addressLines: string[];
    city: string | null;
    postalCode: string | null;
    phone: string | null;
    website: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  
  type Props = {
    businessId: string;
    initialGooglePlaceId: string | null;
    initialShowGoogleReviews: boolean;
  
    onImportGoogleData?: (
      data: GooglePlaceData
    ) => void;
  };

  export default function GoogleBusinessLink({
    businessId,
    initialGooglePlaceId,
    initialShowGoogleReviews,
    onImportGoogleData,
  }: Props) {
  const [
    googlePlaceId,
    setGooglePlaceId,
  ] = useState(
    initialGooglePlaceId
  );

  const [
    showGoogleReviews,
    setShowGoogleReviews,
  ] = useState(
    initialShowGoogleReviews
  );

  const [
    candidates,
    setCandidates,
  ] = useState<Candidate[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isError,
    setIsError,
  ] = useState(false);

  async function searchGoogle() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    const response = await fetch(
      "/api/google/place",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          businessId,
        }),
      }
    );

    const result =
      await response.json();

      if (!response.ok) {
        setMessage(
          result.details ??
            result.error ??
            "No se pudo buscar el negocio en Google."
        );
      
        setIsError(true);
        setLoading(false);
        return;
      }

    const results =
      result.candidates ?? [];

    setCandidates(results);

    if (results.length === 0) {
      setMessage(
        "No hemos encontrado coincidencias en Google Maps."
      );
    }

    setLoading(false);
  }
  async function importGoogleData() {
    if (!googlePlaceId) {
      return;
    }
  
    setLoading(true);
    setMessage("");
    setIsError(false);
  
    const response = await fetch(
      "/api/google/place/details",
      {
        method: "POST",
  
        headers: {
          "Content-Type":
            "application/json",
        },
  
        body: JSON.stringify({
          placeId:
            googlePlaceId,
        }),
      }
    );
  
    const result =
      await response.json();
  
    if (!response.ok) {
      setMessage(
        result.details ??
          result.error ??
          "No se pudieron obtener los datos de Google."
      );
  
      setIsError(true);
      setLoading(false);
      return;
    }
  
    if (
      result.place &&
      onImportGoogleData
    ) {
      onImportGoogleData(
        result.place
      );
    }
  
    setMessage(
      "Datos de Google cargados en el formulario. Revisa los cambios y pulsa Guardar cambios."
    );
  
    setLoading(false);
  }
  async function linkCandidate(
    candidate: Candidate
  ) {
    setLoading(true);
    setMessage("");
    setIsError(false);

    const response = await fetch(
      "/api/google/place/link",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          businessId,
          googlePlaceId:
            candidate.placeId,
          showGoogleReviews:
            true,
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      setMessage(
        result.error ??
          "No se pudo vincular el negocio."
      );

      setIsError(true);
      setLoading(false);
      return;
    }

    setGooglePlaceId(
      candidate.placeId
    );

    setShowGoogleReviews(
      true
    );

    setCandidates([]);

    setMessage(
      "Negocio vinculado con Google Maps correctamente."
    );

    setLoading(false);
  }

  async function updateVisibility(
    checked: boolean
  ) {
    setShowGoogleReviews(
      checked
    );

    if (!googlePlaceId) {
      return;
    }

    const response = await fetch(
      "/api/google/place/link",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          businessId,
          googlePlaceId,
          showGoogleReviews:
            checked,
        }),
      }
    );

    if (!response.ok) {
      const result =
        await response.json();

      setMessage(
        result.error ??
          "No se pudo actualizar la visibilidad."
      );

      setIsError(true);
    }
  }

  async function unlinkGoogle() {
    const confirmed =
      window.confirm(
        "¿Desvincular este negocio de Google Maps?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    const response = await fetch(
      "/api/google/place/link",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          businessId,
          googlePlaceId: null,
          showGoogleReviews:
            false,
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      setMessage(
        result.error ??
          "No se pudo desvincular Google Maps."
      );

      setIsError(true);
      setLoading(false);
      return;
    }

    setGooglePlaceId(null);
    setShowGoogleReviews(false);
    setCandidates([]);

    setMessage(
      "Google Maps desvinculado correctamente."
    );

    setLoading(false);
  }

  return (
    <div
      style={{
        marginTop: 28,
        paddingTop: 24,
        borderTop:
          "1px solid var(--border)",
      }}
    >
      <h2>
        Google Maps
      </h2>

      <p className="muted">
        Vincula opcionalmente tu ficha de
        Google para mostrar su valoración
        pública en Slottye.
      </p>

      {!googlePlaceId ? (
        <>
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={searchGoogle}
          >
            {loading
              ? "Buscando..."
              : "Buscar mi negocio en Google"}
          </button>

          {candidates.length >
            0 && (
            <div
              style={{
                display: "grid",
                gap: 12,
                marginTop: 18,
              }}
            >
              {candidates.map(
                (candidate) => (
                  <div
                    className="card"
                    key={
                      candidate.placeId
                    }
                  >
                    <div className="card-body">
                      <strong>
                        {
                          candidate.name
                        }
                      </strong>

                      <div
                        className="muted"
                        style={{
                          marginTop: 6,
                        }}
                      >
                        {
                          candidate.address
                        }
                      </div>

                      {candidate.rating !==
                        null && (
                        <div
                          style={{
                            marginTop: 8,
                          }}
                        >
                          ⭐{" "}
                          {candidate.rating.toFixed(
                            1
                          )}
                          {" · "}
                          {
                            candidate.reviewCount
                          }{" "}
                          reseñas
                        </div>
                      )}

                      {candidate.googleMapsUrl && (
                        <a
                          href={
                            candidate.googleMapsUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="muted"
                          style={{
                            display:
                              "inline-block",
                            marginTop: 8,
                          }}
                        >
                          Ver en Google Maps
                        </a>
                      )}

                      <div
                        style={{
                          marginTop: 12,
                        }}
                      >
                        <button
                          type="button"
                          className="btn primary"
                          disabled={
                            loading
                          }
                          onClick={() =>
                            linkCandidate(
                              candidate
                            )
                          }
                        >
                          Vincular este negocio
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              padding: 14,
              border:
                "1px solid var(--border)",
              borderRadius: 14,
            }}
          >
            <strong>
              ✓ Google Maps conectado
            </strong>

            <div
              className="muted"
              style={{
                marginTop: 5,
              }}
            >
              Place ID:{" "}
              {googlePlaceId}
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
            }}
          >
            <input
              type="checkbox"
              checked={
                showGoogleReviews
              }
              onChange={(event) =>
                updateVisibility(
                  event.target.checked
                )
              }
            />

            Mostrar valoración de Google
            en mi ficha pública
          </label>
           
          <button
  type="button"
  className="btn primary"
  disabled={loading}
  onClick={importGoogleData}
  style={{
    marginTop: 16,
    marginRight: 10,
  }}
>
  {loading
    ? "Cargando..."
    : "Cargar datos desde Google"}
</button>

          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={unlinkGoogle}
            style={{
              marginTop: 16,
            }}
          >
            Desvincular Google Maps
          </button>
        </>
      )}

      {message && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding:
              "12px 14px",
            borderRadius: 12,
            background:
              isError
                ? "#fef2f2"
                : "#f0fdf4",
            border:
              isError
                ? "1px solid #fecaca"
                : "1px solid #bbf7d0",
            color:
              isError
                ? "#b91c1c"
                : "#166534",
            fontWeight: 600,
          }}
        >
          {isError
            ? "⚠️ "
            : "✓ "}
          {message}
        </div>
      )}
    </div>
  );
}