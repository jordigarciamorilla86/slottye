"use client";

import {
  useEffect,
  useRef,
} from "react";

type Props = {
  weekTitle: string;
  businessName: string;
  loadingWeek: boolean;
  rescheduling: boolean;
  showNewAppointment: boolean;
  newAppointmentDate: string;
  newAppointmentTime: string;
  showDatePicker: boolean;
  onPreviousWeek: () => void;
  onToggleNewAppointment: () => void;
  onNewAppointmentDateChange: (value: string) => void;
  onNewAppointmentTimeChange: (value: string) => void;
  onOpenNewAppointment: () => void;
  onCloseNewAppointment: () => void;
  onToggleDatePicker: () => void;
  onGoToDate: (value: string) => void;
  onToday: () => void;
  onNextWeek: () => void;
};

export default function AgendaHeader({
  weekTitle,
  businessName,
  loadingWeek,
  rescheduling,
  showNewAppointment,
  newAppointmentDate,
  newAppointmentTime,
  showDatePicker,
  onPreviousWeek,
  onToggleNewAppointment,
  onNewAppointmentDateChange,
  onNewAppointmentTimeChange,
  onOpenNewAppointment,
  onCloseNewAppointment,
  onToggleDatePicker,
  onGoToDate,
  onToday,
  onNextWeek,
}: Props) {
  const newAppointmentRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const datePickerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    function handlePointerDown(
      event: PointerEvent
    ) {
      if (
        !(event.target instanceof Node)
      ) {
        return;
      }

      if (
        showNewAppointment &&
        newAppointmentRef.current &&
        !newAppointmentRef.current.contains(
          event.target
        )
      ) {
        onCloseNewAppointment();
      }

      if (
        showDatePicker &&
        datePickerRef.current &&
        !datePickerRef.current.contains(
          event.target
        )
      ) {
        onToggleDatePicker();
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      if (
        showNewAppointment
      ) {
        onCloseNewAppointment();
      }

      if (
        showDatePicker
      ) {
        onToggleDatePicker();
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    showNewAppointment,
    showDatePicker,
    onCloseNewAppointment,
    onToggleDatePicker,
  ]);

  function handleToggleNewAppointment() {
    if (
      showDatePicker
    ) {
      onToggleDatePicker();
    }

    onToggleNewAppointment();
  }

  function handleToggleDatePicker() {
    if (
      showNewAppointment
    ) {
      onCloseNewAppointment();
    }

    onToggleDatePicker();
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 20,
        position: "relative",
        zIndex: 1200,
        isolation: "isolate",
      }}
    >
      <button
        type="button"
        className="btn"
        disabled={loadingWeek}
        onClick={onPreviousWeek}
      >
        ← Semana anterior
      </button>

      <div
        style={{
          textAlign: "center",
        }}
      >
        <strong
          style={{
            fontSize: 18,
          }}
        >
          {weekTitle}
        </strong>

        <div
          className="muted"
          style={{
            marginTop: 3,
            fontSize: 13,
          }}
        >
          Agenda de {businessName}
        </div>

        {loadingWeek && (
          <div
            className="muted"
            style={{
              marginTop: 4,
              fontSize: 12,
            }}
          >
            Cargando agenda...
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          ref={newAppointmentRef}
          style={{
            position: "relative",
            zIndex: showNewAppointment
              ? 1220
              : 1,
          }}
        >
          <button
            type="button"
            className="btn primary"
            disabled={
              loadingWeek ||
              rescheduling
            }
            onClick={
              handleToggleNewAppointment
            }
            aria-expanded={
              showNewAppointment
            }
            aria-haspopup="dialog"
          >
            + Nueva cita
          </button>

          {showNewAppointment && (
            <div
              role="dialog"
              aria-label="Nueva cita"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 1230,
                width: 290,
                maxWidth: "calc(100vw - 32px)",
                padding: 16,
                border: "1px solid var(--border)",
                borderRadius: 14,
                background: "#ffffff",
                boxShadow:
                  "0 12px 35px rgba(15, 23, 42, 0.15)",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: 14,
                }}
              >
                Nueva cita
              </strong>

              <label>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Fecha
                </span>

                <input
                  type="date"
                  value={
                    newAppointmentDate
                  }
                  onChange={(event) =>
                    onNewAppointmentDateChange(
                      event.target.value
                    )
                  }
                  style={smallInputStyle}
                />
              </label>

              <label>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Hora
                </span>

                <input
                  type="time"
                  step={1800}
                  value={
                    newAppointmentTime
                  }
                  onChange={(event) =>
                    onNewAppointmentTimeChange(
                      event.target.value
                    )
                  }
                  style={smallInputStyle}
                />
              </label>

              <button
                type="button"
                className="btn primary"
                style={{
                  width: "100%",
                }}
                onClick={
                  onOpenNewAppointment
                }
              >
                Continuar
              </button>

              <button
                type="button"
                className="btn"
                style={{
                  width: "100%",
                  marginTop: 8,
                }}
                onClick={
                  onCloseNewAppointment
                }
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div
          ref={datePickerRef}
          style={{
            position: "relative",
            zIndex: showDatePicker
              ? 1220
              : 1,
          }}
        >
          <button
            type="button"
            className="btn"
            disabled={loadingWeek}
            onClick={
              handleToggleDatePicker
            }
            aria-expanded={
              showDatePicker
            }
            aria-haspopup="dialog"
          >
            📅 Ir a fecha
          </button>

          {showDatePicker && (
            <div
              role="dialog"
              aria-label="Ir a una fecha"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 1230,
                width: 250,
                maxWidth: "calc(100vw - 32px)",
                padding: 14,
                border: "1px solid var(--border)",
                borderRadius: 14,
                background: "#ffffff",
                boxShadow:
                  "0 12px 35px rgba(15, 23, 42, 0.15)",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Ir a una fecha
              </strong>

              <input
                type="date"
                autoFocus
                onChange={(event) =>
                  onGoToDate(
                    event.target.value
                  )
                }
                style={smallInputStyle}
              />

              <div
                className="muted"
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                Selecciona cualquier día y la agenda irá directamente a esa semana.
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn"
          disabled={loadingWeek}
          onClick={onToday}
        >
          Hoy
        </button>

        <button
          type="button"
          className="btn"
          disabled={loadingWeek}
          onClick={onNextWeek}
        >
          Semana siguiente →
        </button>
      </div>
    </div>
  );
}

const smallInputStyle = {
  width: "100%",
  padding: 10,
  border: "1px solid var(--border)",
  borderRadius: 10,
  marginBottom: 12,
  background: "#ffffff",
  color: "var(--text)",
  font: "inherit",
};