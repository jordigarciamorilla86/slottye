"use client";

import { ChangeEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BusinessImage = {
  id: string;
  image_url: string;
  position: number;
};

type Props = {
  businessId: string;
  initialImages: BusinessImage[];
};

export default function BusinessImagesManager({
  businessId,
  initialImages,
}: Props) {
  const supabase = createClient();

  const [images, setImages] = useState<BusinessImage[]>(
    [...initialImages].sort(
      (a, b) => a.position - b.position
    )
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveOrder(
    orderedImages: BusinessImage[]
  ) {
    for (
      let index = 0;
      index < orderedImages.length;
      index++
    ) {
      const image = orderedImages[index];

      const { error } = await supabase
        .from("business_images")
        .update({
          position: index,
        })
        .eq("id", image.id)
        .eq("business_id", businessId);

      if (error) {
        throw error;
      }
    }

    return orderedImages.map(
      (image, index) => ({
        ...image,
        position: index,
      })
    );
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecciona una imagen válida.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "La imagen no puede superar 5 MB."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const extension =
      file.name.split(".").pop() ?? "jpg";

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const path =
      `${businessId}/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("business-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      setMessage(uploadError.message);
      setLoading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("business-images")
      .getPublicUrl(path);

    const nextPosition = images.length;

    const { data, error } = await supabase
      .from("business_images")
      .insert({
        business_id: businessId,
        image_url: publicUrl,
        position: nextPosition,
      })
      .select(`
        id,
        image_url,
        position
      `)
      .single();

    if (error) {
      await supabase.storage
        .from("business-images")
        .remove([path]);

      setMessage(error.message);
      setLoading(false);
      return;
    }

    setImages((current) => [
      ...current,
      data,
    ]);

    setMessage(
      "Imagen subida correctamente."
    );

    event.target.value = "";
    setLoading(false);
  }

  async function makeCover(
    image: BusinessImage
  ) {
    if (images[0]?.id === image.id) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const reordered = [
        image,
        ...images.filter(
          (item) => item.id !== image.id
        ),
      ];

      const normalized =
        await saveOrder(reordered);

      setImages(normalized);

      setMessage(
        "Portada actualizada correctamente."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la portada."
      );
    }

    setLoading(false);
  }

  async function moveImage(
    imageId: string,
    direction: "left" | "right"
  ) {
    const currentIndex =
      images.findIndex(
        (image) => image.id === imageId
      );

    if (currentIndex === -1) return;

    const targetIndex =
      direction === "left"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= images.length
    ) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const reordered = [...images];

      [
        reordered[currentIndex],
        reordered[targetIndex],
      ] = [
        reordered[targetIndex],
        reordered[currentIndex],
      ];

      const normalized =
        await saveOrder(reordered);

      setImages(normalized);

      setMessage(
        "Orden actualizado correctamente."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el orden."
      );
    }

    setLoading(false);
  }

  async function deleteImage(
    image: BusinessImage
  ) {
    const confirmed = window.confirm(
      "¿Eliminar esta imagen?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const url = new URL(
      image.image_url
    );

    const marker =
      "/storage/v1/object/public/business-images/";

    const path = decodeURIComponent(
      url.pathname.split(marker)[1] ?? ""
    );

    const { error: storageError } =
      await supabase.storage
        .from("business-images")
        .remove([path]);

    if (storageError) {
      setMessage(
        storageError.message
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("business_images")
      .delete()
      .eq("id", image.id)
      .eq("business_id", businessId);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const remaining = images.filter(
      (item) => item.id !== image.id
    );

    try {
      const normalized =
        await saveOrder(remaining);

      setImages(normalized);
      setMessage("Imagen eliminada.");
    } catch {
      setImages(remaining);

      setMessage(
        "Imagen eliminada, aunque no se pudo normalizar el orden."
      );
    }

    setLoading(false);
  }

  return (
    <div style={{ marginTop: 28 }}>
      <label className="btn primary">
        {loading
          ? "Procesando..."
          : "📷 Subir imagen"}

        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={loading}
          style={{
            display: "none",
          }}
        />
      </label>

      <p
        className="muted"
        style={{ marginTop: 10 }}
      >
        JPG, PNG o WebP · Máximo 5 MB.
        La primera imagen será la portada.
      </p>

      {message && (
        <p className="muted">
          {message}
        </p>
      )}

      {images.length === 0 ? (
        <div
          className="panel"
          style={{ marginTop: 24 }}
        >
          <h3>
            Todavía no has subido imágenes
          </h3>

          <p className="muted">
            La primera imagen se utilizará
            como portada del negocio.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {images.map(
            (image, index) => (
              <div
                className="card"
                key={image.id}
              >
                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <img
                    src={image.image_url}
                    alt={`Imagen ${index + 1}`}
                    style={{
                      width: "100%",
                      height: 190,
                      objectFit: "cover",
                      borderRadius:
                        "14px 14px 0 0",
                    }}
                  />

                  {index === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background:
                          "var(--card)",
                        border:
                          "1px solid var(--border)",
                        borderRadius: 999,
                        padding:
                          "6px 10px",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      ⭐ Portada
                    </div>
                  )}
                </div>

                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {index !== 0 && (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={loading}
                        onClick={() =>
                          makeCover(image)
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
                        index === 0
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
                          images.length - 1
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
                      onClick={() =>
                        deleteImage(image)
                      }
                      disabled={loading}
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