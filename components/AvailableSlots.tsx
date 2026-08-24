"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  CalendarDays,
  Check,
  Clock3,
  Mail,
} from "lucide-react";
import { useAccessibleDialog } from "@/components/ui/useAccessibleDialog";


type Service = {
  id: string;
  name: string;
  duration_minutes: number;
};

type Slot = {
  id: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

type PaginationData = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
};

type AvailableSlotsResponse = {
  slots: Slot[];

  pagination: PaginationData;

  filters: {
    serviceId: string;
    date: string | null;
  };
};

type Props = {
  businessId: string;
  services: Service[];
  loggedIn: boolean;
  selectedServiceId: string;

  onServiceChange: (
    serviceId: string
  ) => void;

  requestedSlot:
    Slot | null;
};

type SelectedSlot = {
  slot: Slot;
  serviceName: string;
};

const PAGE_SIZE =
  5;

  export function AvailableSlots({
    businessId,
    services,
    loggedIn,
    selectedServiceId,
    onServiceChange,
    requestedSlot,
  }: Props) {
  const router =
    useRouter();


  const [
    slots,
    setSlots,
  ] =
    useState<Slot[]>(
      []
    );

  const [
    pagination,
    setPagination,
  ] =
    useState<PaginationData>({
      page:
        1,

      pageSize:
        PAGE_SIZE,

      total:
        0,

      totalPages:
        1,

      from:
        0,

      to:
        0,
    });

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState("");

  const [
    loadingSlots,
    setLoadingSlots,
  ] =
    useState(true);

  const [
    slotsError,
    setSlotsError,
  ] =
    useState("");

  const [
    loadingId,
    setLoadingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    selectedSlot,
    setSelectedSlot,
  ] =
    useState<
      SelectedSlot |
      null
    >(null);

  const [
    confirmedSlot,
    setConfirmedSlot,
  ] =
    useState<
      SelectedSlot |
      null
    >(null);

  const confirmationDialogRef = useRef<HTMLDivElement>(null);
  const successDialogRef = useRef<HTMLDivElement>(null);
  const bookingTriggerRef = useRef<HTMLElement | null>(null);
  const onConfirmationKeyDown = useAccessibleDialog({
    open: selectedSlot !== null,
    onClose: closeConfirmation,
    dialogRef: confirmationDialogRef,
    restoreFocusRef: bookingTriggerRef,
    closeOnEscape: loadingId === null,
  });
  const onSuccessKeyDown = useAccessibleDialog({
    open: confirmedSlot !== null,
    onClose: closeSuccess,
    dialogRef: successDialogRef,
    restoreFocusRef: bookingTriggerRef,
  });

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
      "success" |
      "error" |
      null
    >(null);

  /*
   * ============================================================
   * CARGAR CITAS PAGINADAS
   * ============================================================
   */

  const loadSlots =
    useCallback(
      async (
        requestedPage:
          number
      ) => {
        setLoadingSlots(
          true
        );

        setSlotsError("");

        try {
          const params =
            new URLSearchParams({
              page:
                String(
                  requestedPage
                ),

              pageSize:
                String(
                  PAGE_SIZE
                ),

              serviceId:
                selectedServiceId,
            });

          if (
            selectedDate
          ) {
            params.set(
              "date",
              selectedDate
            );
          }

          const response =
            await fetch(
              `/api/businesses/${businessId}/available-slots?${params.toString()}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const result:
            AvailableSlotsResponse & {
              error?:
                string;
            } =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ??
                "No se han podido cargar las citas disponibles."
            );
          }

          setSlots(
            result.slots ??
              []
          );

          setPagination(
            result.pagination
          );
        } catch (
          error
        ) {
          console.error(
            "Error loading available slots:",
            error
          );

          setSlots(
            []
          );

          setSlotsError(
            error instanceof
              Error
              ? error.message
              : "No se han podido cargar las citas disponibles."
          );
        } finally {
          setLoadingSlots(
            false
          );
        }
      },
      [
        businessId,
        selectedDate,
        selectedServiceId,
      ]
    );

  /*
   * Al cambiar el servicio o la fecha,
   * cargamos siempre la primera página.
   */

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void loadSlots(
            1
          );
        },
        0
      );

    return () =>
      window.clearTimeout(
        timeoutId
      );
  }, [
    loadSlots,
  ]);

  /*
   * ============================================================
   * SERVICIOS Y FORMATO
   * ============================================================
   */

  function getServiceName(
    serviceId:
      string |
      null
  ) {
    return (
      services.find(
        (
          service
        ) =>
          service.id ===
          serviceId
      )?.name ??
      "Cita"
    );
  }

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

        timeZone:
          "Europe/Madrid",
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

        timeZone:
          "Europe/Madrid",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  function changeService(
    serviceId:
      string
  ) {
    onServiceChange(
      serviceId
    );

    setMessage("");
    setMessageType(
      null
    );
  }

  function changeDate(
    value:
      string
  ) {
    setSelectedDate(
      value
    );

    setMessage("");
    setMessageType(
      null
    );
  }

  function clearDate() {
    setSelectedDate(
      ""
    );

    setMessage("");
    setMessageType(
      null
    );
  }

  /*
   * ============================================================
   * CAMBIAR PÁGINA
   * ============================================================
   */

  function changePage(
    page:
      number
  ) {
    if (
      loadingSlots ||
      page <
        1 ||
      page >
        pagination.totalPages ||
      page ===
        pagination.page
    ) {
      return;
    }

    void loadSlots(
      page
    );
  }

  /*
   * ============================================================
   * RESERVAR
   * ============================================================
   */

  function openConfirmation(
    slot:
      Slot
  ) {
    if (
      !loggedIn
    ) {
      const nextUrl =
        `${window.location.pathname}${window.location.search}`;
    
      router.push(
        `/login?next=${encodeURIComponent(
          nextUrl
        )}`
      );
    
      return;
    }

    bookingTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    setMessage("");
    setMessageType(
      null
    );

    setSelectedSlot({
      slot,

      serviceName:
        getServiceName(
          slot.service_id
        ),
    });
  }

  function closeConfirmation() {
    if (
      loadingId
    ) {
      return;
    }

    setSelectedSlot(
      null
    );
  }

  async function reserve() {
    if (
      !selectedSlot
    ) {
      return;
    }

    const slotId =
      selectedSlot.slot.id;

    setLoadingId(
      slotId
    );

    setMessage("");
    setMessageType(
      null
    );

    const bookingResponse =
  await fetch(
    "/api/bookings/create",
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          slotId,
        }),
    }
  );

const bookingResult =
  (
    await bookingResponse.json()
  ) as {
    bookingId?: string;
    calendarSynced?: boolean;
    error?: string;
  };

if (
  !bookingResponse.ok ||
  !bookingResult.bookingId
) {
  setMessage(
    bookingResult.error ??
      "No se ha podido realizar la reserva."
  );

  setMessageType(
    "error"
  );

  setLoadingId(
    null
  );

  return;
}

    const reserved =
      selectedSlot;

    setSelectedSlot(
      null
    );

    setConfirmedSlot(
      reserved
    );

    setLoadingId(
      null
    );

    /*
     * Recargamos la misma página.
     * Si era el último registro, la API devolverá
     * automáticamente la última página válida.
     */

    await loadSlots(
      pagination.page
    );

    router.refresh();
  }

  function closeSuccess() {
    setConfirmedSlot(
      null
    );
  }

  function goToBookings() {
    router.push(
      "/account/bookings"
    );
  }

  /*
   * ============================================================
   * PÁGINAS VISIBLES
   * ============================================================
   */

  const visiblePages =
    useMemo(
      () => {
        const pages:
          Array<
            number |
            "left" |
            "right"
          > =
          [];

        const {
          page,
          totalPages,
        } =
          pagination;

        if (
          totalPages <=
          7
        ) {
          for (
            let current =
              1;
            current <=
            totalPages;
            current++
          ) {
            pages.push(
              current
            );
          }

          return pages;
        }

        pages.push(
          1
        );

        if (
          page >
          4
        ) {
          pages.push(
            "left"
          );
        }

        const start =
          Math.max(
            2,
            page -
              1
          );

        const end =
          Math.min(
            totalPages -
              1,
            page +
              1
          );

        for (
          let current =
            start;
          current <=
          end;
          current++
        ) {
          pages.push(
            current
          );
        }

        if (
          page <
          totalPages -
            3
        ) {
          pages.push(
            "right"
          );
        }

        pages.push(
          totalPages
        );

        return pages;
      },
      [
        pagination,
      ]
    );


  const groupedSlots =
    useMemo(
      () => {
        const groups =
          new Map<
            string,
            Slot[]
          >();

        slots.forEach(
          (
            slot
          ) => {
            const key =
              new Intl.DateTimeFormat(
                "en-CA",
                {
                  year:
                    "numeric",

                  month:
                    "2-digit",

                  day:
                    "2-digit",

                  timeZone:
                    "Europe/Madrid",
                }
              ).format(
                new Date(
                  slot.start_at
                )
              );

            const current =
              groups.get(
                key
              ) ??
              [];

            current.push(
              slot
            );

            groups.set(
              key,
              current
            );
          }
        );

        return Array.from(
          groups.entries()
        ).map(
          ([
            key,
            daySlots,
          ]) => ({
            key,
            slots:
              daySlots,
          })
        );
      },
      [
        slots,
      ]
    );
    return (
      <>
        <div className="slots6">
          <div className="slots6-toolbar">
            {services.length >
              0 && (
              <div className="slots6-services">
                <button
                  type="button"
                  className={
                    selectedServiceId ===
                    "all"
                      ? "slots6-filter is-active"
                      : "slots6-filter"
                  }
                  disabled={
                    loadingSlots
                  }
                  onClick={() =>
                    changeService(
                      "all"
                    )
                  }
                >
                  Todos
                </button>

                {services.map(
                  (
                    service
                  ) => (
                    <button
                      type="button"
                      key={
                        service.id
                      }
                      className={
                        selectedServiceId ===
                        service.id
                          ? "slots6-filter is-active"
                          : "slots6-filter"
                      }
                      disabled={
                        loadingSlots
                      }
                      onClick={() =>
                        changeService(
                          service.id
                        )
                      }
                    >
                      {service.name}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="slots6-date">
              <label>
                <span>
                  Elegir fecha
                </span>

                <input
                  type="date"
                  value={
                    selectedDate
                  }
                  min={
                    new Date()
                      .toLocaleDateString(
                        "en-CA",
                        {
                          timeZone:
                            "Europe/Madrid",
                        }
                      )
                  }
                  disabled={
                    loadingSlots
                  }
                  onChange={(
                    event
                  ) =>
                    changeDate(
                      event.target.value
                    )
                  }
                />
              </label>

              {selectedDate && (
                <button
                  type="button"
                  className="slots6-clear"
                  disabled={
                    loadingSlots
                  }
                  onClick={
                    clearDate
                  }
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {requestedSlot && (
            <div className="slots6-requested">
              <div>
                <span className="kicker">
                  Cita seleccionada
                </span>

                <strong>
                  {getServiceName(
                    requestedSlot.service_id
                  )}
                </strong>

                <span>
                  {formatDate(
                    requestedSlot.start_at
                  )}
                  {" · "}
                  {formatTime(
                    requestedSlot.start_at
                  )}
                </span>
              </div>

              <button
                type="button"
                className="btn primary"
                disabled={
                  loadingId !==
                  null
                }
                onClick={() =>
                  openConfirmation(
                    requestedSlot
                  )
                }
              >
                Reservar esta cita
              </button>
            </div>
          )}

          {!slotsError && (
            <div className="slots6-meta">
              <span>
                {pagination.total >
                0
                  ? `${pagination.total} citas disponibles`
                  : "No hay citas disponibles"}
              </span>

              {pagination.total >
                0 && (
                <span>
                  Página {pagination.page} de {pagination.totalPages}
                </span>
              )}
            </div>
          )}

          {loadingSlots ? (
            <div className="slots6-state">
              <strong>
                Cargando citas…
              </strong>

              <span>
                Consultando la disponibilidad del negocio.
              </span>
            </div>
          ) : slotsError ? (
            <div className="slots6-state is-error" role="alert">
              <strong>
                No se han podido cargar las citas.
              </strong>

              <span>
                {slotsError}
              </span>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  void loadSlots(
                    1
                  )
                }
              >
                Volver a intentarlo
              </button>
            </div>
          ) : slots.length ===
            0 ? (
            <div className="slots6-state">
              <strong>
                No hay citas disponibles
              </strong>

              <span>
                {selectedDate
                  ? "No hay citas libres para la fecha y el servicio seleccionados."
                  : selectedServiceId !==
                      "all"
                    ? "Ahora mismo no hay citas disponibles para este servicio."
                    : "Este negocio no tiene citas libres en este momento."}
              </span>

              {selectedDate && (
                <button
                  type="button"
                  className="btn"
                  onClick={
                    clearDate
                  }
                >
                  Ver todas las fechas
                </button>
              )}
            </div>
          ) : (
            <div className="slots6-days">
              {groupedSlots.map(
                (
                  group
                ) => (
                  <article
                    className="slots6-day"
                    key={
                      group.key
                    }
                  >
                    <div className="slots6-day-head">
                      <strong>
                        {formatDate(
                          group.slots[0]
                            .start_at
                        )}
                      </strong>

                    </div>

                    <div className="slots6-times">
                      {group.slots.map(
                        (
                          slot
                        ) => (
                          <button
                            type="button"
                            className="slots6-time"
                            key={
                              slot.id
                            }
                            disabled={
                              loadingId !==
                              null
                            }
                            onClick={() =>
                              openConfirmation(
                                slot
                              )
                            }
                          >
                            <strong>
                              {formatTime(
                                slot.start_at
                              )}
                            </strong>

                            <span>
                              {getServiceName(
                                slot.service_id
                              )}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}

          {pagination.totalPages >
            1 && (
            <div className="slots6-pagination">
              <button
                type="button"
                className="btn"
                disabled={
                  loadingSlots ||
                  pagination.page <=
                    1
                }
                onClick={() =>
                  changePage(
                    pagination.page -
                      1
                  )
                }
              >
                ← Anterior
              </button>

              <div className="slots6-pages">
                {visiblePages.map(
                  (
                    item,
                    index
                  ) =>
                    typeof item ===
                    "number" ? (
                      <button
                        type="button"
                        key={
                          item
                        }
                        className={
                          item ===
                          pagination.page
                            ? "slots6-page is-active"
                            : "slots6-page"
                        }
                        disabled={
                          loadingSlots
                        }
                        onClick={() =>
                          changePage(
                            item
                          )
                        }
                      >
                        {item}
                      </button>
                    ) : (
                      <span
                        key={`${item}-${index}`}
                        className="slots6-ellipsis"
                      >
                        …
                      </span>
                    )
                )}
              </div>

              <button
                type="button"
                className="btn"
                disabled={
                  loadingSlots ||
                  pagination.page >=
                    pagination.totalPages
                }
                onClick={() =>
                  changePage(
                    pagination.page +
                      1
                  )
                }
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>

      {/* ========================================================
          MODAL DE CONFIRMACIÓN
          ======================================================== */}

      {selectedSlot && (
        <div
          className="slottye-booking-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirmation();
            }
          }}
        >
          <div
            ref={confirmationDialogRef}
            className="slottye-booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-booking-title"
            aria-describedby="confirm-booking-description"
            tabIndex={-1}
            onKeyDown={onConfirmationKeyDown}
          >
            <div className="slottye-booking-modal-head">
              <div>
                <div className="kicker">
                  Reserva
                </div>

                <h2 id="confirm-booking-title">
                  Confirmar reserva
                </h2>

                <p id="confirm-booking-description">
                  Revisa los datos antes de confirmar.
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                className="slottye-booking-modal-close"
                disabled={loadingId !== null}
                onClick={closeConfirmation}
              >
                ×
              </button>
            </div>

            <div className="slottye-booking-summary">
              <div className="slottye-booking-summary-top">
                <div>
                  <span className="slottye-booking-eyebrow">
                    Servicio
                  </span>

                  <strong className="slottye-booking-service">
                    {selectedSlot.serviceName}
                  </strong>
                </div>

                <span className="slottye-booking-status">
                  Pendiente de confirmar
                </span>
              </div>

              <div className="slottye-booking-datetime">
                <div className="slottye-booking-datetime-item">
                  <CalendarDays
                    size={17}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <div>
                    <span>Fecha</span>
                    <strong>
                      {formatDate(
                        selectedSlot.slot.start_at
                      )}
                    </strong>
                  </div>
                </div>

                <div className="slottye-booking-datetime-item">
                  <Clock3
                    size={17}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <div>
                    <span>Hora</span>
                    <strong>
                      {formatTime(
                        selectedSlot.slot.start_at
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="slottye-booking-email">
              <span
                className="slottye-booking-email-icon"
                aria-hidden="true"
              >
                <Mail
                  size={17}
                  strokeWidth={2}
                />
              </span>

              <div>
                <strong>
                  Confirmación por correo
                </strong>

                <p>
                  Recibirás un email con los detalles de tu reserva.
                </p>

                <small>
                  Si no lo encuentras, revisa spam o promociones.
                </small>
              </div>
            </div>

            {message &&
              messageType === "error" && (
                <div
                  role="alert"
                  className="slottye-booking-error"
                >
                  {message}
                </div>
              )}

            <div className="slottye-booking-modal-actions">
              <button
                type="button"
                className="btn"
                disabled={loadingId !== null}
                onClick={closeConfirmation}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={loadingId !== null}
                onClick={reserve}
              >
                {loadingId
                  ? "Reservando..."
                  : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE ÉXITO
          ======================================================== */}

      {confirmedSlot && (
        <div
          className="slottye-booking-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSuccess();
          }}
        >
          <div
            ref={successDialogRef}
            className="slottye-booking-modal slottye-booking-success"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-success-title"
            aria-describedby="booking-success-description"
            tabIndex={-1}
            onKeyDown={onSuccessKeyDown}
          >
            <div
              className="slottye-booking-success-icon"
              aria-hidden="true"
            >
              <Check
                size={30}
                strokeWidth={2.4}
              />
            </div>

            <h2 id="booking-success-title">
              ¡Tu cita está confirmada!
            </h2>

            <p id="booking-success-description" className="slottye-booking-success-lead">
              Ya está todo listo. Hemos guardado tu reserva.
            </p>

            <div className="slottye-booking-summary is-success">
              <span className="slottye-booking-eyebrow">
                Reserva confirmada
              </span>

              <strong className="slottye-booking-service">
                {confirmedSlot.serviceName}
              </strong>

              <div className="slottye-booking-datetime">
                <div className="slottye-booking-datetime-item">
                  <CalendarDays
                    size={17}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <div>
                    <span>Fecha</span>
                    <strong>
                      {formatDate(
                        confirmedSlot.slot.start_at
                      )}
                    </strong>
                  </div>
                </div>

                <div className="slottye-booking-datetime-item">
                  <Clock3
                    size={17}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <div>
                    <span>Hora</span>
                    <strong>
                      {formatTime(
                        confirmedSlot.slot.start_at
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="slottye-booking-email is-success">
              <span
                className="slottye-booking-email-icon"
                aria-hidden="true"
              >
                <Mail
                  size={17}
                  strokeWidth={2}
                />
              </span>

              <div>
                <strong>
                  Confirmación enviada
                </strong>

                <p>
                  Te hemos enviado un email con todos los detalles.
                </p>

                <small>
                  Si no lo encuentras, revisa spam o promociones.
                </small>
              </div>
            </div>

            <div className="slottye-booking-modal-actions is-centered">
              <button
                type="button"
                className="btn"
                onClick={closeSuccess}
              >
                Seguir buscando
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={goToBookings}
              >
                Ver mis citas
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slottye-booking-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(24, 22, 34, 0.56);
          backdrop-filter: blur(5px);
        }

        .slottye-booking-modal {
          width: 100%;
          max-width: 520px;
          padding: 26px;
          border: 1px solid #e8e5ef;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 28px 80px rgba(31, 27, 48, 0.22);
        }

        .slottye-booking-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .slottye-booking-modal-head h2,
        .slottye-booking-success h2 {
          margin: 8px 0 0;
          letter-spacing: -0.025em;
        }

        .slottye-booking-modal-head p {
          margin: 7px 0 0;
          color: #777381;
          font-size: 13px;
          line-height: 1.5;
        }

        .slottye-booking-modal-close {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #e8e5ef;
          border-radius: 10px;
          background: #faf9fc;
          color: #777381;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
        }

        .slottye-booking-summary {
          margin-top: 20px;
          padding: 18px;
          border: 1px solid #ded8fb;
          border-radius: 16px;
          background: linear-gradient(135deg, #fbfaff 0%, #f6f3ff 100%);
        }

        .slottye-booking-summary-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .slottye-booking-eyebrow {
          display: block;
          margin-bottom: 4px;
          color: #8a8695;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .slottye-booking-service {
          display: block;
          color: #1f1d27;
          font-size: 18px;
          line-height: 1.3;
        }

        .slottye-booking-status {
          padding: 6px 10px;
          border: 1px solid #ddd6fe;
          border-radius: 999px;
          background: #eee9ff;
          color: #654cf4;
          font-size: 11px;
          font-weight: 800;
        }

        .slottye-booking-datetime {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .slottye-booking-datetime-item {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid #ebe7f5;
          border-radius: 12px;
          background: #fff;
          color: #6c55f7;
        }

        .slottye-booking-datetime-item div {
          min-width: 0;
        }

        .slottye-booking-datetime-item span {
          display: block;
          color: #908c99;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .slottye-booking-datetime-item strong {
          display: block;
          margin-top: 2px;
          color: #25222e;
          font-size: 12px;
          line-height: 1.35;
        }

        .slottye-booking-datetime-item:last-child strong {
          font-size: 15px;
        }

        .slottye-booking-email {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 16px;
          padding: 14px 15px;
          border: 1px solid #e3defc;
          border-radius: 14px;
          background: #f8f6ff;
        }

        .slottye-booking-email-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          background: #ebe6ff;
          color: #654cf4;
        }

        .slottye-booking-email strong {
          display: block;
          color: #292631;
          font-size: 13px;
          line-height: 1.4;
        }

        .slottye-booking-email p {
          margin: 3px 0 0;
          color: #676371;
          font-size: 12.5px;
          line-height: 1.5;
        }

        .slottye-booking-email small {
          display: block;
          margin-top: 3px;
          color: #9793a0;
          font-size: 11.5px;
          line-height: 1.45;
        }

        .slottye-booking-error {
          margin-top: 16px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 600;
        }

        .slottye-booking-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .slottye-booking-modal-actions.is-centered {
          justify-content: center;
          margin-top: 24px;
        }

        .slottye-booking-success {
          padding: 28px;
          text-align: center;
        }

        .slottye-booking-success-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          margin: 0 auto;
          border: 1px solid #bde9cc;
          border-radius: 50%;
          background: #ecf9f0;
          color: #249255;
        }

        .slottye-booking-success-lead {
          margin: 7px 0 0;
          color: #777381;
          font-size: 13px;
          line-height: 1.5;
        }

        .slottye-booking-summary.is-success {
          border-color: #ccebd7;
          background: linear-gradient(135deg, #f8fdf9 0%, #f1faf4 100%);
          text-align: left;
        }

        .slottye-booking-summary.is-success .slottye-booking-eyebrow {
          color: #6d8a77;
        }

        .slottye-booking-summary.is-success .slottye-booking-datetime-item {
          border-color: #dcefe2;
          color: #249255;
        }

        .slottye-booking-email.is-success {
          border-color: #d8eee0;
          background: #f5fbf7;
          text-align: left;
        }

        .slottye-booking-email.is-success .slottye-booking-email-icon {
          background: #e5f6eb;
          color: #249255;
        }

        .slottye-booking-email.is-success strong {
          color: #285238;
        }

        .slottye-booking-email.is-success p {
          color: #587063;
        }

        .slottye-booking-email.is-success small {
          color: #839289;
        }

        @media (max-width: 560px) {
          .slottye-booking-modal-backdrop {
            padding: 12px;
          }

          .slottye-booking-modal,
          .slottye-booking-success {
            padding: 20px;
            border-radius: 18px;
          }

          .slottye-booking-datetime {
            grid-template-columns: 1fr;
          }

          .slottye-booking-status {
            width: fit-content;
          }

          .slottye-booking-modal-actions,
          .slottye-booking-modal-actions.is-centered {
            display: grid;
            grid-template-columns: 1fr;
          }

          .slottye-booking-modal-actions .btn {
            width: 100%;
          }
        }
      `}</style>

    </>
  );
}

