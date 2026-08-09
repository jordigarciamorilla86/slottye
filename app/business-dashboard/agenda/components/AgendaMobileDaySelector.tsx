"use client";

import type {
  MobileAgendaMode,
} from "../hooks/useAgendaView";

type Props = {
  weekDays: Date[];

  selectedDayIndex:
    number;

  currentTime:
    Date;

  mode:
    MobileAgendaMode;

  onModeChange: (
    mode: MobileAgendaMode
  ) => void;

  onSelectDay: (
    dayIndex: number
  ) => void;
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
  mode,
  onModeChange,
  onSelectDay,
}: Props) {
  return (
    <div
      style={{
        marginBottom: 16,
      }}
    >
      {/*
       * ========================================================
       * SELECTOR DÍA / SEMANA
       * ========================================================
       */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 4,
          padding: 4,
          marginBottom:
            mode === "day"
              ? 12
              : 0,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
          background:
            "#f8fafc",
        }}
      >
        <button
          type="button"
          onClick={() =>
            onModeChange(
              "day"
            )
          }
          style={{
            minHeight: 40,
            padding:
              "8px 12px",
            border:
              mode === "day"
                ? "1px solid var(--border)"
                : "1px solid transparent",
            borderRadius: 10,
            background:
              mode === "day"
                ? "#ffffff"
                : "transparent",
            boxShadow:
              mode === "day"
                ? "0 1px 3px rgba(15, 23, 42, 0.08)"
                : "none",
            font: "inherit",
            fontWeight:
              mode === "day"
                ? 800
                : 600,
            color:
              "inherit",
            cursor:
              "pointer",
          }}
        >
          Día
        </button>

        <button
          type="button"
          onClick={() =>
            onModeChange(
              "week"
            )
          }
          style={{
            minHeight: 40,
            padding:
              "8px 12px",
            border:
              mode === "week"
                ? "1px solid var(--border)"
                : "1px solid transparent",
            borderRadius: 10,
            background:
              mode === "week"
                ? "#ffffff"
                : "transparent",
            boxShadow:
              mode === "week"
                ? "0 1px 3px rgba(15, 23, 42, 0.08)"
                : "none",
            font: "inherit",
            fontWeight:
              mode === "week"
                ? 800
                : 600,
            color:
              "inherit",
            cursor:
              "pointer",
          }}
        >
          Semana
        </button>
      </div>

      {/*
       * ========================================================
       * SELECTOR DE LOS 7 DÍAS
       * ========================================================
       *
       * Sólo tiene sentido en vista Día.
       * En Semana ya aparecen los siete días en la agenda.
       * ========================================================
       */}

      {mode ===
        "day" && (
        <div
          style={{
            display: "grid",

            gridTemplateColumns:
              "repeat(7, minmax(0, 1fr))",

            gap: 4,

            width: "100%",
          }}
        >
          {weekDays.map(
            (
              day,
              index
            ) => {
              const selected =
                index ===
                selectedDayIndex;

              const today =
                sameLocalDay(
                  day,
                  currentTime
                );

              return (
                <button
                  key={
                    day.toISOString()
                  }
                  type="button"
                  onClick={() =>
                    onSelectDay(
                      index
                    )
                  }
                  style={{
                    minWidth: 0,
                    minHeight: 58,
                    padding:
                      "7px 2px",
                    borderRadius:
                      10,

                    border:
                      selected
                        ? "1px solid var(--text)"
                        : "1px solid var(--border)",

                    background:
                      selected
                        ? "#f1f5f9"
                        : "#ffffff",

                    cursor:
                      "pointer",

                    font:
                      "inherit",

                    color:
                      "inherit",

                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        10,

                      lineHeight:
                        1.1,

                      fontWeight:
                        700,

                      textTransform:
                        "capitalize",

                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {
  [
    "L",
    "M",
    "X",
    "J",
    "V",
    "S",
    "D",
  ][index]
}
                  </div>

                  <div
                    style={{
                      marginTop:
                        4,

                      fontSize:
                        13,

                      lineHeight:
                        1,

                      fontWeight:
                        selected
                          ? 800
                          : 600,
                    }}
                  >
                    {day.getDate()}
                  </div>

                  {today && (
                    <div
                      style={{
                        marginTop:
                          4,

                        fontSize:
                          7,

                        lineHeight:
                          1,

                        fontWeight:
                          800,
                      }}
                    >
                      HOY
                    </div>
                  )}
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}