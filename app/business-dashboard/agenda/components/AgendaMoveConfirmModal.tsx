"use client";

import type {
  AgendaPendingMove,
} from "../types/agenda";
import styles from "../AgendaModal.module.css";

type Props = {
  pendingMove: AgendaPendingMove;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

function formatDateTime(
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

function eventLabel(
  pendingMove:
    AgendaPendingMove
) {
  const event =
    pendingMove.event;

  if (
    event.type ===
    "booking"
  ) {
    return {
      title:
        event.source.profiles
          ?.name ??
        "Reserva Slottye",

      subtitle:
        event.source.services
          ?.name ??
        "Reserva Slottye",
    };
  }

  if (
    event.type ===
    "manual"
  ) {
    return {
      title:
        event.source.customer_name,

      subtitle:
        event.source.services
          ?.name ??
        "Reserva manual",
    };
  }

  if (
    event.type ===
    "block"
  ) {
    return {
      title:
        "Bloqueo",

      subtitle:
        event.source.reason ??
        "Sin motivo",
    };
  }

  return {
    title:
      "Disponibilidad",

    subtitle:
      event.subtitle ||
      "Slot disponible",
  };
}

export default function AgendaMoveConfirmModal({
  pendingMove,
  loading,
  error,
  onClose,
  onConfirm,
}: Props) {
  const label =
    eventLabel(
      pendingMove
    );

  return (
    <div
      className={styles.backdrop}
      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          1400,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          20,

        background:
          "rgba(15, 23, 42, 0.5)",
      }}
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`${styles.sheet} ${styles.confirmSheet}`}
        style={{
          width:
            "100%",

          maxWidth:
            520,

          padding:
            24,

          borderRadius:
            18,

          background:
            "#ffffff",

          boxShadow:
            "0 20px 60px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div className="kicker">
          Agenda
        </div>

        <h2
          style={{
            margin:
              "10px 0 8px",
          }}
        >
          Mover evento
        </h2>

        <p className="muted">
          Se conservarán los datos y la duración del evento.
        </p>

        <div
          style={{
            marginTop:
              18,

            padding:
              14,

            border:
              "1px solid var(--border)",

            borderRadius:
              12,

            background:
              "#f8fafc",
          }}
        >
          <strong>
            {label.title}
          </strong>

          <div
            className="muted"
            style={{
              marginTop:
                4,

              fontSize:
                13,
            }}
          >
            {label.subtitle}
          </div>
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",

            gap:
              12,

            marginTop:
              12,
          }}
        >
          <div
            style={{
              padding:
                14,

              border:
                "1px solid #e9d5ff",

              borderRadius:
                12,

              background:
                "#faf5ff",
            }}
          >
            <strong>
              Horario actual
            </strong>

            <div
              style={{
                marginTop:
                  5,

                textTransform:
                  "capitalize",
              }}
            >
              {formatDateTime(
                pendingMove.event
                  .startAt
              )}
            </div>
          </div>

          <div
            style={{
              padding:
                14,

              border:
                "1px solid #bbf7d0",

              borderRadius:
                12,

              background:
                "#f0fdf4",
            }}
          >
            <strong>
              Nuevo horario
            </strong>

            <div
              style={{
                marginTop:
                  5,

                textTransform:
                  "capitalize",
              }}
            >
              {formatDateTime(
                pendingMove
                  .targetStartAt
              )}
            </div>
          </div>
        </div>

        {error && (
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
            {error}
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
              loading
            }
            onClick={
              onClose
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn primary"
            disabled={
              loading
            }
            onClick={
              onConfirm
            }
          >
            {loading
              ? "Moviendo..."
              : "Confirmar movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
