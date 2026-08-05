"use client";

import {
  useEffect,
  useRef,
} from "react";

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

type Props<
  TManualEvent,
  TBookingEvent,
> = {
  searchText: string;
  showResults: boolean;
  loading: boolean;

  results:
    AgendaSearchResult<
      TManualEvent,
      TBookingEvent
    >[];

  onSearchTextChange: (
    value: string
  ) => void;

  onFocus: () => void;

  onCloseResults: () => void;

  onSelectResult: (
    result:
      AgendaSearchResult<
        TManualEvent,
        TBookingEvent
      >
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
  onCloseResults,
  onSelectResult,
}: Props<
  TManualEvent,
  TBookingEvent
>) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
   * ============================================================
   * CERRAR AL PULSAR FUERA
   * ============================================================
   */

  useEffect(() => {
    if (
      !showResults
    ) {
      return;
    }

    function handlePointerDown(
      event:
        PointerEvent
    ) {
      const container =
        containerRef.current;

      if (
        !container
      ) {
        return;
      }

      const target =
        event.target;

      if (
        target instanceof
          Node &&
        !container.contains(
          target
        )
      ) {
        onCloseResults();
      }
    }

    function handleEscape(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onCloseResults();
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    showResults,
    onCloseResults,
  ]);

  return (
    <div
      ref={
        containerRef
      }
      style={{
        position:
          "relative",

        zIndex:
          showResults
            ? 900
            : 10,

        maxWidth:
          520,

        marginBottom:
          18,

        isolation:
          "isolate",
      }}
    >
      <input
        type="search"
        value={
          searchText
        }
        onChange={(
          event
        ) =>
          onSearchTextChange(
            event.target.value
          )
        }
        onFocus={
          onFocus
        }
        onKeyDown={(
          event
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            onCloseResults();

            event.currentTarget.blur();
          }
        }}
        placeholder="🔎 Buscar cualquier cita..."
        style={{
          width:
            "100%",

          padding:
            "12px 14px",

          border:
            "1px solid var(--border)",

          borderRadius:
            12,

          background:
            "#ffffff",

          color:
            "var(--text)",

          font:
            "inherit",

          position:
            "relative",

          zIndex:
            902,
        }}
      />

      {showResults &&
        searchText.trim() && (
          <div
            role="listbox"
            style={{
              position:
                "absolute",

              top:
                "calc(100% + 6px)",

              left:
                0,

              right:
                0,

              zIndex:
                901,

              maxHeight:
                320,

              overflowY:
                "auto",

              overscrollBehavior:
                "contain",

              background:
                "#ffffff",

              border:
                "1px solid var(--border)",

              borderRadius:
                14,

              boxShadow:
                "0 18px 45px rgba(15, 23, 42, 0.22)",
            }}
          >
            {loading ? (
              <div
                className="muted"
                style={{
                  padding:
                    14,

                  fontSize:
                    13,
                }}
              >
                Buscando...
              </div>
            ) : results.length ===
              0 ? (
              <div
                className="muted"
                style={{
                  padding:
                    14,

                  fontSize:
                    13,
                }}
              >
                No hay citas que coincidan.
              </div>
            ) : (
              results.map(
                (
                  result
                ) => {
                  const date =
                    new Date(
                      result.startAt
                    );

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      role="option"
                      onClick={() => {
                        onSelectResult(
                          result
                        );

                        onCloseResults();
                      }}
                      style={{
                        width:
                          "100%",

                        padding:
                          "12px 14px",

                        display:
                          "block",

                        textAlign:
                          "left",

                        border:
                          "none",

                        borderBottom:
                          "1px solid var(--border)",

                        background:
                          "#ffffff",

                        cursor:
                          "pointer",

                        color:
                          "inherit",

                        font:
                          "inherit",
                      }}
                      onMouseEnter={(
                        event
                      ) => {
                        event.currentTarget.style.background =
                          "#f8fafc";
                      }}
                      onMouseLeave={(
                        event
                      ) => {
                        event.currentTarget.style.background =
                          "#ffffff";
                      }}
                    >
                      <strong>
                        {
                          result.title
                        }
                      </strong>

                      <div
                        className="muted"
                        style={{
                          marginTop:
                            3,

                          fontSize:
                            12,
                        }}
                      >
                        {
                          result.subtitle
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            5,

                          fontSize:
                            12,
                        }}
                      >
                        {date.toLocaleDateString(
                          "es-ES",
                          {
                            weekday:
                              "short",

                            day:
                              "numeric",

                            month:
                              "short",

                            year:
                              "numeric",
                          }
                        )}

                        {" · "}

                        {date.toLocaleTimeString(
                          "es-ES",
                          {
                            hour:
                              "2-digit",

                            minute:
                              "2-digit",
                          }
                        )}
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>
        )}
    </div>
  );
}