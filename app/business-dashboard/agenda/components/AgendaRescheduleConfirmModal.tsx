"use client";

import type {
  AgendaBooking,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  booking: AgendaBooking;
  newSlot: AgendaSlot;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

function formatAgendaDateTime(
  value: string
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

export default function AgendaRescheduleConfirmModal({
  booking,
  newSlot,
  loading,
  error,
  onClose,
  onConfirm,
}: Props) {
  return (
    <div
      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          1300,

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
          Confirmar reprogramación
        </h2>

        <p className="muted">
          La reserva conservará el cliente, el servicio y su identificador.
        </p>

        <div
          style={{
            display:
              "grid",

            gap:
              12,

            marginTop:
              18,
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
              Cliente
            </strong>

            <div
              style={{
                marginTop:
                  4,
              }}
            >
              {booking.profiles
                ?.name ??
                "Cliente"}

              {" · "}

              {booking.services
                ?.name ??
                "Servicio"}
            </div>
          </div>

          {booking.slots && (
            <div
              style={{
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
                Cita actual
              </strong>

              <div
                style={{
                  marginTop:
                    4,

                  textTransform:
                    "capitalize",
                }}
              >
                {formatAgendaDateTime(
                  booking.slots
                    .start_at
                )}
              </div>
            </div>
          )}

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
              Nueva cita
            </strong>

            <div
              style={{
                marginTop:
                  4,

                textTransform:
                  "capitalize",
              }}
            >
              {formatAgendaDateTime(
                newSlot.start_at
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
            ⚠️ {error}
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
            Volver
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
              ? "Reprogramando..."
              : "Confirmar cambio"}
          </button>
        </div>
      </div>
    </div>
  );
}
