"use client";

import {
  FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import BusinessLocationMap from "@/components/BusinessLocationMap";
import GoogleBusinessLink from "@/components/GoogleBusinessLink";

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
  min_booking_notice_hours: number;
  max_booking_advance_days: number;
  allow_cancellations: boolean;
  min_cancellation_notice_hours: number;
  google_place_id: string | null;
  show_google_reviews: boolean;
};

export default function BusinessEditForm({
  business,
}: {
  business: Business;
}) {
  const supabase = createClient();

  const [name, setName] =
    useState(business.name);

  const [description, setDescription] =
    useState(business.description ?? "");

  const [address, setAddress] =
    useState(business.address ?? "");

  const [city, setCity] =
    useState(business.city ?? "");

  const [postalCode, setPostalCode] =
    useState(business.postal_code ?? "");

  const [phone, setPhone] =
    useState(business.phone ?? "");

  const [email, setEmail] =
    useState(business.email ?? "");

  const [website, setWebsite] =
    useState(business.website ?? "");

  const [latitude, setLatitude] =
    useState<number | null>(
      business.latitude
    );

  const [longitude, setLongitude] =
    useState<number | null>(
      business.longitude
    );

  const [loading, setLoading] =
    useState(false);

  const [geocoding, setGeocoding] =
    useState(false);

  const [message, setMessage] =
    useState("");

    const [minBookingNoticeHours, setMinBookingNoticeHours] =
    useState(business.min_booking_notice_hours);
  
  const [maxBookingAdvanceDays, setMaxBookingAdvanceDays] =
    useState(business.max_booking_advance_days);
  
  const [allowCancellations, setAllowCancellations] =
    useState(business.allow_cancellations);
  
  const [
    minCancellationNoticeHours,
    setMinCancellationNoticeHours,
  ] = useState(
    business.min_cancellation_notice_hours
  );

  async function locateAddress() {
    if (!address.trim() || !city.trim()) {
      setMessage(
        "Introduce al menos la dirección y la ciudad."
      );
      return;
    }

    setGeocoding(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/geocode",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            address:
              address.trim(),
            city:
              city.trim(),
            postalCode:
              postalCode.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ??
            "No se pudo localizar la dirección."
        );

        setGeocoding(false);
        return;
      }

      setLatitude(data.latitude);
      setLongitude(data.longitude);

      setMessage(
        `Ubicación encontrada: ${data.formattedAddress}`
      );
    } catch {
      setMessage(
        "No se pudo conectar con el servicio de mapas."
      );
    }

    setGeocoding(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("businesses")
      .update({
        name:
          name.trim(),

        description:
          description.trim() || null,

        address:
          address.trim() || null,

        city:
          city.trim() || null,

        postal_code:
          postalCode.trim() || null,

        phone:
          phone.trim() || null,

        email:
          email.trim() || null,

        website:
          website.trim() || null,

        latitude,
        longitude,
        
        min_booking_notice_hours:
  minBookingNoticeHours,

max_booking_advance_days:
  maxBookingAdvanceDays,

allow_cancellations:
  allowCancellations,

min_cancellation_notice_hours:
  minCancellationNoticeHours,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", business.id);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Datos actualizados correctamente."
    );

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 16,
        marginTop: 28,
      }}
    >
      <label>
        <strong>
          Nombre del negocio
        </strong>

        <input
          required
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label>
        <strong>
          Descripción
        </strong>

        <textarea
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          rows={5}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
          placeholder="Describe tu negocio, especialidades, instalaciones..."
        />
      </label>

      <label>
        <strong>
          Dirección
        </strong>

        <input
          value={address}
          onChange={(e) =>
            setAddress(
              e.target.value
            )
          }
          style={inputStyle}
          placeholder="C/ Ejemplo, 25"
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 180px",
          gap: 12,
        }}
      >
        <label>
          <strong>
            Ciudad
          </strong>

          <input
            value={city}
            onChange={(e) =>
              setCity(
                e.target.value
              )
            }
            style={inputStyle}
          />
        </label>

        <label>
          <strong>
            Código postal
          </strong>

          <input
            value={postalCode}
            onChange={(e) =>
              setPostalCode(
                e.target.value
              )
            }
            style={inputStyle}
          />
        </label>
      </div>

      <div>
        <button
          type="button"
          className="btn"
          disabled={geocoding}
          onClick={locateAddress}
        >
          {geocoding
            ? "Localizando..."
            : "📍 Localizar en el mapa"}
        </button>

        <p
          className="muted"
          style={{
            marginTop: 8,
          }}
        >
          Slottye localizará automáticamente
          la dirección. Después puedes mover
          el marcador para afinar la ubicación.
        </p>
      </div>

      {latitude !== null &&
        longitude !== null && (
          <div>
            <BusinessLocationMap
              latitude={latitude}
              longitude={longitude}
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
                marginTop: 8,
                fontSize: 13,
              }}
            >
              📍 Ubicación guardada:
              {" "}
              {latitude.toFixed(6)},
              {" "}
              {longitude.toFixed(6)}
            </div>
          </div>
        )}

      <label>
        <strong>
          Teléfono
        </strong>

        <input
          type="tel"
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value
            )
          }
          style={inputStyle}
        />
      </label>

      <label>
        <strong>
          Email de contacto
        </strong>

        <input
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          style={inputStyle}
        />
      </label>

      <label>
        <strong>
          Página web
        </strong>

        <input
          type="url"
          value={website}
          onChange={(e) =>
            setWebsite(
              e.target.value
            )
          }
          style={inputStyle}
          placeholder="https://..."
        />
      </label>
      
      <div
  style={{
    marginTop: 20,
    paddingTop: 24,
    borderTop: "1px solid var(--border)",
    display: "grid",
    gap: 16,
  }}
