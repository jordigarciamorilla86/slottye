"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";

import { ReviewForm } from "@/components/ReviewForm";
import { ConfirmDialog } from "@/components/ui";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";

type Slot = {
  id: string;
  start_at: string;
  end_at: string;
};

export type Booking = {
  id: string;
  status: string;
  created_at: string;
  cancelled_at: string | null;

  slots:
    | {
        id: string;
        start_at: string;
        end_at: string;
      }
    | null;

  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
        allow_cancellations: boolean;
        min_cancellation_notice_hours: number;
      }
    | null;

  services:
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }
    | null;

  reviews:
    | {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        updated_at: string;
      }
    | null;
};

type Props = {
  initialBookings: Booking[];
  userId: string;
  highlightedBookingId:
    string |
    null;
  upcomingIds: string[];
  historyIds: string[];
  pendingReviewIds: string[];
  upcomingPage: number;
  historyPage: number;
  reviewPage: number;
  pageSize: number;
  totals: { upcoming: number; history: number; pendingReviews: number; completed: number; cancelled: number };
};

type MessageType =
  | "success"
  | "error"
  | null;

export default function BookingsManager({
  initialBookings,
  userId,
  highlightedBookingId,
  upcomingIds,
  historyIds,
  pendingReviewIds,
  upcomingPage,
  historyPage,
  reviewPage,
  pageSize,
  totals,
}: Props) {
  

  const highlightedRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [bookings, setBookings] =
    useState<Booking[]>(
      initialBookings
    );

  const [loadingId, setLoadingId] =
    useState<string | null>(
      null
    );

  const [
    rescheduleLoadingId,
    setRescheduleLoadingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    reschedulingBookingId,
    setReschedulingBookingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    availableSlots,
    setAvailableSlots,
  ] =
    useState<
      Record<string, Slot[]>
    >({});

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      null
    );

  const [
    toast,
    setToast,
  ] =
    useState<{
      text: string;
      type:
        | "success"
        | "error";
    } | null>(
      null
    );

  const [
    openReviewBookingId,
    setOpenReviewBookingId,
  ] =
    useState<string | null>(
      highlightedBookingId
    );

  const reviewDialogRef = useRef<HTMLDivElement>(null);
  const onReviewDialogKeyDown = useAccessibleDialog({
    open: openReviewBookingId !== null,
    onClose: () => setOpenReviewBookingId(null),
    dialogRef: reviewDialogRef,
  });


  const [
    showPendingReviews,
    setShowPendingReviews,
  ] =
    useState(false);

  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [rescheduleToConfirm, setRescheduleToConfirm] =
    useState<{ booking: Booking; slot: Slot } | null>(null);

  /*
   * ============================================================
   * ABRIR RESEÑA DESDE EL EMAIL
   * ============================================================
   */

  useEffect(() => {
    if (
      !highlightedBookingId
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          highlightedRef.current
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center",
            });
        },
        150
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    highlightedBookingId,
  ]);

  /*
   * ============================================================
   * FORMATO
   * ============================================================
   */

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  function formatTime(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  function formatDateTime(
    value: Date
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone:
          "Europe/Madrid",
      }
    ).format(value);
  }

  function statusLabel(
    status: string
  ) {
    switch (status) {
      case "CONFIRMED":
        return "Confirmada";

      case "CANCELLED_BY_USER":
        return "Cancelada por ti";

      case "CANCELLED_BY_BUSINESS":
        return "Cancelada por el negocio";

      case "CANCELLED_ACCOUNT_DELETED":
        return "Cancelada por eliminación de cuenta";

      case "COMPLETED":
        return "Completada";

      case "NO_SHOW":
        return "No asististe";

      default:
        return status;
    }
  }

  /*
   * ============================================================
   * MENSAJES
   * ============================================================
   */

  function showToast(
    text:
      string,
    type:
      | "success"
      | "error"
  ) {
    setToast({
      text,
      type,
    });

    window.setTimeout(
      () => {
        setToast(
          null
        );
      },
      3200
    );
  }

  function showSuccess(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "success"
    );

    showToast(
      text,
      "success"
    );
  }

  function showError(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "error"
    );

    showToast(
      text,
      "error"
    );
  }

  function clearMessage() {
    setMessage("");
    setMessageType(
      null
    );
  }

  /*
   * ============================================================
   * CANCELACIÓN
   * ============================================================
   */

  function getCancellationInfo(
    booking: Booking
  ) {
    if (!booking.slots) {
      return {
        canCancel: false,

        reason:
          "No se ha encontrado la información de la cita.",

        deadline:
          null as Date | null,
      };
    }

    if (
      !booking.businesses
    ) {
      return {
        canCancel: false,

        reason:
          "No se ha encontrado la información del negocio.",

        deadline:
          null as Date | null,
      };
    }

    if (
      booking.businesses
        .allow_cancellations ===
      false
    ) {
      return {
        canCancel: false,

        reason:
          "Este negocio no permite cambios ni cancelaciones online.",

        deadline:
          null as Date | null,
      };
    }

    const startAt =
      new Date(
        booking.slots
          .start_at
      );

    const noticeHours =
      booking.businesses
        .min_cancellation_notice_hours ??
      0;

    const deadline =
      new Date(
        startAt.getTime() -
          noticeHours *
            60 *
            60 *
            1000
      );

    if (
      new Date() >
      deadline
    ) {
      return {
        canCancel: false,

        reason:
          noticeHours > 0
            ? `Ya no puedes cambiar ni cancelar esta cita. Este negocio requiere al menos ${noticeHours} horas de antelación.`
            : "Esta cita ya no se puede cambiar ni cancelar.",

        deadline,
      };
    }

    return {
      canCancel: true,
      reason: null,
      deadline,
    };
  }

  async function cancelBooking(
    booking: Booking
  ) {
    clearMessage();
  
    const cancellation =
      getCancellationInfo(
        booking
      );
  
    if (
      !cancellation.canCancel
    ) {
      showError(
        cancellation.reason ??
          "Esta cita no se puede cancelar."
      );
  
      return;
    }
  
    setBookingToCancel(booking);
  }

  async function executeCancelBooking(booking: Booking) {
    clearMessage();
  
    setLoadingId(
      booking.id
    );
  
    try {
      const response =
        await fetch(
          "/api/account/bookings/manage",
          {
            method:
              "POST",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                action:
                  "cancel",
  
                bookingId:
                  booking.id,
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
            "No se ha podido cancelar la cita."
        );
  
        return;
      }
  
      /*
       * Avisamos a los suscriptores
       * de que el hueco vuelve
       * a estar disponible.
       */
  
      fetch(
        "/api/notifications/slot-available",
        {
          method:
            "POST",
  
          headers: {
            "Content-Type":
              "application/json",
          },
  
          body:
            JSON.stringify({
              bookingId:
                booking.id,
            }),
        }
      ).catch(
        (
          error
        ) => {
          console.error(
            "Error enviando aviso de cita liberada:",
            error
          );
        }
      );
  
      /*
       * Actualización visual local.
       */
  
      setBookings(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              booking.id
                ? {
                    ...item,
  
                    status:
                      "CANCELLED_BY_USER",
  
                    cancelled_at:
                      new Date()
                        .toISOString(),
                  }
                : item
          )
      );
  
      showSuccess(
        "Cita cancelada correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error cancelling booking:",
        error
      );
  
      showError(
        "No se ha podido cancelar la cita."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  /*
   * ============================================================
   * REPROGRAMACIÓN
   * ============================================================
   */

  async function openReschedule(
    booking: Booking
  ) {
    clearMessage();
  
    if (
      !booking.businesses ||
      !booking.services ||
      !booking.slots
    ) {
      showError(
        "No se ha podido cargar la información necesaria para cambiar esta cita."
      );
  
      return;
    }
  
    if (
      reschedulingBookingId ===
      booking.id
    ) {
      setReschedulingBookingId(
        null
      );
  
      setSelectedSlotId(
        null
      );
  
      return;
    }
  
    setRescheduleLoadingId(
      booking.id
    );
  
    try {
      const response =
        await fetch(
          `/api/account/bookings/manage?bookingId=${encodeURIComponent(
            booking.id
          )}`,
          {
            method:
              "GET",
  
            cache:
              "no-store",
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        showError(
          result.error ??
            "No se han podido cargar las citas disponibles."
        );
  
        return;
      }
  
      setAvailableSlots(
        (
          current
        ) => ({
          ...current,
  
          [booking.id]:
            result.slots ??
            [],
        })
      );
  
      setSelectedSlotId(
        null
      );
  
      setReschedulingBookingId(
        booking.id
      );
    } catch (
      error
    ) {
      console.error(
        "Error loading reschedule slots:",
        error
      );
  
      showError(
        "No se han podido cargar las citas disponibles."
      );
    } finally {
      setRescheduleLoadingId(
        null
      );
    }
  }
  async function confirmReschedule(
    booking: Booking
  ) {
    clearMessage();
  
    if (
      !selectedSlotId
    ) {
      showError(
        "Selecciona una nueva cita."
      );
  
      return;
    }
  
    const slotsForBooking =
      availableSlots[
        booking.id
      ] ?? [];
  
    const selectedSlot =
      slotsForBooking.find(
        (
          slot
        ) =>
          slot.id ===
          selectedSlotId
      );
  
    if (
      !selectedSlot
    ) {
      showError(
        "La cita seleccionada ya no está disponible."
      );
  
      return;
    }
  
    setRescheduleToConfirm({ booking, slot: selectedSlot });
  }

  async function executeReschedule(booking: Booking, selectedSlot: Slot) {
    clearMessage();
  
    setRescheduleLoadingId(
      booking.id
    );
  
    try {
      const response =
        await fetch(
          "/api/account/bookings/manage",
          {
            method:
              "POST",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                action:
                  "reschedule",
  
                bookingId:
                  booking.id,
  
                newSlotId:
                  selectedSlot.id,
              }),
          }
        );
  
      const result =
        await response.json();
  
      if (
        !response.ok
      ) {
        console.error(
          "Error reprogramando cita:",
          result
        );
  
        showError(
          result.error ??
            "No se ha podido cambiar la cita."
        );
  
        return;
      }
  
      const oldSlotId =
        typeof result.oldSlotId ===
          "string"
          ? result.oldSlotId
          : booking.slots?.id;
  
      const newSlot =
        result.newSlot &&
        typeof result.newSlot ===
          "object"
          ? result.newSlot
          : selectedSlot;
  
      /*
       * El hueco anterior ha quedado libre.
       * Avisamos a los suscriptores.
       */
  
      if (
        oldSlotId
      ) {
        fetch(
          "/api/notifications/rescheduled-slot-available",
          {
            method:
              "POST",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body:
              JSON.stringify({
                bookingId:
                  booking.id,
  
                oldSlotId,
              }),
          }
        ).catch(
          (
            error
          ) => {
            console.error(
              "Error avisando del hueco liberado tras reprogramación:",
              error
            );
          }
        );
      }
  
      /*
       * Notificación de reprogramación.
       */
  
      fetch(
        "/api/notifications/booking-rescheduled",
        {
          method:
            "POST",
  
          headers: {
            "Content-Type":
              "application/json",
          },
  
          body:
            JSON.stringify({
              bookingId:
                booking.id,
            }),
        }
      ).catch(
        (
          error
        ) => {
          console.error(
            "Error enviando notificación de reprogramación:",
            error
          );
        }
      );
  
      /*
       * Actualización visual local.
       */
  
      setBookings(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              booking.id
                ? {
                    ...item,
  
                    slots: {
                      id:
                        newSlot.id,
  
                      start_at:
                        newSlot.start_at,
  
                      end_at:
                        newSlot.end_at,
                    },
                  }
                : item
          )
      );
  
      setReschedulingBookingId(
        null
      );
  
      setSelectedSlotId(
        null
      );
  
      setAvailableSlots(
        (
          current
        ) => ({
          ...current,
  
          [booking.id]:
            [],
        })
      );
  
      showSuccess(
        `Cita modificada correctamente. Tu nueva cita es el ${formatDate(
          newSlot.start_at
        )} a las ${formatTime(
          newSlot.start_at
        )}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Error rescheduling booking:",
        error
      );
  
      showError(
        "No se ha podido cambiar la cita."
      );
    } finally {
      setRescheduleLoadingId(
        null
      );
    }
  }

  /*
   * ============================================================
   * AGRUPAR HUECOS POR DÍA
   * ============================================================
   */

  function getDayKey(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(value)
    );
  }

  function groupSlotsByDay(
    slots: Slot[]
  ) {
    const grouped =
      slots.reduce(
        (acc, slot) => {
          const key =
            getDayKey(
              slot.start_at
            );

          if (
            !acc[key]
          ) {
            acc[key] = [];
          }

          acc[key].push(
            slot
          );

          return acc;
        },
        {} as Record<
          string,
          Slot[]
        >
      );

    return Object.entries(
      grouped
    ).sort(
      ([a], [b]) =>
        a.localeCompare(
          b
        )
    );
  }

  /*
   * ============================================================
   * PRÓXIMAS / HISTORIAL
   * ============================================================
   */

  const upcomingBookings =
    bookings
      .filter(
        (booking) => upcomingIds.includes(booking.id)
      )
      .sort(
        (a, b) =>
          new Date(
            a.slots!
              .start_at
          ).getTime() -
          new Date(
            b.slots!
              .start_at
          ).getTime()
      );

  const historyBookings =
    bookings
      .filter(
        (booking) => historyIds.includes(booking.id)
      )
      .sort(
        (
          first,
          second
        ) => {
          const firstDate =
            first.slots
              ?.start_at ??
            first.created_at;

          const secondDate =
            second.slots
              ?.start_at ??
            second.created_at;

          return (
            new Date(
              secondDate
            ).getTime() -
            new Date(
              firstDate
            ).getTime()
          );
        }
      );

  const historyPages =
    Math.max(
      1,
      Math.ceil(
        totals.history /
          pageSize
      )
    );

  const effectiveHistoryPage =
    Math.min(
      historyPage,
      historyPages
    );

  const visibleHistory =
    historyBookings;

  const pendingReviewBookings =
    bookings.filter((booking) =>
      pendingReviewIds.includes(booking.id) && !booking.reviews
    );

  const openReviewBooking =
    openReviewBookingId
      ? bookings.find(
          (
            booking
          ) =>
            booking.id ===
            openReviewBookingId
        ) ??
        null
      : null;

  const completedTotal = totals.completed;
  const cancelledTotal = totals.cancelled;

  function pageHref(key: "upcomingPage" | "historyPage" | "reviewPage", page: number) {
    const params = new URLSearchParams();
    if (upcomingPage > 1) params.set("upcomingPage", String(upcomingPage));
    if (historyPage > 1) params.set("historyPage", String(historyPage));
    if (reviewPage > 1) params.set("reviewPage", String(reviewPage));
    if (highlightedBookingId) params.set("review", highlightedBookingId);
    if (page > 1) params.set(key, String(page)); else params.delete(key);
    const query = params.toString();
    const href = query ? `/account/bookings?${query}` : "/account/bookings";
    return key === "historyPage" ? `${href}#historial` : href;
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="mybookings10">
      <ConfirmDialog
        open={bookingToCancel !== null}
        onOpenChange={(open) => { if (!open) setBookingToCancel(null); }}
        title="Cancelar cita"
        description="¿Seguro que quieres cancelar esta cita? El horario volverá a estar disponible."
        variant="danger"
        confirmLabel="Cancelar cita"
        pending={bookingToCancel !== null && loadingId === bookingToCancel.id}
        onConfirm={async () => {
          if (!bookingToCancel) return;
          await executeCancelBooking(bookingToCancel);
          setBookingToCancel(null);
        }}
      />
      <ConfirmDialog
        open={rescheduleToConfirm !== null}
        onOpenChange={(open) => { if (!open) setRescheduleToConfirm(null); }}
        title="Cambiar cita"
        description={rescheduleToConfirm
          ? `¿Cambiar tu cita al ${formatDate(rescheduleToConfirm.slot.start_at)} a las ${formatTime(rescheduleToConfirm.slot.start_at)}?`
          : "Confirma la nueva fecha de tu cita."}
        variant="warning"
        confirmLabel="Cambiar cita"
        pending={rescheduleToConfirm !== null && rescheduleLoadingId === rescheduleToConfirm.booking.id}
        onConfirm={async () => {
          if (!rescheduleToConfirm) return;
          await executeReschedule(rescheduleToConfirm.booking, rescheduleToConfirm.slot);
          setRescheduleToConfirm(null);
        }}
      />
      {toast && (
        <div
          className={`mybookings10-toast is-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.type ===
          "success" ? (
            <CheckCircle2
              size={18}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          ) : (
            <XCircle
              size={18}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          )}

          <span>
            {toast.text}
          </span>
        </div>
      )}

      <section className="mybookings10-summary">
        <article>
          <span>
            Próximas
          </span>

          <strong>
            {totals.upcoming}
          </strong>
        </article>

        <article>
          <span>
            Completadas
          </span>

          <strong>
            {completedTotal}
          </strong>
        </article>

        <article>
          <span>
            Canceladas
          </span>

          <strong>
            {cancelledTotal}
          </strong>
        </article>

        <article>
          <span>
            Historial
          </span>

          <strong>
            {totals.history}
          </strong>
        </article>
      </section>

      {message && (
        <div
          role="alert"
          className={`mybookings10-message is-${messageType ?? "success"}`}
        >
          {messageType ===
          "error" ? (
            <XCircle
              size={17}
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              size={17}
              strokeWidth={2}
              aria-hidden="true"
            />
          )}

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

      <section className="mybookings10-card mybookings10-list-panel mybookings10-upcoming-panel">
          <header className="mybookings10-section-head">
            <span className="mybookings10-section-icon">
              <CalendarDays
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="mybookings10-kicker">
              Próximamente
            </span>

            <h2>
              Próximas citas
            </h2>

            <p>
              Tus reservas confirmadas, ordenadas por fecha.
            </p>
          </div>

          <span className="mybookings10-count">
            {totals.upcoming}
          </span>
        </header>

        {upcomingBookings.length ===
        0 ? (
          <div className="mybookings10-empty">
            <span className="mybookings10-empty-icon">
              <CalendarDays
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                No tienes próximas citas
              </strong>

              <p>
                Cuando reserves una nueva cita aparecerá aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="mybookings10-upcoming-list">
            {upcomingBookings.map(
              (
                booking
              ) => {
                const cancellation =
                  getCancellationInfo(
                    booking
                  );

                const noticeHours =
                  booking.businesses
                    ?.min_cancellation_notice_hours ??
                  0;

                const isRescheduling =
                  reschedulingBookingId ===
                  booking.id;

                const slotsForBooking =
                  availableSlots[
                    booking.id
                  ] ?? [];

                const groupedAvailableSlots =
                  groupSlotsByDay(
                    slotsForBooking
                  );

                return (
                  <article
                    className="mybookings10-booking"
                    key={
                      booking.id
                    }
                  >
                    <div className="mybookings10-booking-main">
                      <div className="mybookings10-business">
                        <span className="mybookings10-business-icon">
                          <Building2
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </span>

                        <div>
                          <span className="mybookings10-status-confirmed">
                            Confirmada
                          </span>

                          <h3>
                            {booking.businesses
                              ?.name ??
                              "Negocio"}
                          </h3>

                          {booking.services && (
                            <p>
                              {booking.services.name}
                              {" · "}
                              {booking.services.duration_minutes} min
                            </p>
                          )}
                        </div>
                      </div>

                      {booking.slots && (
                        <div className="mybookings10-when">
                          <div>
                            <CalendarDays
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            <span>
                              {formatDate(
                                booking.slots
                                  .start_at
                              )}
                            </span>
                          </div>

                          <strong>
                            <Clock3
                              size={17}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            {formatTime(
                              booking.slots
                                .start_at
                            )}
                          </strong>
                        </div>
                      )}

                      {booking.businesses && (
                        <div className="mybookings10-location">
                          <MapPin
                            size={15}
                            strokeWidth={2}
                            aria-hidden="true"
                          />

                          <span>
                            {[
                              booking.businesses
                                .address,
                              booking.businesses
                                .city,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " · "
                              ) ||
                              "Dirección no disponible"}
                          </span>
                        </div>
                      )}
                    </div>

                    {booking.businesses &&
                      booking.slots && (
                        <div
                          className={
                            cancellation.canCancel
                              ? "mybookings10-policy is-ok"
                              : "mybookings10-policy is-locked"
                          }
                        >
                          <span className="mybookings10-policy-icon">
                            <ShieldCheck
                              size={16}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </span>

                          <div>
                            <strong>
                              {cancellation.canCancel
                                ? "Puedes modificar o cancelar esta cita"
                                : "Cambios y cancelaciones no disponibles"}
                            </strong>

                            <span>
                              {cancellation.canCancel
                                ? noticeHours >
                                    0 &&
                                  cancellation.deadline
                                  ? `Puedes hacerlo hasta el ${formatDateTime(
                                      cancellation.deadline
                                    )}.`
                                  : "Este negocio no exige una antelación mínima."
                                : cancellation.reason}
                            </span>
                          </div>
                        </div>
                      )}

                    <div className="mybookings10-actions">
                      {booking.businesses && (
                        <Link
                          className="btn"
                          href={`/business/${booking.businesses.slug}`}
                        >
                          Ver negocio

                          <ExternalLink
                            size={14}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Link>
                      )}

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          rescheduleLoadingId ===
                            booking.id ||
                          !cancellation.canCancel
                        }
                        onClick={() =>
                          openReschedule(
                            booking
                          )
                        }
                        title={
                          !cancellation.canCancel
                            ? cancellation.reason ??
                              "Esta cita ya no se puede modificar."
                            : "Cambiar fecha u hora de la cita"
                        }
                      >
                        <RefreshCw
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        {rescheduleLoadingId ===
                        booking.id
                          ? "Cargando..."
                          : isRescheduling
                            ? "Cerrar cambio"
                            : "Cambiar cita"}
                      </button>

                      <button
                        type="button"
                        className="btn mybookings10-cancel"
                        disabled={
                          loadingId ===
                            booking.id ||
                          !cancellation.canCancel
                        }
                        onClick={() =>
                          cancelBooking(
                            booking
                          )
                        }
                      >
                        <XCircle
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        {loadingId ===
                        booking.id
                          ? "Cancelando..."
                          : "Cancelar cita"}
                      </button>
                    </div>

                    {isRescheduling && (
                      <div className="mybookings10-reschedule">
                        <div className="mybookings10-reschedule-head">
                          <div>
                            <span className="mybookings10-kicker">
                              Reprogramación
                            </span>

                            <h4>
                              Cambiar cita
                            </h4>

                            <p>
                              Selecciona otro hueco disponible para el mismo servicio.
                            </p>
                          </div>
                        </div>

                        {slotsForBooking.length ===
                        0 ? (
                          <div className="mybookings10-reschedule-empty">
                            <strong>
                              No hay otros huecos disponibles
                            </strong>

                            <span>
                              Este negocio no tiene otras citas libres para este servicio en este momento.
                            </span>
                          </div>
                        ) : (
                          <div className="mybookings10-slot-groups">
                            {groupedAvailableSlots.map(
                              ([
                                dayKey,
                                daySlots,
                              ]) => (
                                <div
                                  key={
                                    dayKey
                                  }
                                  className="mybookings10-slot-day"
                                >
                                  <strong>
                                    {formatDate(
                                      daySlots[
                                        0
                                      ].start_at
                                    )}
                                  </strong>

                                  <div className="mybookings10-slot-buttons">
                                    {daySlots.map(
                                      (
                                        slot
                                      ) => {
                                        const selected =
                                          selectedSlotId ===
                                          slot.id;

                                        return (
                                          <button
                                            key={
                                              slot.id
                                            }
                                            type="button"
                                            className={
                                              selected
                                                ? "btn primary"
                                                : "btn"
                                            }
                                            onClick={() =>
                                              setSelectedSlotId(
                                                slot.id
                                              )
                                            }
                                          >
                                            {formatTime(
                                              slot.start_at
                                            )}
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )
                            )}

                            <div className="mybookings10-reschedule-actions">
                              <button
                                type="button"
                                className="btn primary"
                                disabled={
                                  !selectedSlotId ||
                                  rescheduleLoadingId ===
                                    booking.id
                                }
                                onClick={() =>
                                  confirmReschedule(
                                    booking
                                  )
                                }
                              >
                                <CheckCircle2
                                  size={14}
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />

                                {rescheduleLoadingId ===
                                booking.id
                                  ? "Cambiando..."
                                  : "Confirmar cambio"}
                              </button>

                              <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                  setReschedulingBookingId(
                                    null
                                  );

                                  setSelectedSlotId(
                                    null
                                  );
                                }}
                              >
                                Cancelar cambio
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
        {Math.ceil(totals.upcoming / pageSize) > 1 && (
          <div className="mybookings10-pagination">
            <Link className="btn" aria-disabled={upcomingPage <= 1}
              href={pageHref("upcomingPage", Math.max(1, upcomingPage - 1))}>
              <ChevronLeft size={15} aria-hidden="true" style={{ transform: "translateY(2px)" }} /> Anterior
            </Link>
            <span>Página {upcomingPage} de {Math.ceil(totals.upcoming / pageSize)}</span>
            <Link className="btn" aria-disabled={upcomingPage >= Math.ceil(totals.upcoming / pageSize)}
              href={pageHref("upcomingPage", Math.min(Math.ceil(totals.upcoming / pageSize), upcomingPage + 1))}>
              Siguiente <ChevronRight size={15} aria-hidden="true" style={{ transform: "translateY(2px)" }} />
            </Link>
          </div>
        )}
      </section>

      {pendingReviewBookings.length >
      0 && (
        <section className="mybookings10-review-reminder">
          <div className="mybookings10-review-reminder-copy">
          <span className="mybookings10-review-reminder-icon">
  <Star
    size={17}
    strokeWidth={2}
    aria-hidden="true"
    style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    }}
  />
</span>

            <div>
              <strong>
                Tienes {totals.pendingReviews}{" "}
                {totals.pendingReviews === 1
                  ? "cita pendiente de valorar"
                  : "citas pendientes de valorar"}
              </strong>

              <span>
                Comparte tu experiencia cuando quieras.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn mybookings10-review-toggle"
            onClick={() =>
              setShowPendingReviews(
                (current) =>
                  !current
              )
            }
            aria-expanded={
              showPendingReviews
            }
          >
            {showPendingReviews
              ? "Ocultar pendientes"
              : "Ver pendientes"}
          </button>

          {showPendingReviews && (
            <>
            <div className="mybookings10-review-compact-list">
              {pendingReviewBookings.map(
                (booking) => (
                  <article
                    key={booking.id}
                    className="mybookings10-review-compact-row"
                  >
                    <div className="mybookings10-review-compact-main">
                      <span className="mybookings10-review-card-icon">
                        <Star
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      </span>

                      <div>
                        <strong>
                          {booking.businesses?.name ??
                            "Negocio"}
                        </strong>

                        <span>
                          {booking.services?.name ??
                            "Servicio"}
                        </span>
                      </div>
                    </div>

                    <div className="mybookings10-review-compact-date">
                      {booking.slots ? (
                        <>
                          <strong>
                            {formatDate(
                              booking.slots.start_at
                            )}
                          </strong>

                          <span>
                            {formatTime(
                              booking.slots.start_at
                            )}
                          </span>
                        </>
                      ) : (
                        <strong>
                          Sin horario
                        </strong>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn primary mybookings10-review-card-button"
                      onClick={() =>
                        setOpenReviewBookingId(
                          booking.id
                        )
                      }
                    >
                      <Star
                        size={14}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      Valorar
                    </button>
                  </article>
                )
              )}
            </div>
            {Math.ceil(totals.pendingReviews / pageSize) > 1 && (
              <div className="mybookings10-pagination">
                <Link className="btn" aria-disabled={reviewPage <= 1}
                  href={pageHref("reviewPage", Math.max(1, reviewPage - 1))}>Anterior</Link>
                <span>Página {reviewPage} de {Math.ceil(totals.pendingReviews / pageSize)}</span>
                <Link className="btn" aria-disabled={reviewPage >= Math.ceil(totals.pendingReviews / pageSize)}
                  href={pageHref("reviewPage", Math.min(Math.ceil(totals.pendingReviews / pageSize), reviewPage + 1))}>Siguiente</Link>
              </div>
            )}
            </>
          )}
        </section>
      )}


      <section id="historial" className="mybookings10-card mybookings10-history-panel">
        <header className="mybookings10-section-head">
          <span className="mybookings10-section-icon">
            <Clock3
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="mybookings10-kicker">
              Actividad
            </span>

            <h2>
              Historial
            </h2>

            <p>
              Citas anteriores, canceladas o completadas.
            </p>
          </div>

          <span className="mybookings10-count">
            {totals.history}
          </span>
        </header>

        {historyBookings.length ===
        0 ? (
          <div className="mybookings10-empty">
            <span className="mybookings10-empty-icon">
              <Clock3
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Todavía no tienes historial
              </strong>

              <p>
                Tus citas anteriores aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mybookings10-history-head">
              <span>
                Negocio
              </span>

              <span>
                Cita
              </span>

              <span>
                Estado
              </span>
            </div>

            <div className="mybookings10-history">
              {visibleHistory.map(
                (
                  booking
                ) => (
                  <article
                    className={
                      highlightedBookingId ===
                      booking.id
                        ? "mybookings10-history-row is-highlighted"
                        : "mybookings10-history-row"
                    }
                    key={
                      booking.id
                    }
                    id={`booking-${booking.id}`}
                    ref={
                      highlightedBookingId ===
                      booking.id
                        ? highlightedRef
                        : undefined
                    }
                  >
                    <div className="mybookings10-history-business">
                      <strong>
                        {booking.businesses
                          ?.name ??
                          "Negocio"}
                      </strong>

                      <span>
                        {booking.services
                          ?.name ??
                          "Servicio"}
                      </span>
                    </div>

                    <div className="mybookings10-history-date">
                      {booking.slots ? (
                        <>
                          <strong>
                            {formatDate(
                              booking.slots
                                .start_at
                            )}
                          </strong>

                          <span>
                            {formatTime(
                              booking.slots
                                .start_at
                            )}
                          </span>
                        </>
                      ) : (
                        <strong>
                          Sin horario
                        </strong>
                      )}
                    </div>

                    <div className="mybookings10-history-status-wrap">
                      <span
                        className={`mybookings10-history-status is-${booking.status.toLowerCase()}`}
                      >
                        {booking.status ===
                        "COMPLETED" && (
                          <CheckCircle2
                            size={12}
                            strokeWidth={2.4}
                            aria-hidden="true"
                          />
                        )}

                        {booking.status.startsWith(
                          "CANCELLED_"
                        ) && (
                          <XCircle
                            size={12}
                            strokeWidth={2.4}
                            aria-hidden="true"
                          />
                        )}

                        {statusLabel(
                          booking.status
                        )}
                      </span>
                    </div>


                  </article>
                )
              )}
            </div>

            {historyPages >
            1 && (
              <div className="mybookings10-pagination">
                <Link
                  className="btn"
                  aria-disabled={effectiveHistoryPage <= 1}
                  href={pageHref("historyPage", Math.max(1, effectiveHistoryPage - 1))}
                >
                  <ChevronLeft
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                    style={{ transform: "translateY(2px)" }}
                  />

                  Anterior
                </Link>

                <span>
                  Página {effectiveHistoryPage} de {historyPages}
                </span>

                <Link
                  className="btn"
                  aria-disabled={effectiveHistoryPage >= historyPages}
                  href={pageHref("historyPage", Math.min(historyPages, effectiveHistoryPage + 1))}
                >
                  Siguiente

                  <ChevronRight
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                    style={{ transform: "translateY(2px)" }}
                  />
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {openReviewBooking &&
        openReviewBooking.businesses && (
          <div
            className="mybookings10-modal-backdrop"
            role="presentation"
            onMouseDown={() =>
              setOpenReviewBookingId(
                null
              )
            }
          >
            <div
              ref={reviewDialogRef}
              className="mybookings10-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-modal-title"
              aria-describedby="review-modal-description"
              tabIndex={-1}
              onKeyDown={onReviewDialogKeyDown}
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="mybookings10-modal-head">
                <div>
                  <span className="mybookings10-kicker">
                    Tu experiencia
                  </span>

                  <h3 id="review-modal-title">
                    Valora tu cita
                  </h3>

                  <p id="review-modal-description">
                    {openReviewBooking.businesses.name}
                    {openReviewBooking.services
                      ?.name
                      ? ` · ${openReviewBooking.services.name}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  className="mybookings10-modal-close"
                  onClick={() =>
                    setOpenReviewBookingId(
                      null
                    )
                  }
                  aria-label="Cerrar valoración"
                >
                  ×
                </button>
              </div>

              <ReviewForm
                bookingId={
                  openReviewBooking.id
                }
                businessId={
                  openReviewBooking.businesses.id
                }
                userId={
                  userId
                }
                initialReview={
                  openReviewBooking.reviews
                }
                onSaved={(review) => {
                  setBookings((current) =>
                    current.map((booking) =>
                      booking.id === openReviewBooking.id
                        ? { ...booking, reviews: review }
                        : booking
                    )
                  );
                  setOpenReviewBookingId(null);
                  showSuccess("Valoración guardada correctamente.");
                }}
              />
            </div>
          </div>
        )}

      <style jsx>{`
        .mybookings10 {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .mybookings10-history-panel {
          scroll-margin-top: 92px;
        }

        .mybookings10-toast {
          position: fixed;
          top: 86px;
          right: 22px;
          z-index: 1200;
          width: min(420px, calc(100vw - 28px));
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
          border-radius: 14px;
          box-shadow:
            0 18px 45px
            rgba(31,27,48,.14);
          font-size: 12px;
          font-weight: 800;
        }

        .mybookings10-toast.is-success {
          border: 1px solid #b8ebc9;
          background: #effaf3;
          color: #176b3a;
        }

        .mybookings10-toast.is-error {
          border: 1px solid #ffc9c9;
          background: #fff2f2;
          color: #a92727;
        }

        .mybookings10-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .mybookings10-summary article {
          padding: 13px 15px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
        }

        .mybookings10-summary span,
        .mybookings10-summary strong {
          display: block;
        }

        .mybookings10-summary span {
          color: var(--muted);
          font-size: 11px;
        }

        .mybookings10-summary strong {
          margin-top: 3px;
          font-size: 22px;
          line-height: 1;
        }

        .mybookings10-message {
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 9px;
          padding: 11px 13px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 750;
        }

        .mybookings10-message.is-success {
          border: 1px solid #b8ebc9;
          background: #effaf3;
          color: #176b3a;
        }

        .mybookings10-message.is-error {
          border: 1px solid #ffc9c9;
          background: #fff2f2;
          color: #a92727;
        }

        .mybookings10-message button {
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
        }

        .mybookings10-card {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 12px 32px
            rgba(31,27,48,.025);
        }

        .mybookings10-list-panel {
          border-radius: 16px;
          box-shadow:
            0 8px 24px
            rgba(31,27,48,.018);
        }

        .mybookings10-history-panel {
          margin-top: 0;
        }

        .mybookings10-section-head {
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            auto;
          align-items: flex-start;
          gap: 10px;
          padding: 15px 17px 13px;
          border-bottom:
            1px solid #efedf2;
        }

        .mybookings10-section-icon,
        .mybookings10-business-icon,
        .mybookings10-empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0ecff;
          color: var(--accent);
        }

        .mybookings10-section-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 10px;
        }

        .mybookings10-kicker {
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
        }

        .mybookings10-section-head h2 {
          margin: 2px 0 3px;
          font-size: 20px;
          line-height: 1.18;
          letter-spacing: -.025em;
        }

        .mybookings10-section-head p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .mybookings10-count {
          min-width: 38px;
          height: 30px;
          display: grid;
          place-items: center;
          padding: 0 9px;
          border-radius: 999px;
          background: #f3f0ff;
          color: var(--accent-dark);
          font-size: 12px;
          font-weight: 850;
        }

        .mybookings10-upcoming-list {
          display: grid;
        }
        
        .mybookings10-booking {
          position: relative;
          padding: 20px 17px;
          background: #fff;
        }
        
        .mybookings10-booking + .mybookings10-booking {
          margin-top: 10px;
          padding-top: 24px;
          border-top: 1px solid #e4e1e9;
        }
        
        .mybookings10-booking + .mybookings10-booking::before {
          content: "";
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          height: 9px;
          background: #f8f8fb;
          border-top: 1px solid #f0eef3;
          border-bottom: 1px solid #f0eef3;
        }
        
        .mybookings10-booking-main {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          align-items: start;
        }

        .mybookings10-business {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .mybookings10-business-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 11px;
        }

        .mybookings10-status-confirmed {
          display: inline-flex;
          margin-bottom: 3px;
          color: #24774c;
          font-size: 10px;
          font-weight: 850;
        }

        .mybookings10-business h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.25;
        }

        .mybookings10-business p {
          margin: 3px 0 0;
          color: var(--muted);
          font-size: 11.5px;
        }

        .mybookings10-when {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
        
          margin-top: 2px;
          padding: 10px 12px;
        
          border: 1px solid #efedf2;
          border-radius: 11px;
          background: #faf9fc;
        }

        .mybookings10-when > div,
        .mybookings10-when strong,
        .mybookings10-location {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .mybookings10-when > div {
          color: #201d29;
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.25;
          text-transform: capitalize;
        }

        .mybookings10-when > div svg {
          color: var(--accent);
        }

        .mybookings10-when strong {
          min-width: 82px;
        
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
        
          color: #111019;
          font-size: 18px;
          line-height: 1;
          white-space: nowrap;
        }

        .mybookings10-location {
          color: var(--muted);
          font-size: 11.5px;
        }

        .mybookings10-policy {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 11px;
          padding: 8px 0 0;
          border-top: 1px dashed #e7e4eb;
        }

        .mybookings10-policy.is-ok {
          color: #247248;
        }

        .mybookings10-policy.is-locked {
          color: #a82d2d;
        }

        .mybookings10-policy-icon {
          display: flex;
          margin-top: 1px;
        }

        .mybookings10-policy strong,
        .mybookings10-policy span {
          display: block;
        }

        .mybookings10-policy strong {
          font-size: 11.5px;
        }

        .mybookings10-policy span {
          margin-top: 3px;
          font-size: 10.5px;
          line-height: 1.4;
        }

        .mybookings10-actions {
          display: flex;
          justify-content: flex-start;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .mybookings10-actions .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 11px;
        }

        .mybookings10-actions .btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .mybookings10-cancel:not(:disabled) {
          border-color: #ffc9c9;
          color: #b42318;
          background: #fff;
        }

        .mybookings10-reschedule {
          margin-top: 16px;
          padding-top: 16px;
          border-top:
            1px solid #efedf2;
        }

        .mybookings10-reschedule-head h4 {
          margin: 2px 0 3px;
          font-size: 16px;
        }

        .mybookings10-reschedule-head p {
          margin: 0;
          color: var(--muted);
          font-size: 11.5px;
        }

        .mybookings10-reschedule-empty {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: #faf9fc;
        }

        .mybookings10-reschedule-empty strong,
        .mybookings10-reschedule-empty span {
          display: block;
        }

        .mybookings10-reschedule-empty strong {
          font-size: 12px;
        }

        .mybookings10-reschedule-empty span {
          margin-top: 4px;
          color: var(--muted);
          font-size: 10.5px;
        }

        .mybookings10-slot-groups {
          display: grid;
          gap: 15px;
          margin-top: 13px;
        }

        .mybookings10-slot-day > strong {
          display: block;
          font-size: 11.5px;
          text-transform: capitalize;
        }

        .mybookings10-slot-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 8px;
        }

        .mybookings10-slot-buttons .btn {
          min-width: 68px;
          padding: 7px 9px;
          font-size: 10.5px;
        }

        .mybookings10-reschedule-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .mybookings10-reschedule-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .mybookings10-history-head,
        .mybookings10-history-row {
          display: grid;
          grid-template-columns:
            minmax(200px, 1fr)
            minmax(280px, 1.2fr)
            minmax(190px, auto);
          align-items: center;
          gap: 18px;
        }

        .mybookings10-history-head {
          padding: 9px 18px;
          border-bottom:
            1px solid #e9e7ed;
          background: #faf9fc;
        }

        .mybookings10-history-head span {
          color: var(--muted);
          font-size: 9.5px;
          font-weight: 800;
        }

        .mybookings10-history-head span:last-child {
          text-align: right;
        }

        .mybookings10-history {
          display: grid;
        }

        .mybookings10-history-row {
          min-height: 64px;
          padding: 12px 18px;
          border-bottom:
            1px solid #efedf2;
          scroll-margin-top: 120px;
        }

        .mybookings10-history-row.is-highlighted {
          position: relative;
          background: #fbf9ff;
          box-shadow:
            inset 3px 0 0
            var(--accent);
        }

        .mybookings10-history-business strong,
        .mybookings10-history-business span,
        .mybookings10-history-date strong,
        .mybookings10-history-date span {
          display: block;
        }

        .mybookings10-history-business strong {
          font-size: 12px;
        }

        .mybookings10-history-business span,
        .mybookings10-history-date span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 10.5px;
        }

        .mybookings10-history-date strong {
          font-size: 11.5px;
          text-transform: capitalize;
        }

        .mybookings10-history-status-wrap {
          display: flex;
          justify-content: flex-end;
        }

        .mybookings10-history-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .mybookings10-history-status.is-completed {
          background: #eaf8ef;
          color: #24774c;
        }

        .mybookings10-history-status.is-no_show {
          background: #fff3df;
          color: #a45f00;
        }

        .mybookings10-history-status[class*="is-cancelled_"] {
          background: #fff0f0;
          color: #b42318;
        }

        .mybookings10-review-reminder {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 14px;
          padding: 13px 16px;
          border: 1px solid #eadfb8;
          border-radius: 14px;
          background: #fffdf7;
        }

        .mybookings10-review-reminder-copy {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .mybookings10-review-reminder-icon {
          position: relative;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
        
          display: block;
        
          padding: 0;
          line-height: 0;
        
          border-radius: 10px;
          background: #fff4cf;
          color: #a96b00;
        }
        
      

        .mybookings10-review-reminder-copy strong,
        .mybookings10-review-reminder-copy span {
          display: block;
        }

        .mybookings10-review-reminder-copy strong {
          font-size: 12px;
        }

        .mybookings10-review-reminder-copy span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 10.5px;
        }

        .mybookings10-review-toggle {
          padding: 8px 11px;
          font-size: 10.5px;
        }

        .mybookings10-review-compact-list {
          grid-column: 1 / -1;
          display: grid;
          margin: 1px -16px -13px;
          border-top: 1px solid #eee5c9;
          background: #fff;
        }

        .mybookings10-review-compact-row {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(180px, auto)
            auto;
          align-items: center;
          gap: 16px;
          padding: 11px 16px;
          border-bottom: 1px solid #efedf2;
        }

        .mybookings10-review-compact-row:last-child {
          border-bottom: 0;
        }

        .mybookings10-review-compact-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mybookings10-review-card-icon {
          position: relative;
          width: 34px;
          height: 34px;
          display: block;
          flex: 0 0 34px;
          border-radius: 10px;
          background: #fff7df;
          color: #b77900;
        }

        .mybookings10-review-compact-main strong,
        .mybookings10-review-compact-main span,
        .mybookings10-review-compact-date strong,
        .mybookings10-review-compact-date span {
          display: block;
        }

        .mybookings10-review-compact-main strong {
          overflow: hidden;
          font-size: 11.5px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mybookings10-review-compact-main span,
        .mybookings10-review-compact-date span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 10px;
        }

        .mybookings10-review-compact-date strong {
          font-size: 10.5px;
          text-transform: capitalize;
        }

        .mybookings10-review-card-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 11px;
          font-size: 10.5px;
        }

        .mybookings10-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(23, 20, 38, .42);
          backdrop-filter: blur(3px);
        }

        .mybookings10-modal {
          width: min(680px, 100%);
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 26px 80px
            rgba(31,27,48,.22);
        }

        .mybookings10-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid #efedf2;
        }

        .mybookings10-modal-head h3 {
          margin: 3px 0 3px;
          font-size: 20px;
          letter-spacing: -.02em;
        }

        .mybookings10-modal-head p {
          margin: 0;
          color: var(--muted);
          font-size: 11.5px;
        }

        .mybookings10-modal-close {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          color: #5f5b68;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .mybookings10-pagination {
          display: grid;
          grid-template-columns:
            minmax(112px, auto)
            auto
            minmax(112px, auto);
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 18px;
          border-top:
            1px solid #efedf2;
        }

        .mybookings10-pagination .btn {
          min-width: 112px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 8px 12px;
          font-size: 11px;
          line-height: 16px;
        }

        .mybookings10-pagination .btn svg {
          display: block;
          width: 16px;
          height: 16px;
          flex: 0 0 16px;
          stroke-width: 2.4;
          align-self: center;
        }

        .mybookings10-pagination .btn[aria-disabled="true"] {
          opacity: .48;
          pointer-events: none;
        }

        .mybookings10-pagination span {
          min-width: 96px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 750;
          text-align: center;
          white-space: nowrap;
        }

        .mybookings10-kicker,
        .mybookings10-history-head span {
          font-size: 12px;
        }

        .mybookings10-section-head p,
        .mybookings10-business span,
        .mybookings10-when span,
        .mybookings10-location,
        .mybookings10-history-business span,
        .mybookings10-history-date span,
        .mybookings10-empty p,
        .mybookings10-review-reminder-copy span {
          font-size: 13px;
          line-height: 1.45;
        }

        .mybookings10-history-business strong,
        .mybookings10-history-date strong,
        .mybookings10-pagination .btn,
        .mybookings10-review-toggle {
          font-size: 13px;
        }

        .mybookings10-empty {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px 18px;
        }

        .mybookings10-empty-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 11px;
        }

        .mybookings10-empty strong {
          display: block;
          font-size: 12.5px;
        }

        .mybookings10-empty p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        @media (max-width: 760px) {
          .mybookings10-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .mybookings10-booking-main {
            grid-template-columns: 1fr;
          }

          .mybookings10-when {
            justify-items: start;
          }

          .mybookings10-location {
            grid-column: auto;
          }

          .mybookings10-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mybookings10-actions .btn {
            width: 100%;
          }

          .mybookings10-history-head {
            display: none;
          }

          .mybookings10-history-row {
            grid-template-columns: 1fr;
            gap: 9px;
            padding: 14px;
          }

          .mybookings10-history-status-wrap {
            justify-content: flex-start;
          }

          .mybookings10-review-reminder {
            grid-template-columns: 1fr;
          }

          .mybookings10-review-toggle {
            width: 100%;
          }

          .mybookings10-review-compact-row {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .mybookings10-review-card-button {
            width: 100%;
          }

          .mybookings10-modal-backdrop {
            align-items: end;
            padding: 10px;
          }

          .mybookings10-modal {
            width: 100%;
            max-height: calc(100vh - 20px);
            border-radius: 18px 18px 12px 12px;
          }

          .mybookings10-pagination {
            grid-template-columns:
              minmax(0, 1fr)
              auto
              minmax(0, 1fr);
            gap: 8px;
            padding: 12px 14px;
          }

          .mybookings10-pagination .btn {
            width: 100%;
            min-width: 0;
            padding: 8px 9px;
          }

          .mybookings10-pagination span {
            min-width: 0;
          }

          .mybookings10-toast {
            top: 74px;
            right: 14px;
            left: 14px;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}
