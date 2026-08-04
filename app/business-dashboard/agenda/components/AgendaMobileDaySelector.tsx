"use client";

type Props = {
  weekDays: Date[];
  selectedDayIndex: number;
  currentTime: Date;
  onSelectDay: (dayIndex: number) => void;
};

function sameLocalDay(
  first: Date,
  second: Date
) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

export default function AgendaMobileDaySelector({
  weekDays,
  selectedDayIndex,
  currentTime,
  onSelectDay,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(7, minmax(64px, 1fr))",
        gap: 6,
        overflowX: "auto",
        marginBottom: 16,
        paddingBottom: 4,
      }}
    >
      {weekDays.map((day, index) => {
        const selected =
          index === selectedDayIndex;

        const today =
          sameLocalDay(
            day,
            currentTime
          );

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() =>
              onSelectDay(index)
            }
            style={{
              minWidth: 64,
              padding: "9px 5px",
              borderRadius: 12,
              border: selected
                ? "1px solid var(--text)"
                : "1px solid var(--border)",
              background: selected
                ? "#f1f5f9"
                : "#ffffff",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform:
                  "capitalize",
              }}
            >
              {day.toLocaleDateString(
                "es-ES",
                {
                  weekday: "short",
                }
              )}
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 13,
                fontWeight: selected
                  ? 800
                  : 600,
              }}
            >
              {day.getDate()}
            </div>

            {today && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 8,
                }}
              >
                HOY
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