>
  <div>
    <h2>Política de reservas</h2>

    <p className="muted">
      Configura con cuánta antelación pueden reservar
      y cancelar tus clientes.
    </p>
  </div>

  <label>
    <strong>
      Antelación mínima para reservar
    </strong>

    <input
      type="number"
      min={0}
      value={minBookingNoticeHours}
      onChange={(e) =>
        setMinBookingNoticeHours(
          Number(e.target.value)
        )
      }
      style={inputStyle}
    />

    <div
      className="muted"
      style={{ marginTop: 6 }}
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
      value={maxBookingAdvanceDays}
      onChange={(e) =>
        setMaxBookingAdvanceDays(
          Number(e.target.value)
        )
      }
      style={inputStyle}
    />

    <div
      className="muted"
      style={{ marginTop: 6 }}
    >
      Días hacia el futuro.
    </div>
  </label>

  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <input
      type="checkbox"
      checked={allowCancellations}
      onChange={(e) =>
        setAllowCancellations(
          e.target.checked
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
        value={minCancellationNoticeHours}
        onChange={(e) =>
          setMinCancellationNoticeHours(
            Number(e.target.value)
          )
        }
        style={inputStyle}
      />

      <div
        className="muted"
        style={{ marginTop: 6 }}
      >
        Horas antes de la cita.
      </div>
    </label>
  )}
</div>
      
<GoogleBusinessLink
  businessId={business.id}
  initialGooglePlaceId={
    business.google_place_id
  }
  initialShowGoogleReviews={
    business.show_google_reviews
  }
  onImportGoogleData={(data) => {
    if (data.name) {
      setName(data.name);
    }

    if (
      data.addressLines &&
      data.addressLines.length > 0
    ) {
      setAddress(
        data.addressLines.join(", ")
      );
    }

    if (data.city) {
      setCity(data.city);
    }

    if (data.postalCode) {
      setPostalCode(
        data.postalCode
      );
    }

    if (data.phone) {
      setPhone(data.phone);
    }

    if (data.website) {
      setWebsite(
        data.website
      );
    }

    if (
      data.latitude !== null
    ) {
      setLatitude(
        data.latitude
      );
    }

    if (
      data.longitude !== null
    ) {
      setLongitude(
        data.longitude
      );
    }

    setMessage(
      "Datos de Google cargados. Revisa el formulario y guarda los cambios."
    );
  }}
/>

      <button
        className="btn primary"
        disabled={loading}
      >
        {loading
          ? "Guardando..."
          : "Guardar cambios"}
      </button>

      {message && (
        <p className="muted">
          {message}
        </p>
      )}
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  border:
    "1px solid var(--border)",
  borderRadius: 14,
  marginTop: 8,
  background: "var(--card)",
  color: "var(--text)",
  font: "inherit",
};