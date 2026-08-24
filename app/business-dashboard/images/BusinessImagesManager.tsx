"use client";

import {
  ChangeEvent,
  useState,
} from "react";
import Image from "next/image";

import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Star,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Confirmation = { resolve: (confirmed: boolean) => void };

type BusinessImage = {
  id: string;
  image_url: string;
  position: number;
};

type Props = {
  businessId: string;
  initialImages: BusinessImage[];
  endpoint?: string;
};

type MessageType =
  | "success"
  | "error"
  | null;

export default function BusinessImagesManager({
  businessId,
  initialImages,
  endpoint = "/api/business/images",
}: Props) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  function requestConfirmation() {
    return new Promise<boolean>((resolve) => setConfirmation({ resolve }));
  }

  function finishConfirmation(confirmed: boolean) {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  }
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
        endpoint,
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
          endpoint,
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
    const confirmed = await requestConfirmation();

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
          endpoint,
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
    <div className="img9">
      <div className="img9-toolbar">
        <label className="btn primary img9-upload">
          <ImagePlus
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          {loading
            ? "Procesando..."
            : "Subir imagen"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleUpload
            }
            disabled={
              loading
            }
          />
        </label>

        <p>
          JPG, PNG o WebP · máximo 5 MB. La primera imagen será la portada.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          aria-live="polite"
          className={
            messageType ===
              "error"
              ? "img9-message is-error"
              : "img9-message is-success"
          }
        >
          <span>
            {message}
          </span>

          <button
            type="button"
            onClick={
              clearMessage
            }
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      {images.length ===
      0 ? (
        <div className="img9-empty">
          <ImagePlus
            size={23}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <strong>
            Todavía no has subido imágenes
          </strong>

          <p>
            Añade fotografías para mejorar la ficha pública de tu negocio.
          </p>
        </div>
      ) : (
        <div className="img9-grid">
          {images.map(
            (
              image,
              index
            ) => (
              <article
                className="img9-card"
                key={
                  image.id
                }
              >
                <div className="img9-media">
                  <Image
                    src={
                      image.image_url
                    }
                    alt={`Imagen ${index + 1}`}
                    fill
                    sizes="(max-width: 760px) 50vw, 220px"
                    unoptimized
                  />

                  {index ===
                    0 && (
                    <span className="img9-cover">
                      <Star
                        size={13}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      Portada
                    </span>
                  )}
                </div>

                <div className="img9-actions">
                  {index !==
                    0 && (
                    <button
                      type="button"
                      className="btn img9-cover-button"
                      disabled={
                        loading
                      }
                      onClick={() =>
                        makeCover(
                          image
                        )
                      }
                    >
                      <Star
                        size={14}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      Hacer portada
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn img9-icon-button"
                    aria-label="Mover imagen a la izquierda"
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
                    <ArrowLeft
                      size={15}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    className="btn img9-icon-button"
                    aria-label="Mover imagen a la derecha"
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
                    <ArrowRight
                      size={15}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    className="btn img9-delete"
                    aria-label="Eliminar imagen"
                    disabled={
                      loading
                    }
                    onClick={() =>
                      deleteImage(
                        image
                      )
                    }
                  >
                    <Trash2
                      size={15}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </article>
            )
          )}

          <label className="img9-add-card">
            <ImagePlus
              size={22}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <strong>
              Añadir más
            </strong>

            <span>
              JPG, PNG o WebP
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        </div>
      )}

      <style jsx>{`
        .img9 {
          margin-top: 4px;
        }

        .img9-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .img9-upload {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .img9-upload input {
          display: none;
        }

        .img9-toolbar p,
        .img9-empty p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .img9-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .img9-message.is-success {
          background: #effaf3;
          color: #17663a;
        }

        .img9-message.is-error {
          background: #fff0f0;
          color: #b42318;
        }

        .img9-message button {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .img9-empty {
          display: grid;
          justify-items: center;
          gap: 7px;
          margin-top: 14px;
          padding: 26px 16px;
          border: 1px dashed #dcd7eb;
          border-radius: 14px;
          background: #fbfaff;
          color: var(--accent);
          text-align: center;
        }

        .img9-empty strong {
          color: var(--text);
          font-size: 14px;
        }

        .img9-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 245px));
          gap: 9px;
          margin-top: 12px;
        }

        .img9-card {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
        }

        .img9-media {
          position: relative;
          height: 126px;
          overflow: hidden;
          background: #f4f3f7;
        }

        .img9-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .img9-cover {
          position: absolute;
          top: 9px;
          left: 9px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 999px;
          background: rgba(255,255,255,.92);
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
          backdrop-filter: blur(8px);
        }

        .img9-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding: 9px;
        }

        .img9-actions .btn {
          min-height: 34px;
          padding: 7px 9px;
          font-size: 12px;
        }

        .img9-cover-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .img9-icon-button {
          min-width: 34px;
        }

        .img9-delete {
          margin-left: auto;
          color: #b42318;
          border-color: #fecaca;
        }


        .img9-add-card {
          min-height: 174px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          border: 1.5px dashed #cfc5ff;
          border-radius: 12px;
          background: #fbfaff;
          color: var(--accent);
          cursor: pointer;
          transition:
            border-color .16s ease,
            background .16s ease,
            transform .16s ease;
        }

        .img9-add-card:hover {
          border-color: #9e8cff;
          background: #f7f4ff;
          transform: translateY(-1px);
        }

        .img9-add-card strong {
          font-size: 12px;
        }

        .img9-add-card span {
          color: var(--muted);
          font-size: 10px;
        }

        .img9-add-card input {
          display: none;
        }

        @media (max-width: 900px) {
          .img9-grid {
            grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          }
        }

        @media (max-width: 560px) {
          .img9-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .img9-upload {
            width: 100%;
            justify-content: center;
          }

          .img9-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 7px;
          }

          .img9-media {
            height: 104px;
          }
        }

        @media (max-width: 420px) {
          .img9-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .img9-media {
            height: 168px;
          }
        }
      `}</style>
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => { if (!open) finishConfirmation(false); }}
        title="Eliminar imagen"
        description="La imagen se eliminará definitivamente de la galería del negocio."
        variant="danger"
        confirmLabel="Eliminar imagen"
        onConfirm={() => finishConfirmation(true)}
      />
    </div>
  );
}
