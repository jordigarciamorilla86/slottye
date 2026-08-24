"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  UserRound,
  UserX,
  XCircle,
} from "lucide-react";
import { ConfirmDialog, type ConfirmDialogVariant } from "@/components/ui/ConfirmDialog";

type Confirmation = {
  title: string;
  description: string;
  variant: ConfirmDialogVariant;
  confirmLabel: string;
  resolve: (confirmed: boolean) => void;
};

type Booking = {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  cancelled_at: string | null;
  status_updated_at: string | null;

  slots:
    | {
        id: string;
        start_at: string;
        end_at: string;
      }
    | null;

  services:
    | {
        id: string;
        name: string;
        duration_minutes: number;
      }
    | null;

  profiles:
    | {
        id: string;
        name: string | null;
        email: string | null;
      }
    | null;
};

type Props = {
  initialBookings: Booking[];
  paginationPath?: string;
  pagination?: {
    upcoming: { page: number; total: number };
    pending: { page: number; total: number };
    history: { page: number; total: number };
  };
  statusTotals?: {
    completed: number;
    noShow: number;
    cancelled: number;
  };
};

type BookingAction =
  | "cancel"
  | "complete"
  | "no_show";

function Pagination({
  page,
  pages,
  param,
  currentPages,
  onChange,
  paginationPath,
}: {
  page: number;
  pages: number;
  param: "upcomingPage" | "pendingPage" | "historyPage";
  currentPages?: Record<string, number>;
  onChange?: (page: number) => void;
  paginationPath: string;
}) {
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="bookings10-pagination">
      {!currentPages ? (
        <button type="button" className="btn" disabled={page <= 1} onClick={() => onChange?.(page - 1)}>
          <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />
          Anterior
        </button>
      ) : (
      <Link
        className={`btn${page <= 1 ? " is-disabled" : ""}`}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        href={{ pathname: paginationPath, query: page <= 1 ? currentPages : { ...currentPages, [param]: page - 1 } }}
        scroll={false}
      >
        <ChevronLeft
          size={15}
          strokeWidth={2}
          aria-hidden="true"
        />
        Anterior
      </Link>
      )}

      <span>
        Página {page} de {pages}
      </span>

      {!currentPages ? (
        <button type="button" className="btn" disabled={page >= pages} onClick={() => onChange?.(page + 1)}>
          Siguiente
          <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : (
      <Link
        className={`btn${page >= pages ? " is-disabled" : ""}`}
        aria-disabled={page >= pages}
        tabIndex={page >= pages ? -1 : undefined}
        href={{ pathname: paginationPath, query: page >= pages ? currentPages : { ...currentPages, [param]: page + 1 } }}
        scroll={false}
      >
        Siguiente
        <ChevronRight
          size={15}
          strokeWidth={2}
          aria-hidden="true"
        />
      </Link>
      )}
    </div>
  );
}

