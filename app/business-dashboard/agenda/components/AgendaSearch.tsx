"use client";

import {
  useEffect,
  useRef,
} from "react";

import { CalendarClock, Search, X } from "lucide-react";

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
      className="agendasearch11"
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
      <div className="agendasearch11-field">
      <Search size={17} strokeWidth={2} aria-hidden="true" />
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
        placeholder="Buscar por cliente, servicio o teléfono..."
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
      {searchText && (
        <button type="button" onClick={() => onSearchTextChange("")} aria-label="Limpiar búsqueda"><X size={15} /></button>
      )}
      </div>

      {showResults &&
        searchText.trim() && (
          <div
            className="agendasearch11-results"
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
                      className="agendasearch11-result"
                      key={`${result.type}-${result.id}`}
                      type="button"
                      role="option"
                      aria-selected="false"
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
                        <CalendarClock size={14} aria-hidden="true" />
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

      <style jsx>{`
        .agendasearch11 { max-width: none !important; margin-bottom: 12px !important; }
        .agendasearch11-field {
          min-height: 45px;
          display: grid;
          grid-template-columns: 21px minmax(0,1fr) auto;
          align-items: center;
          gap: 7px;
          padding: 0 9px 0 13px;
          border: 1px solid #e1dde7;
          border-radius: 13px;
          background: #fff;
          color: #918b99;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .agendasearch11-field:focus-within { border-color: #a99bf4; box-shadow: 0 0 0 3px rgba(112,87,245,.09); }
        .agendasearch11-field input { width: 100% !important; padding: 0 !important; border: 0 !important; outline: 0; background: transparent !important; font-size: 12.5px; }
        .agendasearch11-field button { width: 29px; height: 29px; display: grid; place-items: center; border: 0; border-radius: 8px; background: #f3f1f6; color: var(--muted); cursor: pointer; }
        .agendasearch11-results { top: calc(100% + 7px) !important; overflow: hidden; border-color: #ded9e8 !important; border-radius: 15px !important; box-shadow: 0 18px 45px rgba(31,27,48,.15) !important; }
        .agendasearch11-result { transition: background .12s ease; }
        .agendasearch11-result:hover { background: #f8f6fc !important; }
        .agendasearch11-result div:last-child { display: flex; align-items: center; gap: 5px; color: var(--accent-dark); }
      `}</style>
    </div>
  );
}
