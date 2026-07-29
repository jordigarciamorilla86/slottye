"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type GoogleCandidate = {
  placeId: string;

  name: string;

  formattedAddress: string;

  address: string;

  city: string;

  postalCode: string;

  phone: string;

  website: string;

  latitude: number | null;

  longitude: number | null;

  rating: number | null;

  reviewCount: number;

  googleMapsUrl: string | null;

  /*
   * Tipos devueltos por Google Places.
   * Los usamos para sugerir la categoría.
   */
  types: string[];
};

type Props = {
  categories: Category[];
};

/*
 * ============================================================
 * SLUG
 * ============================================================
 */

function createSlug(
  value: string
) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

/*
 * ============================================================
 * CATEGORÍA AUTOMÁTICA DESDE GOOGLE
 * ============================================================
 */

function suggestCategoryId(
  googleTypes: string[],
  categories: Category[]
) {
  /*
   * Estos nombres deben corresponder
   * con las categorías reales que tengas
   * en Supabase.
   *
   * Si no encontramos coincidencia,
   * usamos "Otros".
   */

  const rules: {
    googleTypes: string[];
    categoryNames: string[];
  }[] = [
    /*
     * DENTISTAS
     */
    {
      googleTypes: [
        "dentist",
        "dental_clinic",
      ],

      categoryNames: [
        "Dentistas",
        "Dentista",
        "Dental",
      ],
    },

    /*
     * PELUQUERÍA / BELLEZA
     */
    {
      googleTypes: [
        "hair_salon",
        "beauty_salon",
        "barber_shop",
        "beautician",
      ],

      categoryNames: [
        "Peluquerías",
        "Peluquería",
        "Belleza",
        "Estética",
      ],
    },

    /*
     * FISIOTERAPIA
     */
    {
      googleTypes: [
        "physiotherapist",
        "physical_therapy",
        "physical_therapist",
      ],

      categoryNames: [
        "Fisioterapia",
        "Fisioterapeutas",
        "Fisioterapeuta",
      ],
    },

    /*
     * PSICOLOGÍA
     */
    {
      googleTypes: [
        "psychologist",
        "psychotherapist",
      ],

      categoryNames: [
        "Psicología",
        "Psicólogos",
        "Psicólogo",
      ],
    },

    /*
     * MÉDICOS / CLÍNICAS
     */
    {
      googleTypes: [
        "doctor",
        "medical_clinic",
        "medical_center",
        "health",
      ],

      categoryNames: [
        "Clínicas",
        "Clínica",
        "Salud",
        "Médicos",
        "Médico",
      ],
    },

    /*
     * VETERINARIA
     */
    {
      googleTypes: [
        "veterinary_care",
        "veterinarian",
        "animal_hospital",
      ],

      categoryNames: [
        "Veterinarios",
        "Veterinaria",
        "Veterinario",
      ],
    },

    /*
     * SPA / MASAJES
     */
    {
      googleTypes: [
        "spa",
        "massage",
        "massage_therapist",
      ],

      categoryNames: [
        "Spa",
        "Bienestar",
        "Masajes",
      ],
    },

    /*
     * GIMNASIOS / DEPORTE
     */
    {
      googleTypes: [
        "gym",
        "fitness_center",
        "personal_trainer",
      ],

      categoryNames: [
        "Gimnasios",
        "Gimnasio",
        "Deporte",
        "Fitness",
      ],
    },

    /*
     * PODÓLOGOS
     */
    {
      googleTypes: [
        "podiatrist",
      ],

      categoryNames: [
        "Podología",
        "Podólogos",
        "Podólogo",
      ],
    },

    /*
     * ÓPTICAS
     */
    {
      googleTypes: [
        "optician",
        "optometrist",
      ],

      categoryNames: [
        "Ópticas",
        "Óptica",
        "Optometría",
      ],
    },

    /*
     * RESTAURANTES
     *
     * Por si en el futuro Slottye
     * también ofrece reservas
     * de restauración.
     */
    {
      googleTypes: [
        "restaurant",
        "cafe",
      ],

      categoryNames: [
        "Restaurantes",
        "Restaurante",
      ],
    },
  ];

  const normalizedTypes =
    googleTypes.map(
      (type) =>
        type
          .trim()
          .toLowerCase()
    );

  /*
   * Buscamos una regla compatible
   * con los types devueltos por Google.
   */
  for (const rule of rules) {
    const matchesGoogleType =
      rule.googleTypes.some(
        (type) =>
          normalizedTypes.includes(
            type.toLowerCase()
          )
      );

    if (!matchesGoogleType) {
      continue;
    }

    const matchingCategory =
      categories.find(
        (category) => {
          const categoryName =
            category.name
              .trim()
              .toLowerCase();

          return (
            rule.categoryNames.some(
              (name) =>
                name
                  .trim()
                  .toLowerCase() ===
                categoryName
            )
          );
        }
      );

    if (matchingCategory) {
      return {
        categoryId:
          matchingCategory.id,

        automatic: true,
      };
    }
  }

  /*
   * No sabemos identificarlo:
   * usamos Otros.
   */
  const otherCategory =
    categories.find(
      (category) =>
        category.name
          .trim()
          .toLowerCase() ===
        "otros"
    );

  return {
    categoryId:
      otherCategory?.id ??
      "",

    automatic: false,
  };
}

