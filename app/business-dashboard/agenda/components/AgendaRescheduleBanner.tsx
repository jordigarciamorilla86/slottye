"use client";

type Props = {
  customerName: string;
  serviceName: string;
  currentStartAt: string | null;
  loading: boolean;
  error: string;
  onCancel: () => void;
};

function formatAgendaDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }
  ).format(
    new Date(value)
  );
}

export default function AgendaRescheduleBanner({
  customerName,
  serviceName,
  currentStartAt,
  loading,
  error,
  onCancel,
}: Props) {
  return (
    <section
      style={{
        marginBottom: 18,
        padding: 16,
        border: "1px solid #c4b5fd",
        borderRadius: 16,
        background: "#f5f3ff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong
            style={{
              display: "block",
              fontSize: 16,
            }}
          >
            Reprogramando reserva
          </strong>

          <div
            style={{
              marginTop: 5,
              fontSize: 14,
            }}
          >
            <strong>{customerName}</strong>
            {" · "}
            {serviceName}
          </div>

          {currentStartAt && (
            <div
              className="muted"
              style={{
                marginTop: 5,
                fontSize: 12,
              }}
            >
              Cita actual:{" "}
              {formatAgendaDateTime(
                currentStartAt
              )}
            </div>
          )}

          <div
            className="muted"
            style={{
              marginTop: 7,
              fontSize: 13,
            }}
          >
            Selecciona una disponibilidad verde del mismo servicio o vacia. Puedes
            cambiar de semana o usar “Ir a fecha”.
          </div>
        </div>

        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={onCancel}
        >
          Cancelar reprogramación
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            border: "1px solid #fecaca",
            borderRadius: 10,
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
