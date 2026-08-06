"use client";

import {
  FormEvent,
  useState,
} from "react";

import BusinessLocationMap from "@/components/BusinessLocationMap";

type Business = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;

  google_place_id: string | null;
  show_google_reviews: boolean;

  min_booking_notice_hours: number;
  max_booking_advance_days: number;
  allow_cancellations: boolean;
  min_cancellation_notice_hours: number;
};

type Props = {
  business: Business;
};

export default function AdminBusinessEditForm({
  business,
}: Props) {
  const [
    name,
    setName,
  ] =
    useState(
      business.name
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      business.description ??
      ""
    );

  const [
    address,
    setAddress,
  ] =
    useState(
      business.address ??
      ""
    );

  const [
    city,
    setCity,
  ] =
    useState(
      business.city ??
      ""
    );

  const [
    postalCode,
    setPostalCode,
  ] =
    useState(
      business.postal_code ??
      ""
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      business.phone ??
      ""
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      business.email ??
      ""
    );

  const [
    website,
    setWebsite,
  ] =
    useState(
      business.website ??
      ""
    );

  const [
    latitude,
    setLatitude,
  ] =
    useState<
      number |
      null
    >(
      business.latitude
    );

  const [
    longitude,
    setLongitude,
  ] =
    useState<
      number |
      null
    >(
      business.longitude
    );

  const [
    googlePlaceId,
    setGooglePlaceId,
  ] =
    useState(
      business.google_place_id ??
      ""
    );

  const [
    showGoogleReviews,
    setShowGoogleReviews,
  ] =
    useState(
      business.show_google_reviews
    );

  const [
    minBookingNoticeHours,
    setMinBookingNoticeHours,
  ] =
    useState(
      business.min_booking_notice_hours
    );

  const [
    maxBookingAdvanceDays,
    setMaxBookingAdvanceDays,
  ] =
    useState(
      business.max_booking_advance_days
    );

  const [
    allowCancellations,
    setAllowCancellations,
  ] =
    useState(
      business.allow_cancellations
    );

  const [
    minCancellationNoticeHours,
    setMinCancellationNoticeHours,
  ] =
    useState(
      business.min_cancellation_notice_hours
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    geocoding,
    setGeocoding,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  async function locateAddress() {
    if (
      !address.trim() ||
      !city.trim()
    ) {
      setErrorMessage(
        "Introduce al menos la dirección y la ciudad."
      );

      return;
    }

    setGeocoding(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response =
        await fetch(
          "/api/geocode",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                address:
                  address.trim(),

                city:
                  city.trim(),

                postalCode:
                  postalCode.trim(),
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error ??
            "No se pudo localizar la dirección."
        );

        return;
      }

      setLatitude(
        result.latitude
      );

      setLongitude(
        result.longitude
      );

      setMessage(
        `Ubicación encontrada: ${result.formattedAddress}`
      );
    } catch {
      setErrorMessage(
        "No se pudo conectar con el servicio de mapas."
      );
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${business.id}/edit`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,
                description,
                address,
                city,
                postalCode,
                phone,
                email,
                website,
                latitude,
                longitude,

                googlePlaceId,
                showGoogleReviews,

                minBookingNoticeHours,
                maxBookingAdvanceDays,
                allowCancellations,
                minCancellationNoticeHours,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error ??
            "No se han podido guardar los cambios."
        );

        return;
      }

      setMessage(
        "Datos y políticas actualizados correctamente."
      );
    } catch (error) {
      console.error(
        "Error updating business as admin:",
        error
      );

      setErrorMessage(
        "No se han podido guardar los cambios."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      style={{
        display:
          "grid",

        gap:
          16,

        marginTop:
          28,
      }}
    >
      <label>
        <strong>
          Nombre del negocio
        </strong>

        <input
          required
          value={
            name
          }
          onChange={(
            event
          ) =>
            setName(
              event.target.value
            )
          }
          style={
            inputStyle
          }
        />
      </label>

      <label>
        <strong>
          Descripción
        </strong>

        <textarea
          value={
            description
          }
          onChange={(
            event
          ) =>
            setDescription(
              event.target.value
            )
          }
          rows={5}
          style={{
            ...inputStyle,

            resize:
              "vertical",
          }}
        />
      </label>

      <label>
        <strong>
          Dirección
        </strong>

        <input
          value={
            address
          }
          onChange={(
            event
          ) =>
            setAddress(
              event.target.value
            )
          }
          style={
            inputStyle
          }
        />
      </label>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "minmax(0, 1fr) minmax(130px, 180px)",

          gap:
            12,
        }}
      >
        <label>
          <strong>
            Ciudad
          </strong>

          <input
            value={
              city
            }
            onChange={(
              event
            ) =>
              setCity(
                event.target.value
              )
            }
            style={
              inputStyle
            }
          />
        </label>

        <label>
          <strong>
            Código postal
          </strong>

          <input
            value={
              postalCode
            }
            onChange={(
              event
            ) =>
              setPostalCode(
                event.target.value
              )
            }
            style={
              inputStyle
            }
          />
        </label>
      </div>

      <div>
        <button
          type="button"
          className="btn"
          disabled={
            geocoding
          }
          onClick={
            locateAddress
          }
        >
          {geocoding
            ? "Localizando..."
            : "📍 Localizar en el mapa"}
        </button>
      </div>

      {latitude !==
        null &&
        longitude !==
          null && (
        <div>
          <BusinessLocationMap
            latitude={
              latitude
            }
            longitude={
              longitude
            }
            onChange={(
              newLatitude,
              newLongitude
            ) => {
              setLatitude(
                newLatitude
              );

              setLongitude(
                newLongitude
              );
            }}
          />

          <div
            className="muted"
            style={{
              marginTop:
                8,

              fontSize:
                13,
            }}
          >
            📍 Ubicación:{" "}
            {latitude.toFixed(
              6
            )}
            ,{" "}
            {longitude.toFixed(
              6
            )}
          </div>
        </div>
      )}

      <label>
        <strong>
          Teléfono
        </strong>

        <input
          type="tel"
          value={
            phone
          }
          onChange={(
            event
          ) =>
            setPhone(
              event.target.value
            )
          }
          style={
            inputStyle
          }
        />
      </label>

      <label>
        <strong>
          Email de contacto
        </strong>

        <input
          type="email"
          value={
            email
          }
          onChange={(
            event
          ) =>
            setEmail(
              event.target.value
            )
          }
          style={
            inputStyle
          }
        />
      </label>

      <label>
        <strong>
          Página web
        </strong>

        <input
          type="url"
          value={
            website
          }
          onChange={(
            event
          ) =>
            setWebsite(
              event.target.value
            )
          }
          placeholder="https://..."
          style={
            inputStyle
          }
        />
      </label>

      <div
        style={{
          marginTop:
            12,

          paddingTop:
            24,

          borderTop:
            "1px solid var(--border)",

          display:
            "grid",

          gap:
            16,
        }}
      >
        <div>
          <h2>
            Google Business
          </h2>

          <p className="muted">
            Consulta o corrige la vinculación actual con Google.
          </p>
        </div>

        <label>
          <strong>
            Google Place ID
          </strong>

          <input
            value={
              googlePlaceId
            }
            onChange={(
              event
            ) =>
              setGooglePlaceId(
                event.target.value
              )
            }
            placeholder="ChIJ..."
            style={
              inputStyle
            }
          />
        </label>

        <label
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              8,
          }}
        >
          <input
            type="checkbox"
            checked={
              showGoogleReviews
            }
            onChange={(
              event
            ) =>
              setShowGoogleReviews(
                event.target.checked
              )
            }
          />

          Mostrar reseñas de Google en la ficha pública
        </label>
      </div>

      <div
        style={{
          marginTop:
            12,

          paddingTop:
            24,

          borderTop:
            "1px solid var(--border)",

          display:
            "grid",

          gap:
            16,
        }}
      >
        <div>
          <h2>
            Política de reservas
          </h2>

          <p className="muted">
            Configura con cuánta antelación pueden reservar y cancelar los clientes.
          </p>
        </div>

        <label>
          <strong>
            Antelación mínima para reservar
          </strong>

          <input
            type="number"
            min={0}
            max={8760}
            value={
              minBookingNoticeHours
            }
            onChange={(
              event
            ) =>
              setMinBookingNoticeHours(
                Number(
                  event.target.value
                )
              )
            }
            style={
              inputStyle
            }
          />

          <div
            className="muted"
            style={{
              marginTop:
                6,
            }}
          >
            Horas antes de la cita.
          </div>
        </label>

        <label>
          <strong>
            Máxima antelación para reservar
          </strong>

          <input
            type="number"
            min={1}
            max={3650}
            value={
              maxBookingAdvanceDays
            }
            onChange={(
              event
            ) =>
              setMaxBookingAdvanceDays(
                Number(
                  event.target.value
                )
              )
            }
            style={
              inputStyle
            }
          />

          <div
            className="muted"
            style={{
              marginTop:
                6,
            }}
          >
            Días hacia el futuro.
          </div>
        </label>

        <label
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              8,
          }}
        >
          <input
            type="checkbox"
            checked={
              allowCancellations
            }
            onChange={(
              event
            ) =>
              setAllowCancellations(
                event.target.checked
              )
            }
          />

          Permitir que el cliente cancele su cita
        </label>

        {allowCancellations && (
          <label>
            <strong>
              Antelación mínima para cancelar
            </strong>

            <input
              type="number"
              min={0}
              max={8760}
              value={
                minCancellationNoticeHours
              }
              onChange={(
                event
              ) =>
                setMinCancellationNoticeHours(
                  Number(
                    event.target.value
                  )
                )
              }
              style={
                inputStyle
              }
            />

            <div
              className="muted"
              style={{
                marginTop:
                  6,
              }}
            >
              Horas antes de la cita.
            </div>
          </label>
        )}
      </div>

      <button
        type="submit"
        className="btn primary"
        disabled={
          loading
        }
      >
        {loading
          ? "Guardando..."
          : "Guardar datos y políticas"}
      </button>

      {message && (
        <div
          style={{
            padding:
              "14px 16px",

            borderRadius:
              12,

            border:
              "1px solid #bbf7d0",

            background:
              "#f0fdf4",

            color:
              "#166534",
          }}
        >
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding:
              "14px 16px",

            borderRadius:
              12,

            border:
              "1px solid #fecaca",

            background:
              "#fef2f2",

            color:
              "#b91c1c",
          }}
        >
          {errorMessage}
        </div>
      )}
    </form>
  );
}

const inputStyle = {
  width:
    "100%",

  padding:
    14,

  border:
    "1px solid var(--border)",

  borderRadius:
    14,

  marginTop:
    8,

  background:
    "var(--card)",

  color:
    "var(--text)",

  font:
    "inherit",
};