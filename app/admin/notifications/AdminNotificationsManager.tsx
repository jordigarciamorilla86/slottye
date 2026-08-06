"use client";

import Link from "next/link";

import {
    useEffect,
    useMemo,
    useState,
  } from "react";

  

type NotificationStatus =
  | "PENDING"
  | "SENT"
  | "FAILED";

type NotificationType =
  | "BOOKING_CONFIRMATION"
  | "BOOKING_CANCELLATION"
  | "BOOKING_REMINDER"
  | "NEW_SLOTS"
  | "SLOT_AVAILABLE"
  | "BOOKING_RESCHEDULED"
  | "REVIEW_REQUEST";

type NotificationProfile = {
  id: string;
  name: string | null;
  email: string | null;
};

type NotificationBusiness = {
  id: string;
  name: string;
  slug: string;
};

type NotificationBooking = {
  id: string;
  status: string;
};

type AdminNotification = {
  id: string;
  user_id: string | null;
  business_id: string | null;
  booking_id: string | null;
  type: NotificationType;
  status: NotificationStatus;
  created_at: string;
  sent_at: string | null;
  subject: string | null;
  metadata: Record<
    string,
    unknown
  > | null;

  profiles:
    | NotificationProfile
    | null;

  businesses:
    | NotificationBusiness
    | null;

  bookings:
    | NotificationBooking
    | null;
};

type Props = {
  initialNotifications:
    AdminNotification[];
};

const NOTIFICATION_TYPES:
  NotificationType[] = [
    "BOOKING_CONFIRMATION",
    "BOOKING_CANCELLATION",
    "BOOKING_REMINDER",
    "NEW_SLOTS",
    "SLOT_AVAILABLE",
    "BOOKING_RESCHEDULED",
    "REVIEW_REQUEST",
  ];

const NOTIFICATION_STATUSES:
  NotificationStatus[] = [
    "PENDING",
    "SENT",
    "FAILED",
  ];

  const ITEMS_PER_PAGE =
  20;

export default function AdminNotificationsManager({
  initialNotifications,
}: Props) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      NotificationStatus |
      "ALL"
    >("ALL");

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      NotificationType |
      "ALL"
    >("ALL");

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<
      string |
      null
    >(null);

    const [
        currentPage,
        setCurrentPage,
      ] =
        useState(1);

  const sentCount =
    initialNotifications.filter(
      (
        notification
      ) =>
        notification.status ===
        "SENT"
    ).length;

  const pendingCount =
    initialNotifications.filter(
      (
        notification
      ) =>
        notification.status ===
        "PENDING"
    ).length;

  const failedCount =
    initialNotifications.filter(
      (
        notification
      ) =>
        notification.status ===
        "FAILED"
    ).length;

  const filteredNotifications =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase();

        return initialNotifications.filter(
          (
            notification
          ) => {
            if (
              statusFilter !==
                "ALL" &&
              notification.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              typeFilter !==
                "ALL" &&
              notification.type !==
                typeFilter
            ) {
              return false;
            }

            if (
              !normalizedSearch
            ) {
              return true;
            }

            const values = [
              notification.subject,
              notification.profiles
                ?.name,
              notification.profiles
                ?.email,
              notification.businesses
                ?.name,
              notification.id,
              notification.booking_id,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();

            return values.includes(
              normalizedSearch
            );
          }
        );
      },
      [
        initialNotifications,
        search,
        statusFilter,
        typeFilter,
      ]
    );

    /*
 * ============================================================
 * PAGINACIÓN
 * ============================================================
 */

const totalPages =
Math.max(
  1,
  Math.ceil(
    filteredNotifications.length /
      ITEMS_PER_PAGE
  )
);

const safeCurrentPage =
Math.min(
  currentPage,
  totalPages
);

const firstVisibleIndex =
(
  safeCurrentPage -
  1
) *
ITEMS_PER_PAGE;

const lastVisibleIndex =
Math.min(
  firstVisibleIndex +
    ITEMS_PER_PAGE,
  filteredNotifications.length
);

const paginatedNotifications =
filteredNotifications.slice(
  firstVisibleIndex,
  lastVisibleIndex
);

/*
* Al cambiar un filtro o una búsqueda,
* volvemos automáticamente a la primera página.
*/

useEffect(() => {
setCurrentPage(
  1
);

setExpandedId(
  null
);
}, [
search,
statusFilter,
typeFilter,
]);

/*
* Protección por si una eliminación futura o un cambio
* en los resultados reduce el número total de páginas.
*/

