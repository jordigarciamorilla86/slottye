"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  bookingId: string;
  businessId: string;
  userId: string;
  initialReview: Review | null;
};

export function ReviewForm({
  bookingId,
  businessId,
  userId,
  initialReview,
}: Props) {
  const supabase =
    createClient();

  const [
    review,
    setReview,
  ] =
    useState<Review | null>(
      initialReview
    );

  const [
    rating,
    setRating,
  ] =
    useState(
      initialReview?.rating ??
        0
    );

  const [
    comment,
    setComment,
  ] =
    useState(
      initialReview?.comment ??
        ""
    );

  const [
    editing,
    setEditing,
  ] =
    useState(
      !initialReview
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
    isError,
    setIsError,
  ] =
    useState(false);

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  async function saveReview() {
    setMessage("");
    setIsError(false);

    /*
     * Validación frontend.
     */
    if (
      rating < 1 ||
      rating > 5
    ) {
      setMessage(
        "Selecciona una valoración de 1 a 5 estrellas."
      );

      setIsError(true);

      return;
    }

    if (
      comment.length >
      1000
    ) {
      setMessage(
        "El comentario no puede superar los 1000 caracteres."
      );

      setIsError(true);

      return;
    }

    setLoading(true);

    /*
     * ==========================================================
     * EDITAR
     * ==========================================================
     *
     * Ya NO hacemos:
     *
     * .from("reviews").update(...)
     *
     * Toda la edición pasa por
     * nuestra RPC segura.
     */

    if (review) {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "update_review",
          {
            p_review_id:
              review.id,

            p_rating:
              rating,

            p_comment:
              comment.trim(),
          }
        );

      if (error) {
        setMessage(
          error.message
        );

        setIsError(
          true
        );

        setLoading(
          false
        );

        return;
      }

      /*
       * PostgreSQL devuelve
       * la fila actualizada.
       *
       * Según los tipos generados
       * de Supabase podría llegar
       * directamente como objeto.
       */
      const updatedReview =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!updatedReview) {
        setMessage(
          "No se ha podido recuperar la reseña actualizada."
        );

        setIsError(
          true
        );

        setLoading(
          false
        );

        return;
      }

      setReview({
        id:
          updatedReview.id,

        rating:
          updatedReview.rating,

        comment:
          updatedReview.comment,

        created_at:
          updatedReview.created_at,

        updated_at:
          updatedReview.updated_at,
      });

      setEditing(
        false
      );

      setMessage(
        "Reseña actualizada correctamente."
      );

      setLoading(
        false
      );

      return;
    }

    /*
     * ==========================================================
     * CREAR
     * ==========================================================
     *
     * La creación puede continuar
     * usando INSERT porque la RLS
     * ya valida:
     *
     * - user_id = auth.uid()
     * - booking pertenece al usuario
     * - booking pertenece al negocio
     * - booking está COMPLETED
     */

    const {
      data,
      error,
    } =
      await supabase
        .from("reviews")
        .insert({
          booking_id:
            bookingId,

          business_id:
            businessId,

          user_id:
            userId,

          rating,

          comment:
            comment.trim() ||
            null,
        })
        .select(`
          id,
          rating,
          comment,
          created_at,
          updated_at
        `)
        .single();

    if (error) {
      setMessage(
        error.message
      );

      setIsError(
        true
      );

      setLoading(
        false
      );

      return;
    }

    setReview(
      data
    );

    setEditing(
      false
    );

    setMessage(
      "Reseña publicada correctamente."
    );

    setLoading(
      false
    );
  }

  /*
   * ============================================================
   * RESEÑA PUBLICADA
   * ============================================================
   */

  if (
    review &&
    !editing
  ) {
    return (
      <div
        style={{
          marginTop: 16,

          padding: 16,

          border:
            "1px solid var(--border)",

          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 24,

            letterSpacing: 2,
          }}
        >
          {[1, 2, 3, 4, 5].map(
            (star) => (
              <span
                key={
                  star
                }

                style={{
                  color:
                    star <=
                    review.rating
                      ? "#f59e0b"
                      : "#d1d5db",
                }}
              >
                ★
              </span>
            )
          )}
        </div>

        {review.comment && (
          <p
            style={{
              marginTop:
                10,

              marginBottom:
                0,
            }}
          >
            {
              review.comment
            }
          </p>
        )}

        <button
          type="button"

          className="btn"

          style={{
            marginTop:
              14,
          }}

          onClick={() => {
            setRating(
              review.rating
            );

            setComment(
              review.comment ??
                ""
            );

            setEditing(
              true
            );

            setMessage(
              ""
            );

            setIsError(
              false
            );
          }}
        >
          Editar reseña
        </button>

        {message && (
          <div
            style={{
              marginTop:
                12,

              color:
                isError
                  ? "#b91c1c"
                  : "#166534",

              fontWeight:
                600,
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

  /*
   * ============================================================
   * CREAR / EDITAR
   * ============================================================
   */

  return (
    <div
      style={{
        marginTop: 16,

        padding: 16,

        border:
          "1px solid var(--border)",

        borderRadius: 14,
      }}
    >
      <strong>
        {review
          ? "Editar tu reseña"
          : "Valora tu experiencia"}
      </strong>

      {/* ESTRELLAS */}

      <div
        style={{
          display: "flex",

          gap: 4,

          marginTop: 12,
        }}
      >
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <button
              key={
                star
              }

              type="button"

              onClick={() =>
                setRating(
                  star
                )
              }

              aria-label={`${star} estrella${
                star === 1
                  ? ""
                  : "s"
              }`}

              style={{
                border: 0,

                padding: 0,

                background:
                  "transparent",

                cursor:
                  "pointer",

                fontSize:
                  32,

                color:
                  star <=
                  rating
                    ? "#f59e0b"
                    : "#d1d5db",
              }}
            >
              ★
            </button>
          )
        )}
      </div>

      <div
        className="muted"

        style={{
          marginTop: 5,
        }}
      >
        {rating === 0
          ? "Selecciona de 1 a 5 estrellas"
          : `${rating} de 5 estrellas`}
      </div>

      {/* COMENTARIO */}

      <textarea
        value={
          comment
        }

        onChange={(
          event
        ) =>
          setComment(
            event.target
              .value
          )
        }

        rows={4}

        maxLength={
          1000
        }

        placeholder="Cuéntanos cómo ha sido tu experiencia..."

        style={{
          width:
            "100%",

          padding: 14,

          marginTop: 14,

          border:
            "1px solid var(--border)",

          borderRadius:
            14,

          background:
            "var(--card)",

          color:
            "var(--text)",

          font:
            "inherit",

          resize:
            "vertical",
        }}
      />

      <div
        className="muted"

        style={{
          marginTop: 5,

          fontSize: 13,
        }}
      >
        {
          comment.length
        }
        /1000
      </div>

      {/* BOTONES */}

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

          disabled={
            loading ||
            rating === 0
          }

          onClick={
            saveReview
          }
        >
          {loading
            ? "Guardando..."
            : review
              ? "Guardar cambios"
              : "Publicar reseña"}
        </button>

        {review && (
          <button
            type="button"

            className="btn"

            disabled={
              loading
            }

            onClick={() => {
              setRating(
                review.rating
              );

              setComment(
                review.comment ??
                  ""
              );

              setEditing(
                false
              );

              setMessage(
                ""
              );

              setIsError(
                false
              );
            }}
          >
            Cancelar
          </button>
        )}
      </div>

      {/* MENSAJE */}

      {message && (
        <div
          role="alert"

          style={{
            marginTop: 14,

            padding:
              "12px 14px",

            borderRadius:
              12,

            background:
              isError
                ? "#fef2f2"
                : "#f0fdf4",

            color:
              isError
                ? "#b91c1c"
                : "#166534",

            border:
              isError
                ? "1px solid #fecaca"
                : "1px solid #bbf7d0",

            fontWeight:
              600,
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