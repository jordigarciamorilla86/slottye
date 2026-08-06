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

export default function AdminBusinessImagesManager({
  businessId,
  initialImages,
}: Props) {
  const [
    images,
    setImages,
  ] =
    useState<
      BusinessImage[]
    >(
      [...initialImages]
        .sort(
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

  async function saveOrder(
    orderedImages:
      BusinessImage[]
  ) {
    const response =
      await fetch(
        `/api/admin/businesses/${businessId}/images`,
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
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
      5 * 1024 * 1024
    ) {
      showError(
        "La imagen no puede superar 5 MB."
      );

      event.target.value =
        "";

      return;
    }

    setLoading(true);
    clearMessage();

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/images`,
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
        "Error uploading business image as admin:",
        error
      );

      showError(
        "No se ha podido subir la imagen."
      );
    } finally {
      event.target.value =
        "";

      setLoading(false);
    }
  }

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

    setLoading(true);
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
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la portada."
      );
    } finally {
      setLoading(false);
    }
  }

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

    setLoading(true);
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
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el orden."
      );
    } finally {
      setLoading(false);
    }
  }

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

    setLoading(true);
    clearMessage();

    try {
      const response =
        await fetch(
          `/api/admin/businesses/${businessId}/images`,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
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
        "Error deleting business image as admin:",
        error
      );

      showError(
        "No se ha podido eliminar la imagen."
      );
    } finally {
      setLoading(false);
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
          style={{
            marginTop:
              16,

            padding:
              "14px 16px",

            borderRadius:
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
          {message}
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
            Este negocio todavía no tiene imágenes
          </h3>

          <p className="muted">
            La primera imagen se utilizará como portada pública.
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