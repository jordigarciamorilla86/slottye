"use client";

export type AgendaSearchResult<
  TManualEvent = unknown,
  TBookingEvent = unknown,
> =
  | {
      type: "manual";
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      event: TManualEvent;
    }
  | {
      type: "booking";
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      event: TBookingEvent;
    };

type Props<TManualEvent, TBookingEvent> = {
  searchText: string;
  showResults: boolean;
  loading: boolean;
  results: AgendaSearchResult<TManualEvent, TBookingEvent>[];
  onSearchTextChange: (value: string) => void;
  onFocus: () => void;
  onSelectResult: (
    result: AgendaSearchResult<TManualEvent, TBookingEvent>
  ) => void;
};

export default function AgendaSearch<
  TManualEvent,
  TBookingEvent,
>({
  searchText,
  showResults,
  loading,
  results,
  onSearchTextChange,
  onFocus,
  onSelectResult,
}: Props<TManualEvent, TBookingEvent>) {
  return (
    <div
      style={{
        position: "relative",
        maxWidth: 520,
        marginBottom: 18,
      }}
    >
      <input
        type="search"
        value={searchText}
        onChange={(event) =>
          onSearchTextChange(
            event.target.value
          )
        }
        onFocus={onFocus}
        placeholder="🔎 Buscar cualquier cita..."
        style={{
          width: "100%",
          padding: "12px 14px",
          border:
            "1px solid var(--border)",
          borderRadius: 12,
          background: "#ffffff",
          color: "var(--text)",
          font: "inherit",
        }}
      />

      {showResults &&
        searchText.trim() && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 120,
              maxHeight: 320,
              overflowY: "auto",
              background: "#ffffff",
              border:
                "1px solid var(--border)",
              borderRadius: 14,
              boxShadow:
                "0 12px 35px rgba(15, 23, 42, 0.15)",
            }}
          >
            {loading ? (
              <div
                className="muted"
                style={{
                  padding: 14,
                  fontSize: 13,
                }}
              >
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <div
                className="muted"
                style={{
                  padding: 14,
                  fontSize: 13,
                }}
              >
                No hay citas que coincidan.
              </div>
            ) : (
              results.map((result) => {
                const date = new Date(
                  result.startAt
                );

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() =>
                      onSelectResult(result)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      display: "block",
                      textAlign: "left",
                      border: "none",
                      borderBottom:
                        "1px solid var(--border)",
                      background: "#ffffff",
                      cursor: "pointer",
                      color: "inherit",
                      font: "inherit",
                    }}
                  >
                    <strong>
                      {result.title}
                    </strong>

                    <div
                      className="muted"
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                      }}
                    >
                      {result.subtitle}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                      }}
                    >
                      {date.toLocaleDateString(
                        "es-ES",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                      {" · "}
                      {date.toLocaleTimeString(
                        "es-ES",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
    </div>
  );
}
