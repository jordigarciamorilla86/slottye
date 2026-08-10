"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

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
  10;

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

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

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
    void loadSlots(
      1
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

const bookingId =
  bookingResult.bookingId;

    if (
      bookingId
    ) {
      try {
        const notificationResponse =
          await fetch(
            "/api/notifications/booking-confirmed",
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
            await notificationResponse.json();

          console.error(
            "Error enviando confirmación:",
            result
          );
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Error enviando confirmación:",
          notificationError
        );
      }
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

    return (
      <>
        {/* ========================================================
            BUSCADOR DE FECHA
            ======================================================== */}
    
        <div
          className="panel"
          style={{
            marginBottom:
              18,
    
            padding:
              18,
          }}
        >
          <div
            style={{
              display:
                "flex",
    
              justifyContent:
                "space-between",
    
              alignItems:
                "flex-end",
    
              gap:
                14,
    
              flexWrap:
                "wrap",
            }}
          >
            <label
              style={{
                flex:
                  "1 1 260px",
              }}
            >
              <strong>
                Buscar por fecha
              </strong>
    
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
                style={
                  inputStyle
                }
              />
            </label>
    
            {selectedDate && (
              <button
                type="button"
                className="btn"
                disabled={
                  loadingSlots
                }
                onClick={
                  clearDate
                }
              >
                Limpiar fecha
              </button>
            )}
          </div>
    
          <p
            className="muted"
            style={{
              margin:
                "10px 0 0",
    
              fontSize:
                13,
            }}
          >
            {selectedDate
              ? "Mostrando únicamente las citas del día seleccionado."
              : "Selecciona un día para consultar su disponibilidad."}
          </p>
        </div>
    
        {/* ========================================================
            FILTRO POR SERVICIO
            ======================================================== */}
    
        {services.length >
          0 && (
          <div
            style={{
              display:
                "flex",
    
              flexWrap:
                "wrap",
    
              gap:
                10,
    
              marginBottom:
                18,
            }}
          >
            <button
              type="button"
              className={
                selectedServiceId ===
                "all"
                  ? "btn primary"
                  : "btn"
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
              Todos los servicios
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
                      ? "btn primary"
                      : "btn"
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
    
        {/* ========================================================
            CITA SELECCIONADA DESDE EL BUSCADOR
            ======================================================== */}
    
        {requestedSlot && (
          <div
            style={{
              marginBottom:
                22,
    
              padding:
                20,
    
              border:
                "1px solid #c4b5fd",
    
              borderRadius:
                18,
    
              background:
                "linear-gradient(135deg, #f5f3ff 0%, #ffffff 75%)",
    
              boxShadow:
                "0 10px 30px rgba(76, 29, 149, 0.08)",
            }}
          >
            <div
              className="kicker"
              style={{
                marginBottom:
                  8,
              }}
            >
              ⚡ Cita que has elegido
            </div>
    
            <div
              style={{
                display:
                  "flex",
    
                justifyContent:
                  "space-between",
    
                alignItems:
                  "center",
    
                gap:
                  20,
    
                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <h3
                  style={{
                    margin:
                      0,
                  }}
                >
                  {getServiceName(
                    requestedSlot.service_id
                  )}
                </h3>
    
                <div
                  className="meta"
                  style={{
                    marginTop:
                      10,
                  }}
                >
                  📅{" "}
                  {formatDate(
                    requestedSlot.start_at
                  )}
                </div>
    
                <div
                  style={{
                    marginTop:
                      7,
    
                    fontSize:
                      24,
    
                    fontWeight:
                      800,
                  }}
                >
                  🕐{" "}
                  {formatTime(
                    requestedSlot.start_at
                  )}
                </div>
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
          </div>
        )}
    
        {/* ========================================================
            CONTADOR
            ======================================================== */}

     
      {!slotsError && (
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            gap:
              12,

            flexWrap:
              "wrap",

            marginBottom:
              14,
          }}
        >
          <div
            className="muted"
            style={{
              fontSize:
                13,
            }}
          >
            {pagination.total >
            0 ? (
              <>
                Mostrando{" "}
                <strong>
                  {pagination.from}
                </strong>
                {" – "}
                <strong>
                  {pagination.to}
                </strong>{" "}
                de{" "}
                <strong>
                  {pagination.total}
                </strong>{" "}
                citas disponibles.
              </>
            ) : (
              "No hay citas disponibles."
            )}
          </div>

          {pagination.total >
            0 && (
            <div
              className="muted"
              style={{
                fontSize:
                  13,
              }}
            >
              Página{" "}
              <strong>
                {pagination.page}
              </strong>{" "}
              de{" "}
              <strong>
                {pagination.totalPages}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ESTADO DE CARGA
          ======================================================== */}

      {loadingSlots ? (
        <div
          className="panel"
          aria-live="polite"
        >
          <h3>
            Cargando citas…
          </h3>

          <p className="muted">
            Estamos consultando la disponibilidad del negocio.
          </p>
        </div>
      ) : slotsError ? (
        <div
          role="alert"
          style={{
            padding:
              "16px 18px",

            border:
              "1px solid #fecaca",

            borderRadius:
              14,

            background:
              "#fef2f2",

            color:
              "#b91c1c",
          }}
        >
          <strong>
            No se han podido cargar las citas.
          </strong>

          <div
            style={{
              marginTop:
                6,
            }}
          >
            {slotsError}
          </div>

          <button
            type="button"
            className="btn"
            style={{
              marginTop:
                14,
            }}
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
        <div className="panel">
          <h3>
            No hay citas disponibles
          </h3>

          <p className="muted">
            {selectedDate
              ? "No hay citas libres para la fecha y el servicio seleccionados."
              : selectedServiceId !==
                  "all"
                ? "Ahora mismo no hay citas disponibles para este servicio."
                : "Este negocio no tiene citas libres en este momento."}
          </p>

          {selectedDate && (
            <button
              type="button"
              className="btn"
              style={{
                marginTop:
                  12,
              }}
              onClick={
                clearDate
              }
            >
              Ver todas las fechas
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              12,
          }}
        >
          {slots.map(
            (
              slot
            ) => (
              <div
                className="card"
                key={
                  slot.id
                }
              >
                <div className="card-body">
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "center",

                      gap:
                        20,

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin:
                            0,
                        }}
                      >
                        {getServiceName(
                          slot.service_id
                        )}
                      </h3>

                      <div
                        className="meta"
                        style={{
                          marginTop:
                            8,
                        }}
                      >
                        📅{" "}
                        {formatDate(
                          slot.start_at
                        )}
                      </div>

                      <div
                        style={{
                          fontSize:
                            22,

                          fontWeight:
                            800,

                          marginTop:
                            8,
                        }}
                      >
                        {formatTime(
                          slot.start_at
                        )}
                      </div>
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
                          slot
                        )
                      }
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================
          PAGINACIÓN
          ======================================================== */}

      {!loadingSlots &&
        !slotsError &&
        pagination.totalPages >
          1 && (
          <nav
            aria-label="Paginación de citas disponibles"
            style={{
              display:
                "flex",

              justifyContent:
                "center",

              alignItems:
                "center",

              gap:
                8,

              flexWrap:
                "wrap",

              marginTop:
                24,

              paddingTop:
                20,

              borderTop:
                "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              className="btn"
              disabled={
                pagination.page ===
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

            {visiblePages.map(
              (
                page
              ) => {
                if (
                  typeof page !==
                  "number"
                ) {
                  return (
                    <span
                      key={
                        page
                      }
                      className="muted"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  );
                }

                const active =
                  page ===
                  pagination.page;

                return (
                  <button
                    type="button"
                    key={
                      page
                    }
                    className={
                      active
                        ? "btn primary"
                        : "btn"
                    }
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    onClick={() =>
                      changePage(
                        page
                      )
                    }
                    style={{
                      minWidth:
                        42,
                    }}
                  >
                    {page}
                  </button>
                );
              }
            )}

            <button
              type="button"
              className="btn"
              disabled={
                pagination.page ===
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
          </nav>
        )}

      {/* ========================================================
          ERROR DE RESERVA
          ======================================================== */}

      {message &&
        messageType ===
          "error" &&
        !selectedSlot && (
          <div
            role="alert"
            style={{
              marginTop:
                18,

              padding:
                "14px 16px",

              borderRadius:
                14,

              border:
                "1px solid #ef4444",

              background:
                "#fef2f2",

              color:
                "#b91c1c",

              fontWeight:
                600,
            }}
          >
            ⚠️ {message}
          </div>
        )}

      {/* ========================================================
          MODAL DE CONFIRMACIÓN
          ======================================================== */}

      {selectedSlot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-booking-title"
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              10000,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding:
              20,

            background:
              "rgba(15, 23, 42, 0.52)",
          }}
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeConfirmation();
            }
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                520,

              padding:
                26,

              border:
                "1px solid var(--border)",

              borderRadius:
                18,

              background:
                "#ffffff",

              boxShadow:
                "0 22px 60px rgba(15, 23, 42, 0.24)",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  16,
              }}
            >
              <div>
                <div className="kicker">
                  Reserva
                </div>

                <h2
                  id="confirm-booking-title"
                  style={{
                    margin:
                      "8px 0 0",
                  }}
                >
                  Confirmar reserva
                </h2>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                disabled={
                  loadingId !==
                  null
                }
                onClick={
                  closeConfirmation
                }
                style={
                  closeButtonStyle
                }
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop:
                  20,

                padding:
                  18,

                border:
                  "1px solid #ddd6fe",

                borderRadius:
                  14,

                background:
                  "#faf5ff",
              }}
            >
              <strong
                style={{
                  display:
                    "block",

                  fontSize:
                    17,
                }}
              >
                {selectedSlot.serviceName}
              </strong>

              <div
                style={{
                  marginTop:
                    10,

                  color:
                    "#4b5563",

                  lineHeight:
                    1.7,
                }}
              >
                📅{" "}
                {formatDate(
                  selectedSlot.slot.start_at
                )}

                <br />

                🕐{" "}
                {formatTime(
                  selectedSlot.slot.start_at
                )}
              </div>
            </div>

            <div
              style={{
                marginTop:
                  16,

                padding:
                  "14px 16px",

                border:
                  "1px solid #fde68a",

                borderRadius:
                  14,

                background:
                  "#fffbeb",

                color:
                  "#92400e",

                fontSize:
                  13,

                lineHeight:
                  1.6,
              }}
            >
              <strong>
                Te enviaremos un correo de confirmación.
              </strong>

              <br />

              Si no lo recibes en unos minutos, revisa también Spam, Correo no deseado o Promociones.
            </div>

            {message &&
              messageType ===
                "error" && (
                <div
                  role="alert"
                  style={{
                    marginTop:
                      16,

                    padding:
                      "12px 14px",

                    border:
                      "1px solid #fecaca",

                    borderRadius:
                      12,

                    background:
                      "#fef2f2",

                    color:
                      "#b91c1c",

                    fontSize:
                      13,

                    fontWeight:
                      600,
                  }}
                >
                  ⚠️ {message}
                </div>
              )}

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap:
                  10,

                flexWrap:
                  "wrap",

                marginTop:
                  22,
              }}
            >
              <button
                type="button"
                className="btn"
                disabled={
                  loadingId !==
                  null
                }
                onClick={
                  closeConfirmation
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={
                  loadingId !==
                  null
                }
                onClick={
                  reserve
                }
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              10000,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding:
              20,

            background:
              "rgba(15, 23, 42, 0.52)",
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                520,

              padding:
                28,

              border:
                "1px solid var(--border)",

              borderRadius:
                18,

              background:
                "#ffffff",

              boxShadow:
                "0 22px 60px rgba(15, 23, 42, 0.24)",

              textAlign:
                "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width:
                  64,

                height:
                  64,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                margin:
                  "0 auto",

                borderRadius:
                  "50%",

                background:
                  "#dcfce7",

                fontSize:
                  32,
              }}
            >
              ✓
            </div>

            <h2
              id="booking-success-title"
              style={{
                margin:
                  "18px 0 8px",
              }}
            >
              ¡Tu cita está confirmada!
            </h2>

            <p
              className="muted"
              style={{
                margin:
                  0,
              }}
            >
              La reserva se ha realizado correctamente.
            </p>

            <div
              style={{
                marginTop:
                  20,

                padding:
                  18,

                border:
                  "1px solid #bbf7d0",

                borderRadius:
                  14,

                background:
                  "#f0fdf4",

                textAlign:
                  "left",
              }}
            >
              <strong
                style={{
                  display:
                    "block",

                  fontSize:
                    17,
                }}
              >
                {confirmedSlot.serviceName}
              </strong>

              <div
                style={{
                  marginTop:
                    10,

                  color:
                    "#374151",

                  lineHeight:
                    1.7,
                }}
              >
                📅{" "}
                {formatDate(
                  confirmedSlot.slot.start_at
                )}

                <br />

                🕐{" "}
                {formatTime(
                  confirmedSlot.slot.start_at
                )}
              </div>
            </div>

            <div
              style={{
                marginTop:
                  16,

                padding:
                  "14px 16px",

                border:
                  "1px solid #fde68a",

                borderRadius:
                  14,

                background:
                  "#fffbeb",

                color:
                  "#92400e",

                fontSize:
                  13,

                lineHeight:
                  1.6,

                textAlign:
                  "left",
              }}
            >
              <strong>
                Hemos enviado un correo con los detalles.
              </strong>

              <br />

              Si no lo ves, revisa Spam, Correo no deseado y Promociones.
            </div>

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "center",

                gap:
                  10,

                flexWrap:
                  "wrap",

                marginTop:
                  24,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={
                  closeSuccess
                }
              >
                Seguir buscando
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={
                  goToBookings
                }
              >
                Ver mis citas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle = {
  width:
    "100%",

  padding:
    13,

  border:
    "1px solid var(--border)",

  borderRadius:
    12,

  marginTop:
    8,

  background:
    "var(--card)",

  color:
    "var(--text)",

  font:
    "inherit",
};

const closeButtonStyle = {
  width:
    38,

  height:
    38,

  border:
    "1px solid var(--border)",

  borderRadius:
    10,

  background:
    "#ffffff",

  cursor:
    "pointer",

  fontSize:
    22,

  lineHeight:
    1,
};