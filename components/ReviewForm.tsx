"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Edit3, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./ReviewForm.module.css";

type Review = { id: string; rating: number; comment: string | null; created_at: string; updated_at: string };
type Props = { bookingId: string; businessId: string; userId: string; initialReview: Review | null; onSaved?: (review: Review) => void };

export function ReviewForm({ bookingId, businessId, userId, initialReview, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [review, setReview] = useState<Review | null>(initialReview);
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [editing, setEditing] = useState(!initialReview);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function saveReview() {
    setMessage(""); setIsError(false);
    if (rating < 1 || rating > 5) { setMessage("Selecciona una valoración de 1 a 5 estrellas."); setIsError(true); return; }
    if (comment.length > 1000) { setMessage("El comentario no puede superar los 1000 caracteres."); setIsError(true); return; }
    setLoading(true);

    if (review) {
      const { data, error } = await supabase.rpc("update_review", { p_review_id: review.id, p_rating: rating, p_comment: comment.trim() });
      if (error) { setMessage(error.message); setIsError(true); setLoading(false); return; }
      const updated = Array.isArray(data) ? data[0] : data;
      if (!updated) { setMessage("No se ha podido recuperar la reseña actualizada."); setIsError(true); setLoading(false); return; }
      const saved: Review = { id: updated.id, rating: updated.rating, comment: updated.comment, created_at: updated.created_at, updated_at: updated.updated_at };
      setReview(saved); onSaved?.(saved); setEditing(false); setMessage("Reseña actualizada correctamente."); setLoading(false); return;
    }

    const { data, error } = await supabase.from("reviews").insert({ booking_id: bookingId, business_id: businessId, user_id: userId, rating, comment: comment.trim() || null }).select("id, rating, comment, created_at, updated_at").single();
    if (error) { setMessage(error.message); setIsError(true); setLoading(false); return; }
    setReview(data); onSaved?.(data); setEditing(false); setMessage("Reseña publicada correctamente."); setLoading(false);
  }

  function beginEditing() { if (!review) return; setRating(review.rating); setComment(review.comment ?? ""); setEditing(true); setMessage(""); setIsError(false); }
  function cancelEditing() { if (!review) return; setRating(review.rating); setComment(review.comment ?? ""); setEditing(false); setMessage(""); setIsError(false); }

  if (review && !editing) return (
    <section className={styles.card} aria-label="Tu reseña">
      <div className={styles.publishedHeader}><span className={styles.successIcon} aria-hidden="true"><CheckCircle2 size={19} /></span><strong>Tu reseña</strong></div>
      <div className={styles.readonlyStars} aria-label={`${review.rating} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={23} aria-hidden="true" className={value <= review.rating ? styles.starSelected : styles.starEmpty} />)}
      </div>
      {review.comment ? <p className={styles.publishedComment}>{review.comment}</p> : null}
      <button type="button" className={`btn ${styles.editButton}`} onClick={beginEditing}><Edit3 size={16} aria-hidden="true" /> Editar reseña</button>
      {message ? <div className={`${styles.feedback} ${isError ? styles.error : styles.success}`} role="status">{message}</div> : null}
    </section>
  );

  return (
    <section className={styles.card} aria-labelledby={`review-title-${bookingId}`}>
      <strong id={`review-title-${bookingId}`} className={styles.title}>{review ? "Editar tu reseña" : "Valora tu experiencia"}</strong>
      <fieldset className={styles.ratingFieldset} disabled={loading}>
        <legend className={styles.label}>Valoración</legend>
        <div className={styles.starButtons}>{[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} estrella${value === 1 ? "" : "s"}`} aria-pressed={rating === value} className={`${styles.starButton} ${value <= rating ? styles.starSelected : styles.starEmpty}`}><Star size={30} aria-hidden="true" /></button>
        ))}</div>
        <div className={styles.ratingStatus} aria-live="polite">{rating === 0 ? "Selecciona de 1 a 5 estrellas" : `${rating} de 5 estrellas`}</div>
      </fieldset>
      <label className={styles.commentField}>
        <span className={styles.label}>Comentario <span className={styles.optional}>(opcional)</span></span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={1000} placeholder="Cuéntanos cómo ha sido tu experiencia..." className={styles.textarea} disabled={loading} />
        <span className={styles.counter}>{comment.length}/1000</span>
      </label>
      <div className={styles.actions}>
        <button type="button" className="btn primary" disabled={loading || rating === 0} onClick={saveReview}>{loading ? "Guardando…" : review ? "Guardar cambios" : "Publicar reseña"}</button>
        {review ? <button type="button" className="btn" disabled={loading} onClick={cancelEditing}>Cancelar</button> : null}
      </div>
      {message ? <div role="alert" className={`${styles.feedback} ${isError ? styles.error : styles.success}`}>{message}</div> : null}
    </section>
  );
}