export default function CreateBusinessForm({
  categories,
}: Props) {
  const router =
    useRouter();

  const supabase =
    createClient();

  /*
   * ============================================================
   * DATOS DEL NEGOCIO
   * ============================================================
   */

  const [name, setName] =
    useState("");

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    address,
    setAddress,
  ] = useState("");

  const [city, setCity] =
    useState("");

  const [
    postalCode,
    setPostalCode,
  ] = useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    website,
    setWebsite,
  ] = useState("");

  const [
    latitude,
    setLatitude,
  ] = useState<
    number | null
  >(null);

  const [
    longitude,
    setLongitude,
  ] = useState<
    number | null
  >(null);

  /*
   * ============================================================
   * GOOGLE
   * ============================================================
   */

  const [
    googleSearch,
    setGoogleSearch,
  ] = useState("");

  const [
    googleCandidates,
    setGoogleCandidates,
  ] = useState<
    GoogleCandidate[]
  >([]);

  const [
    googleSearching,
    setGoogleSearching,
  ] = useState(false);

  const [
    googlePlaceId,
    setGooglePlaceId,
  ] = useState<
    string | null
  >(null);

  const [
    selectedGoogleBusiness,
    setSelectedGoogleBusiness,
  ] = useState<
    GoogleCandidate | null
  >(null);

  const [
    showGoogleReviews,
    setShowGoogleReviews,
  ] = useState(true);

  /*
   * Nos sirve para informar
   * al propietario de que la
   * categoría ha sido sugerida.
   */
  const [
    categorySuggestedFromGoogle,
    setCategorySuggestedFromGoogle,
  ] = useState(false);

  /*
   * ============================================================
   * ESTADO GENERAL
   * ============================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<
    | "success"
    | "error"
    | "info"
    | null
  >(null);

  function clearMessage() {
    setMessage("");
    setMessageType(null);
  }

  function showError(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "error"
    );
  }

  function showSuccess(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "success"
    );
  }

  function showInfo(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "info"
    );
  }

  /*
   * ============================================================
   * BUSCAR EN GOOGLE
   * ============================================================
   */

  async function searchGoogleBusiness() {
    clearMessage();

    if (
      !googleSearch.trim()
    ) {
      showError(
        "Escribe el nombre o la dirección de tu negocio."
      );

      return;
    }

    setGoogleSearching(
      true
    );

    try {
      const response =
        await fetch(
          "/api/google/place/search",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                query:
                  googleSearch.trim(),
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        showError(
          result.details ??
            result.error ??
            "No se pudo buscar el negocio en Google."
        );

        setGoogleSearching(
          false
        );

        return;
      }

      const candidates =
        result.candidates ??
        [];

      setGoogleCandidates(
        candidates
      );

      if (
        candidates.length ===
        0
      ) {
        showInfo(
          "No hemos encontrado ningún negocio. Puedes probar otra búsqueda o rellenar los datos manualmente."
        );
      }
    } catch {
      showError(
        "No se ha podido conectar con Google Places."
      );
    }

    setGoogleSearching(
      false
    );
  }

  /*
   * ============================================================
   * IMPORTAR CANDIDATO
   * ============================================================
   */

  function importGoogleBusiness(
    candidate: GoogleCandidate
  ) {
    setSelectedGoogleBusiness(
      candidate
    );

    setGooglePlaceId(
      candidate.placeId
    );

    /*
     * Nombre
     */
    if (candidate.name) {
      setName(
        candidate.name
      );
    }

    /*
     * Dirección
     */
    if (
      candidate.address
    ) {
      setAddress(
        candidate.address
      );
    } else if (
      candidate.formattedAddress
    ) {
      setAddress(
        candidate.formattedAddress
      );
    }

    /*
     * Ciudad
     */
    if (candidate.city) {
      setCity(
        candidate.city
      );
    }

    /*
     * CP
     */
    if (
      candidate.postalCode
    ) {
      setPostalCode(
        candidate.postalCode
      );
    }

    /*
     * Teléfono
     */
    if (candidate.phone) {
      setPhone(
        candidate.phone
      );
    }

    /*
     * Web
     */
    if (
      candidate.website
    ) {
      setWebsite(
        candidate.website
      );
    }

    /*
     * Coordenadas
     */
    setLatitude(
      candidate.latitude
    );

    setLongitude(
      candidate.longitude
    );

    /*
     * ==========================================================
     * CATEGORÍA AUTOMÁTICA
     * ==========================================================
     */

    const categorySuggestion =
      suggestCategoryId(
        candidate.types ??
          [],
        categories
      );

    if (
      categorySuggestion.categoryId
    ) {
      setCategoryId(
        categorySuggestion.categoryId
      );

      setCategorySuggestedFromGoogle(
        true
      );
    } else {
      setCategorySuggestedFromGoogle(
        false
      );
    }

    /*
     * Ocultamos los resultados
     * después de elegir uno.
     */
    setGoogleCandidates(
      []
    );

    if (
      categorySuggestion.automatic
    ) {
      showSuccess(
        "Datos importados desde Google y categoría sugerida automáticamente. Revisa la información y modifica lo que quieras antes de crear el negocio."
      );
    } else if (
      categorySuggestion.categoryId
    ) {
      showSuccess(
        'Datos importados desde Google. No hemos podido identificar una categoría concreta, así que hemos seleccionado "Otros". Puedes cambiarla antes de crear el negocio.'
      );
    } else {
      showSuccess(
        "Datos importados desde Google. Revisa la información y selecciona una categoría antes de crear el negocio."
      );
    }
  }

  /*
   * ============================================================
   * DESVINCULAR GOOGLE
   * ============================================================
   */

  function removeGoogleLink() {
    setGooglePlaceId(
      null
    );

    setSelectedGoogleBusiness(
      null
    );

    setShowGoogleReviews(
      false
    );

    setCategorySuggestedFromGoogle(
      false
    );

    /*
     * IMPORTANTE:
     *
     * No borramos nombre, teléfono,
     * dirección, etc.
     *
     * Pueden haberse modificado
     * manualmente después de importar.
     */
    showInfo(
      "Se ha eliminado la vinculación con Google. Los datos del formulario no se han borrado."
    );
  }

  /*
   * ============================================================
   * CREAR NEGOCIO
   * ============================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessage();

    if (!name.trim()) {
      showError(
        "Introduce el nombre del negocio."
      );

      return;
    }

    if (!categoryId) {
      showError(
        "Selecciona una categoría."
      );

      return;
    }

    if (!address.trim()) {
      showError(
        "Introduce la dirección."
      );

      return;
    }

    if (!city.trim()) {
      showError(
        "Introduce la ciudad."
      );

      return;
    }

    setLoading(true);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setLoading(false);

      router.push(
        "/login"
      );

      return;
    }

    const baseSlug =
      createSlug(name);

    const slug =
      `${baseSlug}-${crypto.randomUUID().slice(
        0,
        6
      )}`;

    const { error } =
      await supabase
        .from(
          "businesses"
        )
        .insert({
          owner_id:
            user.id,

          category_id:
            categoryId,

          name:
            name.trim(),

          slug,

          description:
            description.trim() ||
            null,

          address:
            address.trim(),

          city:
            city.trim(),

          postal_code:
            postalCode.trim() ||
            null,

          phone:
            phone.trim() ||
            null,

          email:
            email.trim() ||
            null,

          website:
            website.trim() ||
            null,

          latitude,

          longitude,

          /*
           * Google queda vinculado
           * desde la creación.
           */
          google_place_id:
            googlePlaceId,

          show_google_reviews:
            !!googlePlaceId &&
            showGoogleReviews,

          active: true,
        });

    if (error) {
      showError(
        error.message
      );

      setLoading(false);

      return;
    }

    router.push(
      "/business-dashboard"
    );

    router.refresh();
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      style={{
        display: "grid",
        gap: 12,
        marginTop: 24,
      }}
    >
      {/* ======================================================
          GOOGLE
          ====================================================== */}

      <div
        style={{
          padding: 18,

          border:
            "1px solid var(--border)",

          borderRadius: 16,

          marginBottom: 12,
        }}
      >
        <div className="kicker">
          Opcional
        </div>

        <h2
          style={{
            marginTop: 6,
          }}
        >
          Importar desde Google Maps
        </h2>

        <p className="muted">
          Si tu negocio ya aparece
          en Google, podemos rellenar
          automáticamente el nombre,
          dirección, ciudad, código
          postal, teléfono, web,
          ubicación y sugerir una
          categoría.
        </p>

        <p className="muted">
          Después podrás modificar
          cualquier dato antes de
          crear la ficha.
        </p>

        {!googlePlaceId ? (
          <>
            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "minmax(0, 1fr) auto",

                gap: 10,

                marginTop: 16,
              }}
            >
              <input
                type="text"

                value={
                  googleSearch
                }

                onChange={(e) =>
                  setGoogleSearch(
                    e.target
                      .value
                  )
                }

                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    e.preventDefault();

                    searchGoogleBusiness();
                  }
                }}

                placeholder="Ej. Clínica Dental Maresme, Mataró"

                style={{
                  ...inputStyle,

                  marginTop: 0,
                }}
              />

              <button
                type="button"

                className="btn primary"

                disabled={
                  googleSearching
                }

                onClick={
                  searchGoogleBusiness
                }
              >
                {googleSearching
                  ? "Buscando..."
                  : "Buscar en Google"}
              </button>
            </div>

            {googleCandidates.length >
              0 && (
              <div
                style={{
                  display:
                    "grid",

                  gap: 12,

                  marginTop: 18,
                }}
              >
                <strong>
                  ¿Cuál es tu negocio?
                </strong>

                {googleCandidates.map(
                  (
                    candidate
                  ) => (
                    <div
                      className="card"

                      key={
                        candidate.placeId
                      }
                    >
                      <div className="card-body">
                        <strong
                          style={{
                            fontSize:
                              17,
                          }}
                        >
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
                          📍{" "}
                          {
                            candidate.formattedAddress
                          }
                        </div>

                        {candidate.phone && (
                          <div
                            className="meta"

                            style={{
                              marginTop: 8,
                            }}
                          >
                            ☎{" "}
                            {
                              candidate.phone
                            }
                          </div>
                        )}

                        {candidate.website && (
                          <div
                            className="meta"

                            style={{
                              marginTop: 6,
                            }}
                          >
                            🌐 Web disponible
                          </div>
                        )}

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

                            {candidate.reviewCount ===
                            1
                              ? "reseña"
                              : "reseñas"}{" "}

                            en Google
                          </div>
                        )}

                        <div
                          style={{
                            display:
                              "flex",

                            gap: 10,

                            flexWrap:
                              "wrap",

                            marginTop: 14,
                          }}
                        >
                          <button
                            type="button"

                            className="btn primary"

                            onClick={() =>
                              importGoogleBusiness(
                                candidate
                              )
                            }
                          >
                            Usar este negocio
                          </button>

                          {candidate.googleMapsUrl && (
                            <a
                              href={
                                candidate.googleMapsUrl
                              }

                              target="_blank"

                              rel="noreferrer"

                              className="btn"
                            >
                              Ver en Google Maps ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              marginTop: 16,
            }}
          >
            <div
              style={{
                padding: 14,

                border:
                  "1px solid #bbf7d0",

                background:
                  "#f0fdf4",

                color:
                  "#166534",

                borderRadius: 14,
              }}
            >
              <strong>
                ✓ Negocio vinculado con
                Google Maps
              </strong>

              {selectedGoogleBusiness && (
                <>
                  <div
                    style={{
                      marginTop: 7,

                      fontWeight:
                        600,
                    }}
                  >
                    {
                      selectedGoogleBusiness.name
                    }
                  </div>

                  {selectedGoogleBusiness.rating !==
                    null && (
                    <div
                      style={{
                        marginTop: 5,
                      }}
                    >
                      ⭐{" "}
                      {selectedGoogleBusiness.rating.toFixed(
                        1
                      )}
                      {" · "}
                      {
                        selectedGoogleBusiness.reviewCount
                      }{" "}
                      {selectedGoogleBusiness.reviewCount ===
                      1
                        ? "reseña"
                        : "reseñas"}
                    </div>
                  )}
                </>
              )}
            </div>

            <label
              style={{
                display: "flex",

                alignItems:
                  "center",

                gap: 8,

                marginTop: 14,
              }}
            >
              <input
                type="checkbox"

                checked={
                  showGoogleReviews
                }

                onChange={(e) =>
                  setShowGoogleReviews(
                    e.target
                      .checked
                  )
                }
              />

              Mostrar la valoración de
              Google en mi ficha pública
            </label>

            <button
              type="button"

              className="btn"

              onClick={
                removeGoogleLink
              }

              style={{
                marginTop: 14,
              }}
            >
              Desvincular Google
            </button>
          </div>
        )}
      </div>

      {/* ======================================================
          NOMBRE
          ====================================================== */}

      <label>
        <strong>
          Nombre del negocio
        </strong>

        <input
          required

          value={name}

          onChange={(e) =>
            setName(
              e.target.value
            )
          }

          placeholder="Clínica Dental Maresme"

          style={inputStyle}
        />
      </label>

      {/* ======================================================
          CATEGORÍA
          ====================================================== */}

      <label>
        <strong>
          Categoría
        </strong>

        <select
          required

          value={
            categoryId
          }

          onChange={(e) => {
            setCategoryId(
              e.target.value
            );

            /*
             * Si la cambia manualmente,
             * deja de considerarse
             * únicamente una sugerencia.
             */
            setCategorySuggestedFromGoogle(
              false
            );
          }}

          style={inputStyle}
        >
          <option value="">
            Selecciona una categoría
          </option>

          {categories.map(
            (category) => (
              <option
                key={
                  category.id
                }

                value={
                  category.id
                }
              >
                {
                  category.name
                }
              </option>
            )
          )}
        </select>

        {categorySuggestedFromGoogle &&
          googlePlaceId && (
            <div
              className="muted"

              style={{
                marginTop: 6,

                fontSize: 13,
              }}
            >
              ✨ Categoría sugerida
              automáticamente a partir
              de Google. Puedes
              cambiarla.
            </div>
          )}
      </label>

      {/* ======================================================
          DESCRIPCIÓN
          ====================================================== */}

      <label>
        <strong>
          Descripción
        </strong>

        <textarea
          value={
            description
          }

          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }

          placeholder="Describe brevemente tu negocio..."

          rows={5}

          style={{
            ...inputStyle,

            resize:
              "vertical",
          }}
        />
      </label>

      {/* ======================================================
          DIRECCIÓN
          ====================================================== */}

      <label>
        <strong>
          Dirección
        </strong>

        <input
          required

          value={
            address
          }

          onChange={(e) =>
            setAddress(
              e.target.value
            )
          }

          placeholder="Carrer de Barcelona, 25"

          style={inputStyle}
        />
      </label>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "minmax(0, 2fr) minmax(120px, 1fr)",

          gap: 12,
        }}
      >
        <label>
          <strong>
            Ciudad
          </strong>

          <input
            required

            value={city}

            onChange={(e) =>
              setCity(
                e.target
                  .value
              )
            }

            placeholder="Mataró"

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

            onChange={(e) =>
              setPostalCode(
                e.target
                  .value
              )
            }

            placeholder="08301"

            style={
              inputStyle
            }
          />
        </label>
      </div>

      {/* ======================================================
          TELÉFONO
          ====================================================== */}

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

          placeholder="937 000 000"

          style={inputStyle}
        />
      </label>

      {/* ======================================================
          EMAIL
          ====================================================== */}

      <label>
        <strong>
          Email público
        </strong>

        <input
          type="email"

          value={email}

          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }

          placeholder="info@negocio.com"

          style={inputStyle}
        />
      </label>

      {/* ======================================================
          WEB
          ====================================================== */}

      <label>
        <strong>
          Web
        </strong>

        <input
          type="url"

          value={website}

          onChange={(e) =>
            setWebsite(
              e.target.value
            )
          }

          placeholder="https://www.negocio.com"

          style={inputStyle}
        />
      </label>

      {/* ======================================================
          UBICACIÓN IMPORTADA
          ====================================================== */}

      {latitude !== null &&
        longitude !== null && (
          <div
            className="muted"

            style={{
              padding: 12,

              border:
                "1px solid var(--border)",

              borderRadius: 12,
            }}
          >
            📍 Ubicación detectada:
            {" "}
            {latitude.toFixed(
              5
            )}
            ,{" "}
            {longitude.toFixed(
              5
            )}
          </div>
        )}

      {/* ======================================================
          CREAR
          ====================================================== */}

      <button
        className="btn primary"

        disabled={loading}

        style={{
          marginTop: 8,
        }}
      >
        {loading
          ? "Creando negocio..."
          : "Crear negocio"}
      </button>

      {/* ======================================================
          MENSAJE
          ====================================================== */}

      {message && (
        <div
          role="alert"

          style={{
            marginTop: 8,

            padding:
              "12px 14px",

            borderRadius: 12,

            background:
              messageType ===
              "error"
                ? "#fef2f2"
                : messageType ===
                    "success"
                  ? "#f0fdf4"
                  : "#eff6ff",

            border:
              messageType ===
              "error"
                ? "1px solid #fecaca"
                : messageType ===
                    "success"
                  ? "1px solid #bbf7d0"
                  : "1px solid #bfdbfe",

            color:
              messageType ===
              "error"
                ? "#b91c1c"
                : messageType ===
                    "success"
                  ? "#166534"
                  : "#1d4ed8",

            fontWeight: 600,
          }}
        >
          {messageType ===
          "error"
            ? "⚠️ "
            : messageType ===
                "success"
              ? "✓ "
              : "ℹ️ "}

          {message}
        </div>
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

  background:
    "var(--card)",

  color:
    "var(--text)",

  font: "inherit",
};