export default function BusinessBookingsManager({
  initialBookings,
  pagination,
  statusTotals,
  paginationPath = "/business-dashboard/bookings",
}: Props) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  function requestConfirmation(config: Omit<Confirmation, "resolve">) {
    return new Promise<boolean>((resolve) => setConfirmation({ ...config, resolve }));
  }

  function finishConfirmation(confirmed: boolean) {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  }
  const router = useRouter();
  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>(
      initialBookings
    );

  const [
    loadingId,
    setLoadingId,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    toast,
    setToast,
  ] =
    useState("");

  /*
   * ============================================================
   * FORMATO
   * ============================================================
   */

  function formatDate(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function formatTime(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function formatActionDateTime(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function getActionDate(
    booking:
      Booking
  ) {
    return (
      booking.status_updated_at ??
      booking.cancelled_at ??
      booking.created_at
    );
  }

  function statusLabel(
    status:
      string
  ) {
    switch (
      status
    ) {
      case "CONFIRMED":
        return "Confirmada";

      case "CANCELLED_BY_USER":
        return "Cancelada por el cliente";

      case "CANCELLED_BY_BUSINESS":
        return "Cancelada por el negocio";

      case "CANCELLED_ACCOUNT_DELETED":
        return "Cancelada por eliminación de cuenta";

      case "COMPLETED":
        return "Completada";

      case "NO_SHOW":
        return "No asistió";

      default:
        return status;
    }
  }

  function showToast(
    value:
      string
  ) {
    setToast(
      value
    );

    window.setTimeout(
      () => {
        setToast(
          ""
        );
      },
      3200
    );
  }

  /*
   * ============================================================
   * CAMBIAR ESTADO MEDIANTE API SEGURA
   * ============================================================
   */

  async function changeBookingStatus(
    bookingId:
      string,
    action:
      BookingAction
  ) {
    const response =
      await fetch(
        "/api/agenda/booking-status",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              bookingId,
              action,
            }),
        }
      );

    const result =
      await response
        .json()
        .catch(
          () => ({
            error:
              "La respuesta del servidor no es válida.",
          })
        );

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          "No se ha podido modificar la reserva."
      );
    }

    return result;
  }

  /*
   * ============================================================
   * CANCELAR RESERVA
   * ============================================================
   */

  async function cancelBooking(
    bookingId:
      string
  ) {
    const confirmed = await requestConfirmation({
      title: "Cancelar reserva",
      description: "La reserva quedará cancelada y dejará de figurar como cita activa.",
      variant: "danger",
      confirmLabel: "Cancelar reserva",
    });

    if (
      !confirmed
    ) {
      return;
    }

    setLoadingId(
      bookingId
    );

    setMessage(
      ""
    );

    try {
      await changeBookingStatus(
        bookingId,
        "cancel"
      );

      /*
       * ==========================================================
       * AVISAR AL CLIENTE
       * ==========================================================
       *
       * La cancelación ya está hecha.
       * Si el email falla, no revertimos el estado.
       */

      try {
        const notificationResponse =
          await fetch(
            "/api/notifications/booking-cancelled",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  bookingId,
                }),
            }
          );

        if (
          !notificationResponse.ok
        ) {
          const result =
            await notificationResponse
              .json()
              .catch(
                () =>
                  null
              );

          console.error(
            "Error enviando cancelación:",
            result
          );
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Error enviando notificación de cancelación:",
          notificationError
        );
      }

      /*
       * ==========================================================
       * ACTUALIZACIÓN LOCAL
       * ==========================================================
       */

      setBookings(
        (
          current
        ) =>
          current.map(
            (
              booking
            ) =>
              booking.id ===
              bookingId
                ? {
                    ...booking,

                    status:
                      "CANCELLED_BY_BUSINESS",

                    cancelled_at:
                      new Date()
                        .toISOString(),

                    status_updated_at:
                      new Date()
                        .toISOString(),
                  }
                : booking
          )
      );

      setMessage(
        "Reserva cancelada correctamente."
      );

      showToast(
        "Reserva cancelada correctamente."
      );
      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error cancelling booking:",
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "No se ha podido cancelar la reserva."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  /*
   * ============================================================
   * COMPLETAR RESERVA
   * ============================================================
   */

  async function completeBooking(
    bookingId:
      string
  ) {
    const confirmed = await requestConfirmation({
      title: "Completar cita",
      description: "La cita se marcará como completada.",
      variant: "neutral",
      confirmLabel: "Marcar como completada",
    });

    if (
      !confirmed
    ) {
      return;
    }

    setLoadingId(
      bookingId
    );

    setMessage(
      ""
    );

    try {
      await changeBookingStatus(
        bookingId,
        "complete"
      );

      /*
       * ==========================================================
       * SOLICITUD DE RESEÑA
       * ==========================================================
       *
       * La reserva ya está COMPLETED.
       * El fallo del correo no deshace el cambio.
       */

      try {
        const reviewResponse =
          await fetch(
            "/api/notifications/review-request",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  bookingId,
                }),
            }
          );

        if (
          !reviewResponse.ok
        ) {
          console.error(
            "La reserva se completó, pero no se pudo enviar la solicitud de reseña:",
            await reviewResponse.text()
          );
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Error enviando solicitud de reseña:",
          notificationError
        );
      }

      /*
       * ==========================================================
       * ACTUALIZACIÓN LOCAL
       * ==========================================================
       */

      setBookings(
        (
          current
        ) =>
          current.map(
            (
              booking
            ) =>
              booking.id ===
              bookingId
                ? {
                    ...booking,

                    status:
                      "COMPLETED",

                    status_updated_at:
                      new Date()
                        .toISOString(),
                  }
                : booking
          )
      );

      setMessage(
        "Reserva marcada como completada. Se ha enviado al cliente una solicitud de reseña."
      );

      showToast(
        "Reserva completada correctamente."
      );
      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error completing booking:",
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "No se ha podido marcar la reserva como completada."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  /*
   * ============================================================
   * NO PRESENTADO
   * ============================================================
   */

  async function noShowBooking(
    bookingId:
      string
  ) {
    const confirmed = await requestConfirmation({
      title: "Marcar ausencia",
      description: "La reserva quedará registrada como cliente no presentado.",
      variant: "warning",
      confirmLabel: "Marcar no presentado",
    });

    if (
      !confirmed
    ) {
      return;
    }

    setLoadingId(
      bookingId
    );

    setMessage(
      ""
    );

    try {
      await changeBookingStatus(
        bookingId,
        "no_show"
      );

      setBookings(
        (
          current
        ) =>
          current.map(
            (
              booking
            ) =>
              booking.id ===
              bookingId
                ? {
                    ...booking,

                    status:
                      "NO_SHOW",

                    status_updated_at:
                      new Date()
                        .toISOString(),
                  }
                : booking
          )
      );

      setMessage(
        "Reserva marcada como no presentada."
      );

      showToast(
        "Reserva marcada como no presentada."
      );
      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Error marking booking as no-show:",
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "No se ha podido marcar la reserva como no presentada."
      );
    } finally {
      setLoadingId(
        null
      );
    }
  }

  // ============================================================
  // PAGINACIÓN
  // ============================================================

  const BOOKINGS_PER_PAGE =
    6;
  const [localUpcomingPage, setLocalUpcomingPage] = useState(1);
  const [localPendingPage, setLocalPendingPage] = useState(1);
  const [localHistoryPage, setLocalHistoryPage] = useState(1);

  /*
   * ============================================================
   * CLASIFICAR RESERVAS
   * ============================================================
   */

  const now =
    new Date();

  /*
   * Reservas confirmadas futuras.
   */

  const upcoming =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.status ===
            "CONFIRMED" &&
          booking.slots &&
          new Date(
            booking.slots
              .start_at
          ) >
            now
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            first.slots!
              .start_at
          ).getTime() -
          new Date(
            second.slots!
              .start_at
          ).getTime()
      );

  /*
   * Reservas confirmadas cuya hora
   * ya ha pasado.
   */

  const pendingClosure =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.status ===
            "CONFIRMED" &&
          booking.slots &&
          new Date(
            booking.slots
              .start_at
          ) <=
            now
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            second.slots!
              .start_at
          ).getTime() -
          new Date(
            first.slots!
              .start_at
          ).getTime()
      );

  /*
   * Evitamos que próximas y pendientes
   * vuelvan a aparecer en historial.
   */

  const excludedIds =
    new Set([
      ...upcoming.map(
        (
          booking
        ) =>
          booking.id
      ),

      ...pendingClosure.map(
        (
          booking
        ) =>
          booking.id
      ),
    ]);

  const history =
    bookings
      .filter(
        (
          booking
        ) =>
          !excludedIds.has(
            booking.id
          )
      )
      .sort(
        (
          first,
          second
        ) => {
          const firstActionAt =
            first.status_updated_at ??
            first.cancelled_at ??
            first.created_at;

          const secondActionAt =
            second.status_updated_at ??
            second.cancelled_at ??
            second.created_at;

          return (
            new Date(
              secondActionAt
            ).getTime() -
            new Date(
              firstActionAt
            ).getTime()
          );
        }
      );

  const pageData = pagination ?? {
    upcoming: { page: localUpcomingPage, total: upcoming.length },
    pending: { page: localPendingPage, total: pendingClosure.length },
    history: { page: localHistoryPage, total: history.length },
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  const upcomingPages =
    Math.max(
      1,
      Math.ceil(
        pageData.upcoming.total /
          BOOKINGS_PER_PAGE
      )
    );

  const pendingPages =
    Math.max(
      1,
      Math.ceil(
        pageData.pending.total /
          BOOKINGS_PER_PAGE
      )
    );

  const historyPages =
    Math.max(
      1,
      Math.ceil(
        pageData.history.total /
          BOOKINGS_PER_PAGE
      )
    );

  const effectiveUpcomingPage =
    Math.min(
      pageData.upcoming.page,
      upcomingPages
    );

  const effectivePendingPage =
    Math.min(
      pageData.pending.page,
      pendingPages
    );

  const effectiveHistoryPage =
    Math.min(
      pageData.history.page,
      historyPages
    );

  const visibleUpcoming = pagination ? upcoming : upcoming.slice((effectiveUpcomingPage - 1) * BOOKINGS_PER_PAGE, effectiveUpcomingPage * BOOKINGS_PER_PAGE);

  const visiblePending = pagination ? pendingClosure : pendingClosure.slice((effectivePendingPage - 1) * BOOKINGS_PER_PAGE, effectivePendingPage * BOOKINGS_PER_PAGE);

  const visibleHistory = pagination ? history : history.slice((effectiveHistoryPage - 1) * BOOKINGS_PER_PAGE, effectiveHistoryPage * BOOKINGS_PER_PAGE);

  const completedTotal = statusTotals?.completed ?? bookings.filter((booking) => booking.status === "COMPLETED").length;
  const noShowTotal = statusTotals?.noShow ?? bookings.filter((booking) => booking.status === "NO_SHOW").length;
  const cancelledTotal = statusTotals?.cancelled ?? bookings.filter((booking) => booking.status.startsWith("CANCELLED_")).length;
  const currentPages = pagination ? {
    upcomingPage: effectiveUpcomingPage,
    pendingPage: effectivePendingPage,
    historyPage: effectiveHistoryPage,
  } : undefined;

  return (
    <div className="bookings10">
      {toast && (
        <div
          className="bookings10-toast"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            size={18}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          <span>
            {toast}
          </span>
        </div>
      )}

      <section className="bookings10-summary">
        <div>
          <span>
            Próximas
          </span>

          <strong>
            {pageData.upcoming.total}
          </strong>
        </div>

        <div>
          <span>
            Pendientes
          </span>

          <strong>
            {pageData.pending.total}
          </strong>
        </div>

        <div>
          <span>
            Completadas
          </span>

          <strong>
            {completedTotal}
          </strong>
        </div>

        <div>
          <span>
            No presentadas
          </span>

          <strong>
            {noShowTotal}
          </strong>
        </div>

        <div>
          <span>
            Canceladas
          </span>

          <strong>
            {cancelledTotal}
          </strong>
        </div>
      </section>

      {message && (
        <div
          className="bookings10-message"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="bookings10-card">
        <div className="bookings10-section-head">
          <span className="bookings10-icon">
            <CalendarCheck
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="bookings10-kicker">
              Próximas
            </span>

            <h2>
              Próximas reservas
            </h2>

            <p>
              Reservas confirmadas que todavía no han llegado.
            </p>
          </div>

          <span className="bookings10-count">
            {pageData.upcoming.total}
          </span>
        </div>

        {pageData.upcoming.total ===
        0 ? (
          <div className="bookings10-empty">
            <strong>
              No tienes próximas reservas
            </strong>

            <p>
              Las nuevas reservas confirmadas aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            <div className="bookings10-list">
              {visibleUpcoming.map(
                (
                  booking
                ) => (
                  <article
                    className="bookings10-row"
                    key={
                      booking.id
                    }
                  >
                    <div className="bookings10-customer">
                      <span className="bookings10-avatar">
                        <UserRound
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </span>

                      <div>
                        <strong>
                          {booking.profiles
                            ?.name ??
                            "Cliente"}
                        </strong>

                        {booking.profiles
                          ?.email && (
                          <span>
                            <Mail
                              size={13}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            {
                              booking
                                .profiles
                                .email
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bookings10-service">
                      <span>
                        Servicio
                      </span>

                      <strong>
                        {booking.services
                          ?.name ??
                          "Servicio"}
                      </strong>

                      {booking.services && (
                        <small>
                          {booking.services.duration_minutes} min
                        </small>
                      )}
                    </div>

                    <div className="bookings10-date">
                      <span>
                        Fecha y hora
                      </span>

                      {booking.slots ? (
                        <>
                          <strong>
                            {formatDate(
                              booking
                                .slots
                                .start_at
                            )}
                          </strong>

                          <small>
                            <Clock3
                              size={13}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            {formatTime(
                              booking
                                .slots
                                .start_at
                            )}
                          </small>
                        </>
                      ) : (
                        <strong>
                          Sin horario
                        </strong>
                      )}
                    </div>

                    <div className="bookings10-action">
                      <button
                        type="button"
                        className="btn bookings10-cancel"
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          cancelBooking(
                            booking.id
                          )
                        }
                      >
                        <XCircle
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        {loadingId ===
                        booking.id
                          ? "Procesando..."
                          : "Cancelar"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>

            <Pagination
              paginationPath={paginationPath}
              page={
                effectiveUpcomingPage
              }
              pages={
                upcomingPages
              }
              param="upcomingPage"
              currentPages={currentPages}
              onChange={setLocalUpcomingPage}
            />
          </>
        )}
      </section>

      <section className="bookings10-card">
        <div className="bookings10-section-head">
          <span className="bookings10-icon is-warning">
            <CalendarClock
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="bookings10-kicker is-warning">
              Revisión
            </span>

            <h2>
              Pendientes de cerrar
            </h2>

            <p>
              Citas cuya hora ya ha pasado y todavía siguen confirmadas.
            </p>
          </div>

          <span className="bookings10-count is-warning">
            {pageData.pending.total}
          </span>
        </div>

        {pageData.pending.total ===
        0 ? (
          <div className="bookings10-empty">
            <strong>
              No hay citas pendientes
            </strong>

            <p>
              Cuando termine una cita podrás cerrarla como completada o no presentada.
            </p>
          </div>
        ) : (
          <>
            <div className="bookings10-list">
              {visiblePending.map(
                (
                  booking
                ) => (
                  <article
                    className="bookings10-row"
                    key={
                      booking.id
                    }
                  >
                    <div className="bookings10-customer">
                      <span className="bookings10-avatar is-warning">
                        <UserRound
                          size={17}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </span>

                      <div>
                        <strong>
                          {booking.profiles
                            ?.name ??
                            "Cliente"}
                        </strong>

                        {booking.profiles
                          ?.email && (
                          <span>
                            <Mail
                              size={13}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            {
                              booking
                                .profiles
                                .email
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bookings10-service">
                      <span>
                        Servicio
                      </span>

                      <strong>
                        {booking.services
                          ?.name ??
                          "Servicio"}
                      </strong>
                    </div>

                    <div className="bookings10-date">
                      <span>
                        Fecha y hora
                      </span>

                      {booking.slots ? (
                        <>
                          <strong>
                            {formatDate(
                              booking
                                .slots
                                .start_at
                            )}
                          </strong>

                          <small>
                            <Clock3
                              size={13}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            {formatTime(
                              booking
                                .slots
                                .start_at
                            )}
                          </small>
                        </>
                      ) : (
                        <strong>
                          Sin horario
                        </strong>
                      )}
                    </div>

                    <div className="bookings10-actions">
                      <button
                        type="button"
                        className="btn primary"
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          completeBooking(
                            booking.id
                          )
                        }
                      >
                        <CheckCircle2
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        {loadingId ===
                        booking.id
                          ? "Procesando..."
                          : "Completada"}
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          noShowBooking(
                            booking.id
                          )
                        }
                      >
                        <UserX
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        No se presentó
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>

            <Pagination
              paginationPath={paginationPath}
              page={
                effectivePendingPage
              }
              pages={
                pendingPages
              }
              param="pendingPage"
              currentPages={currentPages}
              onChange={setLocalPendingPage}
            />
          </>
        )}
      </section>

      <section className="bookings10-card">
        <div className="bookings10-section-head">
          <span className="bookings10-icon">
            <Clock3
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="bookings10-kicker">
              Histórico
            </span>

            <h2>
              Historial
            </h2>

            <p>
              Últimos cambios realizados sobre tus reservas, ordenados por actividad reciente.
            </p>
          </div>

          <span className="bookings10-count">
            {pageData.history.total}
          </span>
        </div>

        {pageData.history.total ===
        0 ? (
          <div className="bookings10-empty">
            <strong>
              Todavía no hay historial
            </strong>

            <p>
              Las reservas cerradas aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            <div className="bookings10-history">
              <div
                className="bookings10-history-head"
                aria-hidden="true"
              >
                <span>
                  Cliente
                </span>

                <span>
                  Fecha de la cita
                </span>

                <span>
                  Última acción
                </span>

                <span>
                  Estado
                </span>
              </div>

              {visibleHistory.map(
                (
                  booking
                ) => (
                  <article
                    className="bookings10-history-row"
                    key={
                      booking.id
                    }
                  >
                    <div className="bookings10-history-customer">
                      <strong>
                        {booking.status ===
                        "CANCELLED_ACCOUNT_DELETED"
                          ? "Usuario eliminado"
                          : booking.profiles
                              ?.name ??
                            "Cliente"}
                      </strong>

                      <span>
                        {booking.services
                          ?.name ??
                          "Servicio"}
                      </span>
                    </div>

                    <div className="bookings10-history-date">
                      {booking.slots ? (
                        <>
                          <strong>
                            {formatDate(
                              booking
                                .slots
                                .start_at
                            )}
                          </strong>

                          <span>
                            {formatTime(
                              booking
                                .slots
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

                    <div className="bookings10-history-action-date">
                      <strong>
                        {formatActionDateTime(
                          getActionDate(
                            booking
                          )
                        )}
                      </strong>
                    </div>

                    <div className="bookings10-history-status">
                      <span
                        className={`bookings10-status is-${booking.status.toLowerCase()}`}
                      >
                        {booking.status ===
                        "COMPLETED" && (
                          <CheckCircle2
                            size={12}
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        )}

                        {booking.status ===
                        "NO_SHOW" && (
                          <UserX
                            size={12}
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        )}

                        {booking.status.startsWith(
                          "CANCELLED_"
                        ) && (
                          <XCircle
                            size={12}
                            strokeWidth={2.5}
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

            <Pagination
              paginationPath={paginationPath}
              page={
                effectiveHistoryPage
              }
              pages={
                historyPages
              }
              param="historyPage"
              currentPages={currentPages}
              onChange={setLocalHistoryPage}
            />
          </>
        )}
      </section>

      <style jsx>{`
        .bookings10 {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .bookings10-summary {
          display: grid;
          grid-template-columns:
            repeat(5, 1fr);
          gap: 10px;
        }

        .bookings10-summary > div {
          padding: 13px 15px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
        }

        .bookings10-summary span,
        .bookings10-summary strong {
          display: block;
        }

        .bookings10-summary span {
          color: var(--muted);
          font-size: 11px;
        }

        .bookings10-summary strong {
          margin-top: 3px;
          font-size: 22px;
          line-height: 1;
        }

        .bookings10-message {
          padding: 11px 13px;
          border: 1px solid #d7d0ff;
          border-radius: 11px;
          background: #f5f2ff;
          color: #5c4bc2;
          font-size: 12px;
          font-weight: 750;
        }

        .bookings10-toast {
          position: fixed;
          top: 86px;
          right: 22px;
          z-index: 1200;
          width: min(390px, calc(100vw - 28px));
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
          border: 1px solid #b8ebc9;
          border-radius: 14px;
          background: #effaf3;
          color: #176b3a;
          box-shadow:
            0 18px 45px
            rgba(31,27,48,.14);
          font-size: 12px;
          font-weight: 800;
          animation:
            bookings10ToastIn
            .18s ease-out;
        }

        @keyframes bookings10ToastIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .bookings10-card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 12px 32px
            rgba(31,27,48,.025);
          overflow: hidden;
        }

        .bookings10-section-head {
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            auto;
          align-items: flex-start;
          gap: 11px;
          padding: 18px 19px 14px;
          border-bottom:
            1px solid #efedf2;
        }

        .bookings10-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .bookings10-icon.is-warning {
          background: #fff6df;
          color: #b7791f;
        }

        .bookings10-kicker {
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
        }

        .bookings10-kicker.is-warning {
          color: #a56710;
        }

        .bookings10-section-head h2 {
          margin: 2px 0 3px;
          font-size: 22px;
          line-height: 1.18;
          letter-spacing: -.025em;
        }

        .bookings10-section-head p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .bookings10-count {
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

        .bookings10-count.is-warning {
          background: #fff6df;
          color: #a56710;
        }

        .bookings10-list {
          display: grid;
        }

        .bookings10-row {
          display: grid;
          grid-template-columns:
            minmax(220px, 1.2fr)
            minmax(145px, .7fr)
            minmax(230px, 1fr)
            auto;
          align-items: center;
          gap: 18px;
          padding: 14px 18px;
          border-bottom:
            1px solid #efedf2;
        }

        .bookings10-row:last-child {
          border-bottom: 0;
        }

        .bookings10-customer {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .bookings10-avatar {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .bookings10-avatar svg {
          display: block;
          margin: 0;
          flex: 0 0 auto;
        }

        .bookings10-avatar.is-warning {
          background: #fff6df;
          color: #a56710;
        }
        .bookings10-customer > div {
          min-width: 0;
        }

        .bookings10-customer strong,
        .bookings10-customer span {
          display: block;
        }

        .bookings10-customer strong {
          font-size: 13px;
        }

        .bookings10-customer span {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          overflow: hidden;
          color: var(--muted);
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bookings10-service,
        .bookings10-date {
          min-width: 0;
        }

        .bookings10-service > span,
        .bookings10-date > span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 750;
        }

        .bookings10-service strong,
        .bookings10-date strong {
          display: block;
          font-size: 12px;
          line-height: 1.35;
        }

        .bookings10-service small,
        .bookings10-date small {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          color: var(--muted);
          font-size: 10.5px;
        }

        .bookings10-action,
        .bookings10-actions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
        }

        .bookings10-action .btn,
        .bookings10-actions .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 11px;
        }

        .bookings10-cancel {
          border-color: #ffc9c9 !important;
          background: #fff !important;
          color: #b42318 !important;
        }

        .bookings10-history {
          display: grid;
        }

        .bookings10-history-head,
        .bookings10-history-row {
          display: grid;
          grid-template-columns:
            minmax(190px, 1fr)
            minmax(260px, 1.15fr)
            minmax(180px, .78fr)
            minmax(220px, auto);
          align-items: center;
          gap: 18px;
        }

        .bookings10-history-head {
          padding: 9px 18px;
          border-bottom:
            1px solid #e9e7ed;
          background: #faf9fc;
        }

        .bookings10-history-head span {
          color: var(--muted);
          font-size: 9.5px;
          font-weight: 800;
        }

        .bookings10-history-head span:last-child {
          text-align: right;
        }

        .bookings10-history-row {
          min-height: 64px;
          padding: 12px 18px;
          border-bottom:
            1px solid #efedf2;
        }

        .bookings10-history-row:last-child {
          border-bottom: 0;
        }

        .bookings10-history-customer strong,
        .bookings10-history-customer > span,
        .bookings10-history-date strong,
        .bookings10-history-date > span,
        .bookings10-history-action-date strong {
          display: block;
        }

        .bookings10-history-customer strong {
          font-size: 12px;
        }

        .bookings10-history-customer > span,
        .bookings10-history-date > span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 10.5px;
        }

        .bookings10-history-date strong,
        .bookings10-history-action-date strong {
          font-size: 11.5px;
          line-height: 1.35;
        }

        .bookings10-history-status {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .bookings10-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .bookings10-status.is-completed {
          background: #eaf8ef;
          color: #24774c;
        }

        .bookings10-status.is-no_show {
          background: #fff3df;
          color: #a45f00;
        }

        .bookings10-status[class*="is-cancelled_"] {
          background: #fff0f0;
          color: #b42318;
        }

        :global(.bookings10-pagination) {
          display: grid;
          grid-template-columns:
            minmax(112px, auto)
            auto
            minmax(112px, auto);
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 14px 18px;
          border-top:
            1px solid #efedf2;
          background: #fff;
        }

        :global(.bookings10-pagination .btn) {
          min-width: 112px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin: 0;
          padding: 8px 12px;
          font-size: 11px;
          line-height: 1.2;
        }

        :global(.bookings10-pagination .btn:disabled),
        :global(.bookings10-pagination .btn.is-disabled) {
          opacity: .45;
        }

        :global(.bookings10-pagination span) {
          min-width: 96px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 750;
          text-align: center;
          white-space: nowrap;
        }

        .bookings10-empty {
          padding: 26px 18px;
          text-align: center;
        }

        .bookings10-empty strong {
          display: block;
          font-size: 13px;
        }

        .bookings10-empty p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        @media (max-width: 920px) {
          .bookings10-row {
            grid-template-columns:
              minmax(0, 1fr)
              minmax(160px, auto);
          }

          .bookings10-service,
          .bookings10-date {
            grid-column: 1;
          }

          .bookings10-action,
          .bookings10-actions {
            grid-column: 2;
            grid-row: 1 / span 3;
            align-self: center;
          }

          .bookings10-history-head,
          .bookings10-history-row {
            grid-template-columns:
              minmax(0, 1fr)
              minmax(180px, .95fr)
              minmax(155px, .75fr)
              auto;
            gap: 12px;
          }
        }

        @media (max-width: 640px) {
          .bookings10 {
            gap: 10px;
            margin-top: 10px;
          }

          .bookings10-summary {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .bookings10-section-head {
            grid-template-columns:
              auto
              minmax(0, 1fr)
              auto;
            padding: 15px;
          }

          .bookings10-row {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 14px;
          }

          .bookings10-service,
          .bookings10-date,
          .bookings10-action,
          .bookings10-actions {
            grid-column: auto;
            grid-row: auto;
          }

          .bookings10-action,
          .bookings10-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .bookings10-action .btn,
          .bookings10-actions .btn {
            width: 100%;
          }

          .bookings10-history-head {
            display: none;
          }

          .bookings10-history-row {
            grid-template-columns: 1fr;
            gap: 9px;
            padding: 14px;
          }

          .bookings10-history-status {
            justify-content: flex-start;
          }

          .bookings10-status {
            width: fit-content;
          }

          .bookings10-toast {
            top: 74px;
            right: 14px;
            left: 14px;
            width: auto;
          }

          :global(.bookings10-pagination) {
            grid-template-columns:
              minmax(0, 1fr)
              auto
              minmax(0, 1fr);
            gap: 8px;
            padding: 12px 14px;
          }

          :global(.bookings10-pagination .btn) {
            width: 100%;
            min-width: 0;
            padding: 8px 9px;
          }

          :global(.bookings10-pagination span) {
            min-width: 0;
          }
        }
      `}</style>
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => { if (!open) finishConfirmation(false); }}
        title={confirmation?.title ?? "Confirmar acción"}
        description={confirmation?.description ?? ""}
        variant={confirmation?.variant}
        confirmLabel={confirmation?.confirmLabel}
        onConfirm={() => finishConfirmation(true)}
      />
    </div>
  );
}