useEffect(() => {
if (
  currentPage >
  totalPages
) {
  setCurrentPage(
    totalPages
  );
}
}, [
currentPage,
totalPages,
]);

function changePage(
page:
  number
) {
const nextPage =
  Math.min(
    Math.max(
      page,
      1
    ),
    totalPages
  );

setCurrentPage(
  nextPage
);

setExpandedId(
  null
);

window.scrollTo({
  top:
    0,

  behavior:
    "smooth",
});
}

  function formatDateTime(
    value:
      string |
      null
  ) {
    if (
      !value
    ) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
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

  function typeLabel(
    type:
      NotificationType
  ) {
    switch (
      type
    ) {
      case "BOOKING_CONFIRMATION":
        return "Confirmación de reserva";

      case "BOOKING_CANCELLATION":
        return "Cancelación de reserva";

      case "BOOKING_REMINDER":
        return "Recordatorio de reserva";

      case "NEW_SLOTS":
        return "Nuevas citas";

      case "SLOT_AVAILABLE":
        return "Cita disponible";

      case "BOOKING_RESCHEDULED":
        return "Reserva reprogramada";

      case "REVIEW_REQUEST":
        return "Solicitud de reseña";

      default:
        return type;
    }
  }

  function statusLabel(
    status:
      NotificationStatus
  ) {
    switch (
      status
    ) {
      case "SENT":
        return "ENVIADA";

      case "FAILED":
        return "FALLIDA";

      case "PENDING":
        return "PENDIENTE";
    }
  }

  function statusStyle(
    status:
      NotificationStatus
  ) {
    switch (
      status
    ) {
      case "SENT":
        return {
          background:
            "#dcfce7",

          color:
            "#166534",

          border:
            "1px solid #bbf7d0",
        };

      case "FAILED":
        return {
          background:
            "#fee2e2",

          color:
            "#b91c1c",

          border:
            "1px solid #fecaca",
        };

      case "PENDING":
        return {
          background:
            "#fef3c7",

          color:
            "#92400e",

          border:
            "1px solid #fde68a",
        };
    }
  }

  return (
    <div
      style={{
        marginTop:
          28,
      }}
    >
      {/* ========================================================
          RESUMEN
          ======================================================== */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",

          gap:
            14,
        }}
      >
        <StatCard
          label="Notificaciones"
          value={
            initialNotifications.length
          }
        />

        <StatCard
          label="Enviadas"
          value={
            sentCount
          }
          tone="success"
        />

        <StatCard
          label="Pendientes"
          value={
            pendingCount
          }
          tone="warning"
        />

        <StatCard
          label="Fallidas"
          value={
            failedCount
          }
          tone="error"
        />
      </div>

      {/* ========================================================
          FILTROS
          ======================================================== */}

      <div
        className="panel"
        style={{
          marginTop:
            20,

          display:
            "grid",

          gridTemplateColumns:
            "minmax(220px, 1fr) minmax(170px, 230px) minmax(200px, 280px)",

          gap:
            12,

          alignItems:
            "end",
        }}
      >
        <label>
          <strong>
            Buscar
          </strong>

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Asunto, usuario, email o negocio"
            style={
              inputStyle
            }
          />
        </label>

        <label>
          <strong>
            Estado
          </strong>

          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target
                  .value as
                  | NotificationStatus
                  | "ALL"
              )
            }
            style={
              inputStyle
            }
          >
            <option value="ALL">
              Todos
            </option>

            {NOTIFICATION_STATUSES.map(
              (
                status
              ) => (
                <option
                  value={
                    status
                  }
                  key={
                    status
                  }
                >
                  {statusLabel(
                    status
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <strong>
            Tipo
          </strong>

          <select
            value={
              typeFilter
            }
            onChange={(
              event
            ) =>
              setTypeFilter(
                event.target
                  .value as
                  | NotificationType
                  | "ALL"
              )
            }
            style={
              inputStyle
            }
          >
            <option value="ALL">
              Todos los tipos
            </option>

            {NOTIFICATION_TYPES.map(
              (
                type
              ) => (
                <option
                  value={
                    type
                  }
                  key={
                    type
                  }
                >
                  {typeLabel(
                    type
                  )}
                </option>
              )
            )}
          </select>
        </label>
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
      12,

    flexWrap:
      "wrap",

    marginTop:
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
    {filteredNotifications.length >
    0 ? (
      <>
        Mostrando{" "}
        <strong>
          {firstVisibleIndex +
            1}
        </strong>
        {" – "}
        <strong>
          {lastVisibleIndex}
        </strong>{" "}
        de{" "}
        <strong>
          {filteredNotifications.length}
        </strong>{" "}
        resultados.
      </>
    ) : (
      <>
        No hay resultados.
      </>
    )}
  </div>

  <div
    className="muted"
    style={{
      fontSize:
        13,
    }}
  >
    Página{" "}
    <strong>
      {safeCurrentPage}
    </strong>{" "}
    de{" "}
    <strong>
      {totalPages}
    </strong>
  </div>
</div>

      {/* ========================================================
          LISTADO
          ======================================================== */}

      {filteredNotifications.length ===
      0 ? (
        <div
          className="panel"
          style={{
            marginTop:
              20,
          }}
        >
          <h3>
            No se han encontrado notificaciones
          </h3>

          <p className="muted">
            Prueba a cambiar los filtros o el texto de búsqueda.
          </p>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              14,

            marginTop:
              20,
          }}
        >
          {paginatedNotifications.map(
            (
              notification
            ) => {
              const profile =
                notification.profiles;

              const business =
                notification.businesses;

              const booking =
                notification.bookings;

              const expanded =
                expandedId ===
                notification.id;

              return (
                <div
                  className="card"
                  key={
                    notification.id
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
                          "flex-start",

                        gap:
                          16,

                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              8,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-flex",

                              padding:
                                "5px 9px",

                              borderRadius:
                                999,

                              fontSize:
                                12,

                              fontWeight:
                                800,

                              ...statusStyle(
                                notification.status
                              ),
                            }}
                          >
                            {statusLabel(
                              notification.status
                            )}
                          </span>

                          <span
                            style={{
                              padding:
                                "5px 9px",

                              borderRadius:
                                999,

                              background:
                                "#ede9fe",

                              color:
                                "#5b21b6",

                              fontSize:
                                12,

                              fontWeight:
                                800,
                            }}
                          >
                            {typeLabel(
                              notification.type
                            )}
                          </span>
                        </div>

                        <h3
                          style={{
                            marginTop:
                              14,

                            marginBottom:
                              6,
                          }}
                        >
                          {notification.subject ??
                            typeLabel(
                              notification.type
                            )}
                        </h3>

                        <div className="meta">
                          Creada:{" "}
                          {formatDateTime(
                            notification.created_at
                          )}
                        </div>

                        <div
                          className="meta"
                          style={{
                            marginTop:
                              4,
                          }}
                        >
                          Enviada:{" "}
                          {formatDateTime(
                            notification.sent_at
                          )}
                        </div>
                      </div>

                      <div
                        className="muted"
                        style={{
                          maxWidth:
                            330,

                          fontSize:
                            12,

                          wordBreak:
                            "break-all",
                        }}
                      >
                        ID:{" "}
                        {notification.id}
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(210px, 1fr))",

                        gap:
                          18,

                        marginTop:
                          22,
                      }}
                    >
                      <Detail
                        label="Destinatario"
                        value={
                          profile
                            ?.name
                            ?.trim() ||
                          "Sin nombre"
                        }
                      />

                      <Detail
                        label="Correo"
                        value={
                          profile
                            ?.email ??
                          "Sin email o usuario eliminado"
                        }
                      />

                      <Detail
                        label="Negocio"
                        value={
                          business
                            ?.name ??
                          "Sin negocio asociado"
                        }
                      />

                      <Detail
                        label="Reserva"
                        value={
                          booking
                            ? `${booking.id} · ${booking.status}`
                            : "Sin reserva asociada"
                        }
                      />
                    </div>

                    <div
                      style={{
                        display:
                          "flex",

                        gap:
                          8,

                        flexWrap:
                          "wrap",

                        marginTop:
                          20,
                      }}
                    >
                      {notification.user_id && (
                        <Link
                          href={`/admin/users?user=${notification.user_id}`}
                          className="btn"
                        >
                          👤 Ver usuario
                        </Link>
                      )}

                      {business && (
                        <Link
                          href={`/admin/businesses/${business.id}`}
                          className="btn"
                        >
                          🏢 Ver negocio
                        </Link>
                      )}

                      {business && (
                        <Link
                          href={`/admin/businesses/${business.id}/bookings`}
                          className="btn"
                        >
                          📋 Reservas
                        </Link>
                      )}

                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          setExpandedId(
                            expanded
                              ? null
                              : notification.id
                          )
                        }
                      >
                        {expanded
                          ? "Ocultar detalles"
                          : "Ver detalles"}
                      </button>
                    </div>

                    {expanded && (
                      <div
                        style={{
                          marginTop:
                            18,

                          paddingTop:
                            18,

                          borderTop:
                            "1px solid var(--border)",
                        }}
                      >
                        <h4
                          style={{
                            margin:
                              "0 0 10px",
                          }}
                        >
                          Metadatos
                        </h4>

                        {notification.metadata ? (
                          <pre
                            style={{
                              margin:
                                0,

                              padding:
                                16,

                              borderRadius:
                                12,

                              background:
                                "var(--bg)",

                              border:
                                "1px solid var(--border)",

                              overflowX:
                                "auto",

                              whiteSpace:
                                "pre-wrap",

                              wordBreak:
                                "break-word",

                              fontSize:
                                12,

                              lineHeight:
                                1.6,
                            }}
                          >
                            {JSON.stringify(
                              notification.metadata,
                              null,
                              2
                            )}
                          </pre>
                        ) : (
                          <p
                            className="muted"
                            style={{
                              margin:
                                0,
                            }}
                          >
                            Esta notificación no contiene metadatos.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
               </div>
      )}

      {filteredNotifications.length >
        ITEMS_PER_PAGE && (
        <Pagination
          currentPage={
            safeCurrentPage
          }
          totalPages={
            totalPages
          }
          onChange={
            changePage
          }
        />
      )}
    </div>
  );
}

function Pagination({
    currentPage,
    totalPages,
    onChange,
  }: {
    currentPage:
      number;
  
    totalPages:
      number;
  
    onChange: (
      page:
        number
    ) => void;
  }) {
    const visiblePages =
      useMemo(
        () => {
          const pages:
            Array<
              number |
              "ellipsis-left" |
              "ellipsis-right"
            > =
            [];
  
          if (
            totalPages <=
            7
          ) {
            for (
              let page =
                1;
              page <=
              totalPages;
              page++
            ) {
              pages.push(
                page
              );
            }
  
            return pages;
          }
  
          pages.push(
            1
          );
  
          if (
            currentPage >
            4
          ) {
            pages.push(
              "ellipsis-left"
            );
          }
  
          const startPage =
            Math.max(
              2,
              currentPage -
                1
            );
  
          const endPage =
            Math.min(
              totalPages -
                1,
              currentPage +
                1
            );
  
          for (
            let page =
              startPage;
            page <=
            endPage;
            page++
          ) {
            pages.push(
              page
            );
          }
  
          if (
            currentPage <
            totalPages -
              3
          ) {
            pages.push(
              "ellipsis-right"
            );
          }
  
          pages.push(
            totalPages
          );
  
          return pages;
        },
        [
          currentPage,
          totalPages,
        ]
      );
  
    return (
      <nav
        aria-label="Paginación de notificaciones"
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
            currentPage ===
            1
          }
          onClick={() =>
            onChange(
              currentPage -
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
                  style={{
                    padding:
                      "0 4px",
                  }}
                >
                  …
                </span>
              );
            }
  
            const active =
              page ===
              currentPage;
  
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
                aria-label={`Ir a la página ${page}`}
                onClick={() =>
                  onChange(
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
            currentPage ===
            totalPages
          }
          onClick={() =>
            onChange(
              currentPage +
                1
            )
          }
        >
          Siguiente →
        </button>
      </nav>
    );
  }

function StatCard({
  label,
  value,
  tone,
}: {
  label:
    string;

  value:
    number;

  tone?:
    | "success"
    | "warning"
    | "error";
}) {
  const tones = {
    success: {
      background:
        "#f0fdf4",

      borderColor:
        "#bbf7d0",

      color:
        "#166534",
    },

    warning: {
      background:
        "#fffbeb",

      borderColor:
        "#fde68a",

      color:
        "#92400e",
    },

    error: {
      background:
        "#fef2f2",

      borderColor:
        "#fecaca",

      color:
        "#b91c1c",
    },
  };

  const selectedTone =
    tone
      ? tones[tone]
      : undefined;

  return (
    <div
      className="panel"
      style={
        selectedTone
      }
    >
      <div
        style={{
          opacity:
            0.8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            6,

          fontSize:
            29,

          fontWeight:
            800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <div
        className="muted"
        style={{
          marginBottom:
            5,

          fontSize:
            13,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const inputStyle = {
  width:
    "100%",

  padding:
    12,

  border:
    "1px solid var(--border)",

  borderRadius:
    12,

  marginTop:
    7,

  background:
    "var(--card)",

  color:
    "var(--text)",

  font:
    "inherit",
};