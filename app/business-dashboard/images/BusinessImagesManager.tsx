"use client";

import {
  ChangeEvent,
  useState,
} from "react";

type BusinessImage = {
  id: string;
  image_url: string;
  position: number;
};

type Props = {
  businessId: string;
  initialImages: BusinessImage[];
};

type MessageType =
  | "success"
  | "error"
  | null;

export default function BusinessImagesManager({
  businessId,
  initialImages,
}: Props) {
  const [
    images,
    setImages,
  ] =
    useState<BusinessImage[]>(
      [...initialImages].sort(
        (
          first,
          second
        ) =>
          first.position -
          second.position
      )
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      MessageType
    >(null);

  function clearMessage() {
    setMessage("");
    setMessageType(null);
  }

  function showSuccess(
    text:
      string
  ) {
    setMessage(text);

    setMessageType(
      "success"
    );
  }

  function showError(
    text:
      string
  ) {
    setMessage(text);

    setMessageType(
      "error"
    );
  }

  /*
   * ============================================================
   * GUARDAR ORDEN
   * ============================================================
   */

  async function saveOrder(
    orderedImages:
      BusinessImage[]
  ) {
    const response =
      await fetch(
        "/api/business/images",
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              businessId,

              orderedImageIds:
                orderedImages.map(
                  (
                    image
                  ) =>
                    image.id
                ),
            }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          "No se ha podido guardar el orden."
      );
    }

    return (
      result.images ??
      []
    ) as BusinessImage[];
  }

  /*
   * ============================================================
   * SUBIR IMAGEN
   * ============================================================
   */

  async function handleUpload(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (
      !file
    ) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(
        file.type
      )
    ) {
      showError(
        "Selecciona una imagen JPG, PNG o WebP."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      5 *
        1024 *
        1024
    ) {
      showError(
        "La imagen no puede superar 5 MB."
      );

      event.target.value =
        "";

      return;
    }

    setLoading(
      true
    );

    clearMessage();

    try {
      const formData =
        new FormData();

      formData.append(
        "businessId",
        businessId
      );

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/business/images",
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido subir la imagen."
        );

        return;
      }

      setImages(
        (
          current
        ) => [
          ...current,
          result.image,
        ]
      );

      showSuccess(
        "Imagen subida correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error uploading business image:",
        error
      );

      showError(
        "No se ha podido subir la imagen."
      );
    } finally {
      event.target.value =
        "";

      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * HACER PORTADA
   * ============================================================
   */

  async function makeCover(
    image:
      BusinessImage
  ) {
    if (
      images[0]?.id ===
      image.id
    ) {
      return;
    }

    setLoading(
      true
    );

    clearMessage();

    try {
      const reordered = [
        image,

        ...images.filter(
          (
            currentImage
          ) =>
            currentImage.id !==
            image.id
        ),
      ];

      const savedImages =
        await saveOrder(
          reordered
        );

      setImages(
        savedImages
      );

      showSuccess(
        "Portada actualizada correctamente."
      );
    } catch (
      error
    ) {
      showError(
        error instanceof
          Error
          ? error.message
          : "No se pudo cambiar la portada."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * MOVER IMAGEN
   * ============================================================
   */

  async function moveImage(
    imageId:
      string,
    direction:
      | "left"
      | "right"
  ) {
    const currentIndex =
      images.findIndex(
        (
          image
        ) =>
          image.id ===
          imageId
      );

    if (
      currentIndex ===
      -1
    ) {
      return;
    }

    const targetIndex =
      direction ===
      "left"
        ? currentIndex -
          1
        : currentIndex +
          1;

    if (
      targetIndex <
        0 ||
      targetIndex >=
        images.length
    ) {
      return;
    }

    setLoading(
      true
    );

    clearMessage();

    try {
      const reordered = [
        ...images,
      ];

      [
        reordered[
          currentIndex
        ],
        reordered[
          targetIndex
        ],
      ] = [
        reordered[
          targetIndex
        ],
        reordered[
          currentIndex
        ],
      ];

      const savedImages =
        await saveOrder(
          reordered
        );

      setImages(
        savedImages
      );

      showSuccess(
        "Orden actualizado correctamente."
      );
    } catch (
      error
    ) {
      showError(
        error instanceof
          Error
          ? error.message
          : "No se pudo cambiar el orden."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * ============================================================
   * ELIMINAR IMAGEN
   * ============================================================
   */

  async function deleteImage(
    image:
      BusinessImage
  ) {
    const confirmed =
      window.confirm(
        "¿Eliminar esta imagen del negocio?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    setLoading(
      true
    );

    clearMessage();

    try {
      const response =
        await fetch(
          "/api/business/images",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,

                imageId:
                  image.id,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se ha podido eliminar la imagen."
        );

        return;
      }

      setImages(
        result.images ??
        []
      );

      if (
        result.warning
      ) {
        showError(
          result.warning
        );
      } else {
        showSuccess(
          "Imagen eliminada correctamente."
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Error deleting business image:",
        error
      );

      showError(
        "No se ha podido eliminar la imagen."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div
      style={{
        marginTop:
          28,
      }}
    >
      <label className="btn primary">
        {loading
          ? "Procesando..."
          : "📷 Subir imagen"}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={
            handleUpload
          }
          disabled={
            loading
          }
          style={{
            display:
              "none",
          }}
        />
      </label>

      <p
        className="muted"
        style={{
          marginTop:
            10,
        }}
      >
        JPG, PNG o WebP · Máximo 5 MB. La primera imagen será la portada.
      </p>

      {message && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginTop:
              16,

            padding:
              "16px 18px",

            borderRadius:
              14,

            display:
              "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            gap:
              14,

            background:
              messageType ===
              "error"
                ? "#fef2f2"
                : "#f0fdf4",

            border:
              messageType ===
              "error"
                ? "1px solid #f87171"
                : "1px solid #4ade80",

            color:
              messageType ===
              "error"
                ? "#b91c1c"
                : "#166534",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "flex-start",

              gap:
                12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize:
                  22,

                lineHeight:
                  1,
              }}
            >
              {messageType ===
              "error"
                ? "⚠️"
                : "✅"}
            </span>

            <div>
              <div
                style={{
                  fontWeight:
                    800,

                  fontSize:
                    16,

                  marginBottom:
                    4,
                }}
              >
                {messageType ===
                "error"
                  ? "No se ha podido completar la acción"
                  : "Acción completada"}
              </div>

              <div
                style={{
                  lineHeight:
                    1.5,
                }}
              >
                {message}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              clearMessage
            }
            aria-label="Cerrar mensaje"
            style={{
              border:
                0,

              background:
                "transparent",

              color:
                "inherit",

              cursor:
                "pointer",

              fontSize:
                20,

              lineHeight:
                1,

              padding:
                0,

              opacity:
                0.75,

              flexShrink:
                0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {images.length ===
      0 ? (
        <div
          className="panel"
          style={{
            marginTop:
              24,
          }}
        >
          <h3>
            Todavía no has subido imágenes
          </h3>

          <p className="muted">
            La primera imagen se utilizará como portada del negocio.
          </p>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit,minmax(240px,1fr))",

            gap:
              16,

            marginTop:
              24,
          }}
        >
          {images.map(
            (
              image,
              index
            ) => (
              <div
                className="card"
                key={
                  image.id
                }
              >
                <div
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <img
                    src={
                      image.image_url
                    }
                    alt={`Imagen ${index + 1}`}
                    style={{
                      width:
                        "100%",

                      height:
                        190,

                      objectFit:
                        "cover",

                      borderRadius:
                        "14px 14px 0 0",
                    }}
                  />

                  {index ===
                    0 && (
                    <div
                      style={{
                        position:
                          "absolute",

                        top:
                          10,

                        left:
                          10,

                        background:
                          "var(--card)",

                        border:
                          "1px solid var(--border)",

                        borderRadius:
                          999,

                        padding:
                          "6px 10px",

                        fontSize:
                          12,

                        fontWeight:
                          800,
                      }}
                    >
                      ⭐ Portada
                    </div>
                  )}
                </div>

                <div className="card-body">
                  <div
                    style={{
                      display:
                        "flex",

                      flexWrap:
                        "wrap",

                      gap:
                        8,
                    }}
                  >
                    {index !==
                      0 && (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={
                          loading
                        }
                        onClick={() =>
                          makeCover(
                            image
                          )
                        }
                      >
                        ⭐ Hacer portada
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn"
                      disabled={
                        loading ||
                        index ===
                          0
                      }
                      onClick={() =>
                        moveImage(
                          image.id,
                          "left"
                        )
                      }
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="btn"
                      disabled={
                        loading ||
                        index ===
                          images.length -
                            1
                      }
                      onClick={() =>
                        moveImage(
                          image.id,
                          "right"
                        )
                      }
                    >
                      →
                    </button>

                    <button
                      type="button"
                      className="btn"
                      disabled={
                        loading
                      }
                      onClick={() =>
                        deleteImage(
                          image
                        )
                      }
                      style={{
                        color:
                          "#b91c1c",

                        borderColor:
                          "#fecaca",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}