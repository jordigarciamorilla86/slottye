"use client";

import {
  FormEvent,
  ReactNode,
  useState,
} from "react";

import {
  Building2,
  CalendarClock,
  LocateFixed,
  MapPinned,
  Save,
} from "lucide-react";

import BusinessLocationMap from "@/components/BusinessLocationMap";
import GoogleBusinessLink from "@/components/GoogleBusinessLink";

type Category = {
  id: string;
  name: string;
};

type Business = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
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
  auto_complete_bookings: boolean;
  google_place_id: string | null;
  show_google_reviews: boolean;
};

type Props = {
  business: Business;
  categories: Category[];
  imagesSection: ReactNode;
  calendarSection: ReactNode;
  saveEndpoint?: string;
  showGoogleBusinessIntegration?: boolean;
  showIntegrationsSection?: boolean;
};

export default function BusinessEditForm({
  business,
  categories,
  imagesSection,
  calendarSection,
  saveEndpoint = "/api/business/edit",
  showGoogleBusinessIntegration = true,
  showIntegrationsSection = true,
}: Props) {
  const [name, setName] =
    useState(business.name);

  const [categoryId, setCategoryId] =
    useState(
      business.category_id ?? ""
    );

  const [description, setDescription] =
    useState(
      business.description ?? ""
    );

  const [address, setAddress] =
    useState(
      business.address ?? ""
    );

  const [city, setCity] =
    useState(
      business.city ?? ""
    );

  const [postalCode, setPostalCode] =
    useState(
      business.postal_code ?? ""
    );

  const [phone, setPhone] =
    useState(
      business.phone ?? ""
    );

  const [email, setEmail] =
    useState(
      business.email ?? ""
    );

  const [website, setWebsite] =
    useState(
      business.website ?? ""
    );

  const [latitude, setLatitude] =
    useState<number | null>(
      business.latitude
    );

  const [longitude, setLongitude] =
    useState<number | null>(
      business.longitude
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
    autoCompleteBookings,
    setAutoCompleteBookings,
  ] = useState(
    business.auto_complete_bookings
  );

  const [loading, setLoading] =
    useState(false);

  const [geocoding, setGeocoding] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" |
      "error" |
      null
    >(null);


  async function locateAddress() {
    if (
      !address.trim() ||
      !city.trim()
    ) {
      setMessageType("error");
      setMessage(
        "Introduce al menos la dirección y la ciudad."
      );
      return;
    }

    setGeocoding(true);
    setMessage("");
    setMessageType(null);

    try {
      const response =
        await fetch(
          "/api/geocode",
          {
            method: "POST",
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

      const data =
        await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(
          data.error ??
            "No se pudo localizar la dirección."
        );
        return;
      }

      setLatitude(
        data.latitude
      );
      setLongitude(
        data.longitude
      );

      setMessageType("success");
      setMessage(
        `Ubicación encontrada: ${data.formattedAddress}`
      );
    } catch {
      setMessageType("error");
      setMessage(
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

    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType(null);

    try {
      const response =
        await fetch(
          saveEndpoint,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                businessId:
                  business.id,
                name:
                  name.trim(),
                categoryId,
                description:
                  description.trim(),
                address:
                  address.trim(),
                city:
                  city.trim(),
                postalCode:
                  postalCode.trim(),
                phone:
                  phone.trim(),
                email:
                  email.trim(),
                website:
                  website.trim(),
                latitude,
                longitude,
                minBookingNoticeHours,
                maxBookingAdvanceDays,
                allowCancellations,
                minCancellationNoticeHours,
                autoCompleteBookings,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(
          result.error ??
            "No se han podido guardar los cambios."
        );
        return;
      }

      setMessageType("success");
      setMessage(
        "Cambios guardados correctamente."
      );
    } catch (error) {
      console.error(
        "Error updating business:",
        error
      );

      setMessageType("error");
      setMessage(
        "No se han podido guardar los cambios."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      id="business-edit-form"
      className="bev4"
      onSubmit={handleSubmit}
    >
      {/* ======================================================
          INFORMACIÓN
          ====================================================== */}

      <section className="bev4-card">
        <div className="bev4-heading">
          <span className="bev4-icon">
            <Building2
              size={19}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="bev4-kicker">
              Información pública
            </span>

            <h2>
              Información del negocio
            </h2>

            <p>
              Datos, categoría y contacto que aparecerán en tu ficha pública.
            </p>
          </div>
        </div>

        <div className="bev4-fields bev4-fields-two">
          <label>
            <span>
              Nombre del negocio
            </span>

            <input
              required
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              Categoría
            </span>

            <select
              required
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value
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
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <label className="bev4-description">
          <span>
            Descripción
          </span>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            rows={3}
            placeholder="Describe tu negocio, especialidades, instalaciones..."
          />
        </label>

        <div className="bev4-contact">
          <div className="bev4-contact-head">
            <strong>
              Contacto
            </strong>

            <span>
              Información que podrán utilizar tus clientes.
            </span>
          </div>

          <div className="bev4-fields bev4-fields-three">
            <label>
              <span>
                Teléfono
              </span>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                Página web
              </span>

              <input
                type="url"
                value={website}
                onChange={(event) =>
                  setWebsite(
                    event.target.value
                  )
                }
                placeholder="https://..."
              />
            </label>
          </div>
        </div>
      </section>

      {/* ======================================================
          UBICACIÓN + POLÍTICAS
          ====================================================== */}

      <div className="bev4-split">
        <section className="bev4-card">
          <div className="bev4-heading">
            <span className="bev4-icon">
              <MapPinned
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="bev4-kicker">
                Ubicación
              </span>

              <h2>
                Dirección y mapa
              </h2>

              <p>
                Localiza el negocio y ajusta el marcador si necesitas más precisión.
              </p>
            </div>
          </div>

          <div className="bev4-address">
            <label>
              <span>
                Dirección
              </span>

              <input
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                placeholder="C/ Ejemplo, 25"
              />
            </label>

            <label>
              <span>
                Ciudad
              </span>

              <input
                value={city}
                onChange={(event) =>
                  setCity(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                C.P.
              </span>

              <input
                value={postalCode}
                onChange={(event) =>
                  setPostalCode(
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="bev4-location-actions">
            <button
              type="button"
              className="btn bev4-locate"
              disabled={geocoding}
              onClick={locateAddress}
            >
              <LocateFixed
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />

              {geocoding
                ? "Localizando..."
                : "Localizar dirección"}
            </button>

            {latitude !== null &&
              longitude !== null && (
                <span className="bev4-location-ok">
                  Ubicación guardada
                </span>
              )}
          </div>

          {latitude !== null &&
            longitude !== null && (
              <div className="bev4-map">
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

                <div className="bev4-coordinates">
                  Mueve el marcador para afinar la ubicación ·{" "}
                  {latitude.toFixed(6)},{" "}
                  {longitude.toFixed(6)}
                </div>
              </div>
            )}
        </section>

        <section
          id="booking-policies"
          className="bev4-card bev4-policy-card"
        >
          <div className="bev4-heading">
            <span className="bev4-icon">
              <CalendarClock
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="bev4-kicker">
                Reservas
              </span>

              <h2>
                Política de reservas
              </h2>

              <p>
                Define cuándo pueden reservar y cancelar tus clientes.
              </p>
            </div>
          </div>

          <div className="bev4-policy-grid">
            <label className="bev4-policy-row">
              <span>
                Antelación mínima

                <small>
                  Horas antes de la cita
                </small>
              </span>

              <div className="bev4-number">
                <input
                  type="number"
                  min={0}
                  value={minBookingNoticeHours}
                  onChange={(event) =>
                    setMinBookingNoticeHours(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />

                <em>
                  h
                </em>
              </div>
            </label>

            <label className="bev4-policy-row">
              <span>
                Máxima antelación

                <small>
                  Días hacia el futuro
                </small>
              </span>

              <div className="bev4-number">
                <input
                  type="number"
                  min={1}
                  value={maxBookingAdvanceDays}
                  onChange={(event) =>
                    setMaxBookingAdvanceDays(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />

                <em>
                  días
                </em>
              </div>
            </label>

            <label className="bev4-toggle">
              <span>
                <strong>
                  Permitir cancelaciones
                </strong>

                <small>
                  El cliente podrá cancelar desde su cuenta.
                </small>
              </span>

              <input
                type="checkbox"
                checked={allowCancellations}
                onChange={(event) =>
                  setAllowCancellations(
                    event.target.checked
                  )
                }
              />
            </label>

            {allowCancellations && (
              <label className="bev4-policy-row">
                <span>
                  Límite para cancelar

                  <small>
                    Horas antes de la cita
                  </small>
                </span>

                <div className="bev4-number">
                  <input
                    type="number"
                    min={0}
                    value={minCancellationNoticeHours}
                    onChange={(event) =>
                      setMinCancellationNoticeHours(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  />

                  <em>
                    h
                  </em>
                </div>
              </label>
            )}

            <label className="bev4-toggle bev4-auto-complete">
              <span>
                <strong>
                  Completar citas automáticamente
                </strong>

                <small>
                  Activado: las citas finalizadas se completan automáticamente una vez al día. Desactivado: tendrás que completarlas manualmente.
                </small>
              </span>

              <input
                type="checkbox"
                checked={autoCompleteBookings}
                onChange={(event) =>
                  setAutoCompleteBookings(
                    event.target.checked
                  )
                }
              />
            </label>

          </div>
        </section>
      </div>

      {/* ======================================================
          IMÁGENES
          ====================================================== */}

      <section
        id="imagenes"
        className="bev4-card"
      >
        <div className="bev4-simple-heading">
          <span className="bev4-kicker">
            Imagen pública
          </span>

          <h2>
            Imágenes del negocio
          </h2>

          <p>
            Gestiona la portada y el resto de fotografías de tu ficha.
          </p>
        </div>

        <div className="bev4-images-wrap">
          {imagesSection}
        </div>
      </section>

      {/* ======================================================
          INTEGRACIONES
          ====================================================== */}

      {showIntegrationsSection && <section
        id="integraciones"
        className="bev4-card"
      >
        <div className="bev4-simple-heading">
          <span className="bev4-kicker">
            Integraciones
          </span>

          <h2>
            Servicios conectados
          </h2>

          <p>
            Centraliza aquí Google Maps y Google Calendar.
          </p>
        </div>

        <div className="bev4-integrations">
          {showGoogleBusinessIntegration && <div className="bev4-integration">
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
                  setName(
                    data.name
                  );
                }

                if (
                  data.addressLines?.length
                ) {
                  setAddress(
                    data.addressLines.join(
                      ", "
                    )
                  );
                }

                if (data.city) {
                  setCity(
                    data.city
                  );
                }

                if (data.postalCode) {
                  setPostalCode(
                    data.postalCode
                  );
                }

                if (data.phone) {
                  setPhone(
                    data.phone
                  );
                }

                if (data.website) {
                  setWebsite(
                    data.website
                  );
                }

                if (
                  data.latitude !==
                  null
                ) {
                  setLatitude(
                    data.latitude
                  );
                }

                if (
                  data.longitude !==
                  null
                ) {
                  setLongitude(
                    data.longitude
                  );
                }

                setMessageType(
                  "success"
                );

                setMessage(
                  "Datos de Google cargados. Revisa la información y guarda los cambios."
                );
              }}
            />
          </div>}

          <div className="bev4-integration">
            {calendarSection}
          </div>
        </div>
      </section>}

      {/* ======================================================
          GUARDAR
          ====================================================== */}

      <div className="bev4-save">
        <div className="bev4-save-copy">
          {message ? (
            <div
              role="alert"
              className={
                messageType ===
                  "error"
                  ? "bev4-message is-error"
                  : "bev4-message is-success"
              }
            >
              {message}
            </div>
          ) : (
            <>
              <strong>
                ¿Has terminado?
              </strong>

              <span>
                Guarda la información general, ubicación y política de reservas.
              </span>
            </>
          )}
        </div>

        <button
          type="submit"
          className="btn primary bev4-save-button"
          disabled={loading}
        >
          <Save
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          {loading
            ? "Guardando..."
            : "Guardar cambios"}
        </button>
      </div>

      <style jsx>{`
        .bev4 {
          display: grid;
          gap: 13px;
          margin-top: 13px;
        }

        .bev4-card {
          min-width: 0;
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 9px 24px
            rgba(31,27,48,.02);
        }

        .bev4-heading {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
        }

        .bev4-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .bev4-kicker {
          color: var(--accent-dark);
          font-size: 12px;
          font-weight: 850;
        }

        .bev4-heading h2,
        .bev4-simple-heading h2 {
          margin: 2px 0 2px;
          font-size: 22px;
          line-height: 1.18;
          letter-spacing: -.025em;
        }

        .bev4-heading p,
        .bev4-simple-heading p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .bev4-simple-heading {
          margin-bottom: 10px;
        }

        .bev4-fields {
          display: grid;
          gap: 9px;
        }

        .bev4-fields-two {
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
        }

        .bev4-fields-three {
          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );
        }

        .bev4 label > span {
          display: block;
          margin-bottom: 5px;
          color: #403c48;
          font-size: 13px;
          font-weight: 800;
        }

        .bev4 input,
        .bev4 textarea,
        .bev4 select {
          width: 100%;
          padding: 8px 9px;
          border: 1px solid #dedbe5;
          border-radius: 9px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .bev4 input:focus,
        .bev4 textarea:focus,
        .bev4 select:focus {
          border-color: #b9adff;
          box-shadow:
            0 0 0 3px
            rgba(112,87,245,.07);
        }

        .bev4 textarea {
          min-height: 70px;
          resize: vertical;
          line-height: 1.4;
        }

        .bev4-description {
          display: block;
          margin-top: 9px;
        }

        .bev4-contact {
          margin-top: 11px;
          padding-top: 11px;
          border-top: 1px solid #efedf2;
        }

        .bev4-contact-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 7px;
        }

        .bev4-contact-head strong {
          font-size: 13px;
        }

        .bev4-contact-head span {
          color: var(--muted);
          font-size: 12px;
        }

        .bev4-split {
          display: grid;
          grid-template-columns:
            minmax(0,1.42fr)
            minmax(360px,.98fr);
          gap: 13px;
          align-items: start;
        }

        .bev4-address {
          display: grid;
          grid-template-columns:
            minmax(0,1.45fr)
            minmax(145px,.7fr)
            90px;
          gap: 8px;
        }

        .bev4-location-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 9px;
          flex-wrap: wrap;
        }

        .bev4-locate {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 34px;
          padding: 7px 10px;
        }

        .bev4-location-ok {
          color: #2d7f53;
          font-size: 11px;
          font-weight: 750;
        }

        .bev4-map {
          max-height: 218px;
          margin-top: 9px;
          overflow: hidden;
          border: 1px solid #ebe8f0;
          border-radius: 11px;
          background: #faf9fc;
        }

        .bev4-map :global(> div:first-child) {
          height: 190px !important;
          min-height: 190px !important;
        }

        .bev4-coordinates {
          padding: 6px 8px;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bev4-policy-card {
          align-self: start;
        }

        .bev4-policy-grid {
          display: grid;
          gap: 7px;
        }

        .bev4-policy-row,
        .bev4-toggle {
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 0;
          padding: 8px 9px;
          border: 1px solid #ebe8f0;
          border-radius: 10px;
          background: #faf9fc;
        }

        .bev4-policy-row > span,
        .bev4-toggle > span {
          margin: 0 !important;
        }

        .bev4-policy-row small,
        .bev4-toggle small {
          display: block;
          margin-top: 2px;
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 500;
          line-height: 1.35;
        }

        .bev4-number {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 0 0 auto;
        }

        .bev4-number input {
          width: 58px;
          padding: 7px;
          text-align: right;
        }

        .bev4-number em {
          min-width: 22px;
          color: var(--muted);
          font-size: 10px;
          font-style: normal;
        }

        .bev4-toggle input {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
        }

        .bev4-auto-complete {
          border-color: #d8cffd;
          background: #f4f1ff;
        }

        .bev4-auto-complete strong {
          color: var(--accent-dark);
        }

        .bev4-auto-complete input {
          accent-color: var(--accent);
        }

        .bev4-images-wrap {
          width: 100%;
        }

        .bev4-integrations {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
          gap: 10px;
          align-items: stretch;
        }

        .bev4-integration {
          min-width: 0;
          height: 100%;
          padding: 12px;
          border: 1px solid #e5e1eb;
          border-radius: 12px;
          background: #fbfbfd;
        }

        .bev4-integration :global(> *) {
          height: 100%;
        }

        .bev4-save {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 12px;
          border: 1px solid #dcd8e5;
          border-radius: 13px;
          background:
            linear-gradient(
              90deg,
              #fff,
              #fbfaff
            );
          box-shadow:
            0 8px 22px
            rgba(31,27,48,.03);
        }

        .bev4-save-copy {
          min-width: 0;
        }

        .bev4-save-copy strong,
        .bev4-save-copy span {
          display: block;
        }

        .bev4-save-copy strong {
          margin-bottom: 1px;
          font-size: 12px;
        }

        .bev4-save-copy span {
          color: var(--muted);
          font-size: 12px;
        }

        .bev4-message {
          padding: 6px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 750;
        }

        .bev4-message.is-success {
          background: #edf9f1;
          color: #237549;
        }

        .bev4-message.is-error {
          background: #fff0f0;
          color: #b42318;
        }

        .bev4-save-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 156px;
          flex: 0 0 auto;
        }

        @media (max-width: 900px) {
          .bev4-split,
          .bev4-integrations {
            grid-template-columns:
              1fr;
          }


        }

        @media (max-width: 640px) {
          .bev4 {
            gap: 10px;
            margin-top: 10px;
          }

          .bev4-card {
            padding: 14px;
          }

          .bev4-fields-two,
          .bev4-fields-three,
          .bev4-address {
            grid-template-columns:
              1fr;
          }

          .bev4-contact-head {
            align-items: flex-start;
            flex-direction: column;
            gap: 2px;
          }

          .bev4-map {
            max-height: 215px;
          }

          .bev4-map :global(> div:first-child) {
            height: 185px !important;
            min-height: 185px !important;
          }

          .bev4-save {
            align-items: stretch;
            flex-direction: column;
          }

          .bev4-save-button {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
}
