"use client";

import { useState } from "react";

import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  Unlink2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui";

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

  
function GoogleMapsLogo() {
  return (
    <svg
  viewBox="0 0 24 24"
  aria-hidden="true"
  focusable="false"
>
      <path
        fill="#34A853"
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"
      />
      <path
        fill="#EA4335"
        d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13V2Z"
      />
      <path
        fill="#4285F4"
        d="M5 9a7 7 0 0 1 7-7v7H5Z"
      />
      <path
        fill="#FBBC04"
        d="M12 9v13S5 14.25 5 9h7Z"
      />
      <circle
        cx="12"
        cy="9"
        r="2.8"
        fill="#fff"
      />
      <circle
        cx="12"
        cy="9"
        r="1.3"
        fill="#4285F4"
      />
    </svg>
  );
}

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

  const [confirmUnlink, setConfirmUnlink] = useState(false);

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
    <div className="gbl10">
      <ConfirmDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title="Desvincular Google Maps"
        description="La ficha y sus valoraciones dejarán de estar vinculadas a este negocio."
        variant="warning"
        confirmLabel="Desvincular"
        pending={loading}
        onConfirm={async () => {
          await unlinkGoogle();
          setConfirmUnlink(false);
        }}
      />
      <div className="gbl10-head">
        <div className="gbl10-brand">
          <span className="gbl10-logo">
            <GoogleMapsLogo />
          </span>
          <div>
            <strong>Google Maps</strong>
            <span>Ficha, datos y valoraciones</span>
          </div>
        </div>

        <span className={googlePlaceId ? "gbl10-status is-connected" : "gbl10-status"}>
          {googlePlaceId ? (
            <>
              <CheckCircle2 size={13} strokeWidth={2.2} aria-hidden="true" />
              Conectado
            </>
          ) : (
            "No conectado"
          )}
        </span>
      </div>

      {!googlePlaceId ? (
        <>
          <p className="gbl10-copy">
            Vincula la ficha de Google del negocio para importar sus datos y,
            si quieres, mostrar sus valoraciones públicas.
          </p>

          <button
            type="button"
            className="btn gbl10-search"
            disabled={loading}
            onClick={searchGoogle}
          >
            <Search size={15} strokeWidth={2} aria-hidden="true" />
            {loading ? "Buscando..." : "Buscar mi negocio en Google"}
          </button>

          {candidates.length > 0 && (
            <div className="gbl10-candidates">
              {candidates.map((candidate) => (
                <article className="gbl10-candidate" key={candidate.placeId}>
                  <div className="gbl10-candidate-copy">
                    <strong>{candidate.name}</strong>
                    <span>{candidate.address}</span>

                    {candidate.rating !== null && (
                      <small>
                        ★ {candidate.rating.toFixed(1)} · {candidate.reviewCount} reseñas
                      </small>
                    )}
                  </div>

                  <div className="gbl10-candidate-actions">
                    {candidate.googleMapsUrl && (
                      <a
                        href={candidate.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn"
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        Ver
                      </a>
                    )}

                    <button
                      type="button"
                      className="btn primary"
                      disabled={loading}
                      onClick={() => linkCandidate(candidate)}
                    >
                      Vincular
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="gbl10-connected">
            <div>
              <strong>Ficha vinculada</strong>
              <span title={googlePlaceId}>
                Place ID · {googlePlaceId.slice(0, 18)}
                {googlePlaceId.length > 18 ? "…" : ""}
              </span>
            </div>

            <label className="gbl10-reviews">
              <input
                type="checkbox"
                checked={showGoogleReviews}
                onChange={(event) => updateVisibility(event.target.checked)}
              />
              <span>Mostrar valoraciones en la ficha pública</span>
            </label>
          </div>

          <div className="gbl10-actions">
            <button
              type="button"
              className="btn primary"
              disabled={loading}
              onClick={importGoogleData}
            >
              <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
              {loading ? "Cargando..." : "Actualizar datos"}
            </button>

            <button
              type="button"
              className="btn gbl10-unlink"
              disabled={loading}
              onClick={() => setConfirmUnlink(true)}
            >
              <Unlink2 size={15} strokeWidth={2} aria-hidden="true" />
              Desvincular
            </button>
          </div>
        </>
      )}

      {message && (
        <div
          role="alert"
          className={isError ? "gbl10-message is-error" : "gbl10-message is-success"}
        >
          {message}
        </div>
      )}

      <style jsx>{`
        .gbl10 { min-width: 0; height: 100%; display: flex; flex-direction: column; }
        .gbl10-head, .gbl10-brand, .gbl10-actions, .gbl10-candidate-actions {
          display: flex;
          align-items: center;
        }
        .gbl10-head { justify-content: space-between; gap: 10px; }
        .gbl10-brand { gap: 9px; min-width: 0; }
        .gbl10-logo {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
        
          display: flex;
          align-items: center;
          justify-content: center;
        
          padding: 0;
          overflow: hidden;
        
          border: 1px solid #e8e5ef;
          border-radius: 11px;
          background: #f8f6ff;
        }
        
        .gbl10-logo svg {
          display: block;
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          margin: 0;
        }
        .gbl10-brand strong, .gbl10-brand span { display: block; }
        .gbl10-brand strong { font-size: 15px; }
        .gbl10-brand span { margin-top: 1px; color: var(--muted); font-size: 13px; }
        .gbl10-status {
          display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto;
          padding: 4px 7px; border-radius: 999px; background: #f1eff5;
          color: #716d78; font-size: 12px; font-weight: 800;
        }
        .gbl10-status.is-connected { background: #e9f8ee; color: #237549; }
        .gbl10-copy {
          margin: 11px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5;
        }
        .gbl10-search {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 11px;
        }
        .gbl10-connected {
          display: grid;
          gap: 7px;
          margin-top: 10px;
          padding: 10px;
          border: 1px solid #ebe8f0;
          border-radius: 9px;
          background: #fff;
        }
        .gbl10-connected strong, .gbl10-connected > div > span { display: block; }
        .gbl10-connected strong { font-size: 14px; }
        .gbl10-connected > div > span {
          max-width: 100%; margin-top: 2px; color: var(--muted); font-size: 13px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gbl10-reviews {
          display: flex; align-items: center; gap: 7px; margin: 0;
          font-size: 13px; font-weight: 650;
        }
        .gbl10-reviews input { width: 15px; height: 15px; flex: 0 0 auto; }
        .gbl10-reviews span { margin: 0 !important; }
        .gbl10-actions { gap: 7px; margin-top: auto; padding-top: 9px; flex-wrap: wrap; }
        .gbl10-actions .btn, .gbl10-candidate-actions .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          min-height: 40px; padding: 8px 11px; font-size: 13px;
        }
        .gbl10-unlink { color: #b42318; }
        .gbl10-candidates { display: grid; gap: 7px; margin-top: 10px; }
        .gbl10-candidate {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 10px; border: 1px solid #ebe8f0;
          border-radius: 10px; background: #fff;
        }
        .gbl10-candidate-copy { min-width: 0; }
        .gbl10-candidate-copy strong,
        .gbl10-candidate-copy span,
        .gbl10-candidate-copy small { display: block; }
        .gbl10-candidate-copy strong { font-size: 14px; }
        .gbl10-candidate-copy span { margin-top: 2px; color: var(--muted); font-size: 13px; }
        .gbl10-candidate-copy small { margin-top: 4px; font-size: 12px; }
        .gbl10-candidate-actions { gap: 5px; flex: 0 0 auto; }
        .gbl10-message {
          margin-top: 9px; padding: 7px 8px; border-radius: 8px;
          font-size: 13px; font-weight: 700;
        }
        .gbl10-message.is-success { background: #edf9f1; color: #237549; }
        .gbl10-message.is-error { background: #fff0f0; color: #b42318; }

        @media (max-width: 560px) {
          .gbl10-candidate { align-items: stretch; flex-direction: column; }
          .gbl10-candidate-actions .btn { flex: 1; }
          .gbl10-actions .btn { flex: 1 1 140px; }
        }
      `}</style>
    </div>
  );
}
