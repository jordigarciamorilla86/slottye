"use client";

type DailySummary = {
  onlineBookings: number;
  completedCount: number;
  manualCount: number;
  availableCount: number;
  blockCount: number;
};

type Props = {
  summaryDay: Date;
  currentTime: Date;
  isMobile: boolean;
  viewingCurrentWeek: boolean;
  dailySummary: DailySummary;
};

function sameLocalDay(
  a: Date,
  b: Date
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}

export default function AgendaSummary({
  summaryDay,
  currentTime,
  isMobile,
  viewingCurrentWeek,
  dailySummary,
}: Props) {
  return (
    <section
      style={{
        marginBottom: 16,
        padding: 16,
        border:
          "1px solid var(--border)",
        borderRadius: 16,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            className="muted"
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.04em",
            }}
          >
            Resumen del día
          </div>

          <strong
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 16,
              textTransform:
                "capitalize",
            }}
          >
            {sameLocalDay(
              summaryDay,
              currentTime
            )
              ? "Hoy · "
              : ""}

            {summaryDay.toLocaleDateString(
              "es-ES",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
              }
            )}
          </strong>
        </div>

        {!isMobile && (
          <div
            className="muted"
            style={{
              fontSize: 12,
            }}
          >
            {viewingCurrentWeek
              ? "Mostrando hoy"
              : "Mostrando el lunes de la semana"}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >

<SummaryCard
  icon="🟢"
  value={
    dailySummary.availableCount
  }
  label="Disponibilidades"
  background="#f0fdf4"
  border="#bbf7d0"
/>

        <SummaryCard
  icon="🟣"
  value={
    dailySummary.onlineBookings
  }
  label="Reservas Slottye"
  background="#f3e8ff"
  border="#e9d5ff"
/>

<SummaryCard
  icon="⚪"
  value={
    dailySummary.completedCount
  }
  label="Completadas"
  background="#f3f4f6"
  border="#d1d5db"
/>

<SummaryCard
  icon="🔵"
  value={
    dailySummary.manualCount
  }
  label="Reservas manuales"
  background="#eff6ff"
  border="#bfdbfe"
/>



<SummaryCard
  icon="🔴"
  value={
    dailySummary.blockCount
  }
  label="Bloqueos"
  background="#fef2f2"
  border="#fecaca"
/>
      </div>
    </section>
  );
}

type SummaryCardProps = {
  icon: string;
  value: number;
  label: string;
  background: string;
  border: string;
};

function SummaryCard({
  icon,
  value,
  label,
  background,
  border,
}: SummaryCardProps) {
  return (
    <div
      style={{
        padding: "11px 12px",
        borderRadius: 12,
        background,
        border: `1px solid ${border}`,
      }}
    >
      <strong>
        {icon} {value}
      </strong>

      <div
        className="muted"
        style={{
          marginTop: 3,
          fontSize: 12,
        }}
      >
        {label}
      </div>
    </div>
  );
}
