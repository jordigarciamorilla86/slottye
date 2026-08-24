"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  useMemo,
  useState,
} from "react";
import managerStyles from "../AdminManagement.module.css";

type AuditAdmin = {
  id: string;
  name: string | null;
  email: string | null;
};

type AuditBusiness = {
  id: string;
  name: string;
  slug: string;
};

type AuditTargetUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type AuditLog = {
  id: string;

  admin_user_id:
    | string
    | null;

  action: string;
  entity_type: string;

  entity_id:
    | string
    | null;

  business_id:
    | string
    | null;

  target_user_id:
    | string
    | null;

  description: string;

  old_values:
    | Record<string, unknown>
    | null;

  new_values:
    | Record<string, unknown>
    | null;

  metadata:
    | Record<string, unknown>
    | null;

  created_at: string;

  admin_profile:
    | AuditAdmin
    | null;

  business:
    | AuditBusiness
    | null;

  target_profile:
    | AuditTargetUser
    | null;
};

type Props = {
  initialLogs: AuditLog[];
  search: string;
  entityFilter: string;
  actionFilter: string;
  entityTypes: string[];
  actions: string[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  totalLogs: number;
  affectedUsers: number;
  affectedBusinesses: number;
};

const ITEMS_PER_PAGE =
  25;

export default function AdminAuditManager({
  initialLogs,
  search,
  entityFilter,
  actionFilter,
  entityTypes,
  actions,
  currentPage,
  totalPages,
  totalResults,
  totalLogs,
  affectedUsers,
  affectedBusinesses,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<
      string |
      null
    >(null);

  /*
   * ============================================================
   * PAGINACIÓN
   * ============================================================
   */

  const safeCurrentPage = currentPage;

  const firstIndex =
    (
      safeCurrentPage -
      1
    ) *
    ITEMS_PER_PAGE;

  const lastIndex =
    Math.min(
      firstIndex +
        ITEMS_PER_PAGE,
      totalResults
    );

  const visibleLogs = initialLogs;

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
    setExpandedId(null);
  }

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

    navigate({ page: nextPage === 1 ? null : String(nextPage) });

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

  /*
   * ============================================================
   * FORMATO
   * ============================================================
   */

  function formatDateTime(
    value:
      string
  ) {
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

  return (
    <div
      className={managerStyles.manager}
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
          label="Registros"
          value={
              totalLogs
          }
        />

        <StatCard
          label="Usuarios afectados"
          value={
            affectedUsers
          }
        />

        <StatCard
          label="Negocios afectados"
          value={
            affectedBusinesses
          }
        />

        <StatCard
          label="Tipos de acción"
          value={
            actions.length
          }
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
            "repeat(auto-fit, minmax(210px, 1fr))",

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
              searchValue
            }
            onChange={(
              event
            ) => {
              setSearchValue(
                event.target.value
              );
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") navigate({ q: searchValue.trim() || null, page: null });
            }}
            onBlur={() => navigate({ q: searchValue.trim() || null, page: null })}
            placeholder="Descripción, administrador, usuario o negocio"
            style={
              inputStyle
            }
          />
        </label>

        <label>
          <strong>
            Entidad
          </strong>

          <select
            value={
              entityFilter
            }
            onChange={(
              event
            ) => {
              navigate({ entity: event.target.value, page: null });
            }}
            style={
              inputStyle
            }
          >
            <option value="ALL">
              Todas
            </option>

            {entityTypes.map(
              (
                entityType
              ) => (
                <option
                  key={
                    entityType
                  }
                  value={
                    entityType
                  }
                >
                  {entityType}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <strong>
            Acción
          </strong>

          <select
            value={
              actionFilter
            }
            onChange={(
              event
            ) => {
              navigate({ action: event.target.value, page: null });
            }}
            style={
              inputStyle
            }
          >
            <option value="ALL">
              Todas
            </option>

            {actions.map(
              (
                action
              ) => (
                <option
                  key={
                    action
                  }
                  value={
                    action
                  }
                >
                  {action}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      {/* ========================================================
          CONTADOR DE RESULTADOS
          ======================================================== */}

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
          {totalResults >
          0 ? (
            <>
              Mostrando{" "}
              <strong>
                {firstIndex +
                  1}
              </strong>
              {" – "}
              <strong>
                {lastIndex}
              </strong>{" "}
              de{" "}
              <strong>
                {totalResults}
              </strong>{" "}
              registros.
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

      {visibleLogs.length ===
      0 ? (
        <div
          className="panel"
          style={{
            marginTop:
              20,
          }}
        >
          <h3>
            No hay actividad registrada
          </h3>

          <p className="muted">
            Los registros aparecerán cuando las acciones administrativas se conecten con el sistema de auditoría.
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
          {visibleLogs.map(
            (
              log
            ) => {
              const expanded =
                expandedId ===
                log.id;

              return (
                <div
                  className="card"
                  key={
                    log.id
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
                      <div>
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
                            {log.action}
                          </span>

                          <span
                            style={{
                              padding:
                                "5px 9px",

                              borderRadius:
                                999,

                              background:
                                "#f3f4f6",

                              color:
                                "#4b5563",

                              fontSize:
                                12,

                              fontWeight:
                                800,
                            }}
                          >
                            {log.entity_type}
                          </span>
                        </div>

                        <h3
                          style={{
                            margin:
                              "14px 0 6px",
                          }}
                        >
                          {log.description}
                        </h3>

                        <div className="meta">
                          {formatDateTime(
                            log.created_at
                          )}
                        </div>
                      </div>

                      <div
                        className="muted"
                        style={{
                          fontSize:
                            12,

                          wordBreak:
                            "break-all",

                          maxWidth:
                            330,
                        }}
                      >
                        ID:{" "}
                        {log.id}
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
                          20,
                      }}
                    >
                      <Detail
                        label="Administrador"
                        value={
                          log.admin_profile
                            ?.name
                            ?.trim() ||
                          log.admin_profile
                            ?.email ||
                          "Administrador eliminado"
                        }
                      />

                      <Detail
                        label="Usuario afectado"
                        value={
                          log.target_profile
                            ?.name
                            ?.trim() ||
                          log.target_profile
                            ?.email ||
                          "—"
                        }
                      />

                      <Detail
                        label="Negocio"
                        value={
                          log.business
                            ?.name ??
                          "—"
                        }
                      />

                      <Detail
                        label="Entidad"
                        value={
                          log.entity_id ??
                          "—"
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
                      {log.target_user_id && (
                        <Link
                          href={`/admin/users?user=${log.target_user_id}`}
                          className="btn"
                        >
                          Ver usuario
                        </Link>
                      )}

                      {log.business && (
                        <Link
                          href={`/admin/businesses/${log.business.id}`}
                          className="btn"
                        >
                          Ver negocio
                        </Link>
                      )}

                      <button
                        type="button"
                        className="btn"
                        aria-expanded={expanded}
                        aria-controls={`audit-details-${log.id}`}
                        onClick={() =>
                          setExpandedId(
                            expanded
                              ? null
                              : log.id
                          )
                        }
                      >
                        {expanded
                          ? "Ocultar cambios"
                          : "Ver cambios"}
                      </button>
                    </div>

                    {expanded && (
                      <div
                        id={`audit-details-${log.id}`}
                        role="region"
                        aria-label="Cambios registrados"
                        style={{
                          display:
                            "grid",

                          gap:
                            14,

                          marginTop:
                            18,

                          paddingTop:
                            18,

                          borderTop:
                            "1px solid var(--border)",
                        }}
                      >
                        <JsonSection
                          title="Valores anteriores"
                          value={
                            log.old_values
                          }
                        />

                        <JsonSection
                          title="Valores nuevos"
                          value={
                            log.new_values
                          }
                        />

                        <JsonSection
                          title="Metadatos"
                          value={
                            log.metadata
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ========================================================
          PAGINACIÓN
          ======================================================== */}

      {totalResults >
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
            | number
            | "ellipsis-left"
            | "ellipsis-right"
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
      aria-label="Paginación de auditoría administrativa"
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
                aria-hidden="true"
                className="muted"
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
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="panel">
      <div className="muted">
        {label}
      </div>

      <div
        style={{
          marginTop:
            6,

          fontSize:
            28,

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

function JsonSection({
  title,
  value,
}: {
  title:
    string;

  value:
    | Record<string, unknown>
    | null;
}) {
  return (
    <div>
      <h4
        style={{
          margin:
            "0 0 8px",
        }}
      >
        {title}
      </h4>

      {value ? (
        <pre
          style={{
            margin:
              0,

            padding:
              14,

            borderRadius:
              12,

            border:
              "1px solid var(--border)",

            background:
              "var(--bg)",

            whiteSpace:
              "pre-wrap",

            wordBreak:
              "break-word",

            overflowX:
              "auto",

            fontSize:
              12,

            lineHeight:
              1.6,
          }}
        >
          {JSON.stringify(
            value,
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
          Sin información.
        </p>
      )}
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
