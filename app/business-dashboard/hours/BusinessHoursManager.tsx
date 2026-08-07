"use client";

import {
  useState,
} from "react";

type DatabaseHour = {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  open_time_2: string | null;
  close_time_2: string | null;
  closed: boolean;
};

type Day = {
  day_of_week: number;
  name: string;

  open_time: string;
  close_time: string;

  open_time_2: string;
  close_time_2: string;

  secondShift: boolean;
  closed: boolean;
};

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

type Props = {
  businessId: string;
  initialHours: DatabaseHour[];
};

export default function BusinessHoursManager({
  businessId,
  initialHours,
}: Props) {
  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    days,
    setDays,
  ] =
    useState<Day[]>(
      () =>
        DAY_NAMES.map(
          (
            name,
            index
          ) => {
            const existing =
              initialHours.find(
                (
                  hour
                ) =>
                  hour.day_of_week ===
                  index
              );

            return {
              day_of_week:
                index,

              name,

              open_time:
                existing
                  ?.open_time
                  ?.slice(
                    0,
                    5
                  ) ??
                "09:00",

              close_time:
                existing
                  ?.close_time
                  ?.slice(
                    0,
                    5
                  ) ??
                "13:00",

              open_time_2:
                existing
                  ?.open_time_2
                  ?.slice(
                    0,
                    5
                  ) ??
                "15:00",

              close_time_2:
                existing
                  ?.close_time_2
                  ?.slice(
                    0,
                    5
                  ) ??
                "19:00",

              secondShift:
                Boolean(
                  existing
                    ?.open_time_2 &&
                  existing
                    ?.close_time_2
                ),

              closed:
                existing
                  ?.closed ??
                false,
            };
          }
        )
    );

  function updateDay(
    index:
      number,
    changes:
      Partial<Day>
  ) {
    setDays(
      (
        current
      ) =>
        current.map(
          (
            day
          ) =>
            day.day_of_week ===
            index
              ? {
                  ...day,
                  ...changes,
                }
              : day
        )
    );

    setMessage("");
    setErrorMessage("");
  }

  async function saveHours() {
    if (
      loading
    ) {
      return;
    }

    setLoading(
      true
    );

    setMessage("");
    setErrorMessage("");

    /*
     * ============================================================
     * VALIDACIÓN EN CLIENTE
     * ============================================================
     */

    for (
      const day of
      days
    ) {
      if (
        day.closed
      ) {
        continue;
      }

      if (
        day.open_time >=
        day.close_time
      ) {
        setErrorMessage(
          `El primer tramo del ${day.name} no es válido.`
        );

        setLoading(
          false
        );

        return;
      }

      if (
        day.secondShift &&
        day.open_time_2 >=
          day.close_time_2
      ) {
        setErrorMessage(
          `El segundo tramo del ${day.name} no es válido.`
        );

        setLoading(
          false
        );

        return;
      }

      if (
        day.secondShift &&
        day.open_time_2 <
          day.close_time
      ) {
        setErrorMessage(
          `Los horarios del ${day.name} se solapan.`
        );

        setLoading(
          false
        );

        return;
      }
    }

    try {
      const response =
        await fetch(
          "/api/business/hours",
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessId,

                days:
                  days.map(
                    (
                      day
                    ) => ({
                      day_of_week:
                        day.day_of_week,

                      open_time:
                        day.closed
                          ? null
                          : day.open_time,

                      close_time:
                        day.closed
                          ? null
                          : day.close_time,

                      open_time_2:
                        day.closed ||
                        !day.secondShift
                          ? null
                          : day.open_time_2,

                      close_time_2:
                        day.closed ||
                        !day.secondShift
                          ? null
                          : day.close_time_2,

                      closed:
                        day.closed,
                    })
                  ),
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setErrorMessage(
          result.error ??
            "No se ha podido guardar el horario."
        );

        return;
      }

      setMessage(
        "Horario guardado correctamente."
      );
    } catch (
      error
    ) {
      console.error(
        "Error saving business hours:",
        error
      );

      setErrorMessage(
        "No se ha podido guardar el horario."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div
      style={{
        display:
          "grid",

        gap:
          14,

        marginTop:
          28,
      }}
    >
      {days.map(
        (
          day
        ) => (
          <div
            key={
              day.day_of_week
            }
            className="card"
          >
            <div className="card-body">
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  gap:
                    20,

                  flexWrap:
                    "wrap",
                }}
              >
                <h3
                  style={{
                    margin:
                      0,
                  }}
                >
                  {day.name}
                </h3>

                <label
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      day.closed
                    }
                    onChange={(
                      event
                    ) =>
                      updateDay(
                        day.day_of_week,
                        {
                          closed:
                            event
                              .target
                              .checked,
                        }
                      )
                    }
                  />

                  Cerrado
                </label>
              </div>

              {!day.closed && (
                <>
                  <div
                    style={
                      timeRowStyle
                    }
                  >
                    <strong>
                      Horario 1
                    </strong>

                    <input
                      type="time"
                      value={
                        day.open_time
                      }
                      onChange={(
                        event
                      ) =>
                        updateDay(
                          day.day_of_week,
                          {
                            open_time:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                      style={
                        inputStyle
                      }
                    />

                    <span
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      a
                    </span>

                    <input
                      type="time"
                      value={
                        day.close_time
                      }
                      onChange={(
                        event
                      ) =>
                        updateDay(
                          day.day_of_week,
                          {
                            close_time:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  {day.secondShift && (
                    <div
                      style={{
                        ...timeRowStyle,

                        marginTop:
                          10,
                      }}
                    >
                      <strong>
                        Horario 2
                      </strong>

                      <input
                        type="time"
                        value={
                          day.open_time_2
                        }
                        onChange={(
                          event
                        ) =>
                          updateDay(
                            day.day_of_week,
                            {
                              open_time_2:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />

                      <span
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        a
                      </span>

                      <input
                        type="time"
                        value={
                          day.close_time_2
                        }
                        onChange={(
                          event
                        ) =>
                          updateDay(
                            day.day_of_week,
                            {
                              close_time_2:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn"
                    style={{
                      marginTop:
                        14,
                    }}
                    onClick={() =>
                      updateDay(
                        day.day_of_week,
                        {
                          secondShift:
                            !day.secondShift,
                        }
                      )
                    }
                  >
                    {day.secondShift
                      ? "− Quitar segundo horario"
                      : "+ Añadir segundo horario"}
                  </button>
                </>
              )}
            </div>
          </div>
        )
      )}

      <button
        type="button"
        className="btn primary"
        disabled={
          loading
        }
        onClick={
          saveHours
        }
        style={{
          marginTop:
            10,
        }}
      >
        {loading
          ? "Guardando..."
          : "Guardar horario"}
      </button>

      {message && (
        <div
          style={{
            padding:
              "12px 14px",

            border:
              "1px solid #bbf7d0",

            borderRadius:
              12,

            background:
              "#f0fdf4",

            color:
              "#166534",
          }}
        >
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
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

            fontWeight:
              600,
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}

const timeRowStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "110px 1fr 40px 1fr",

  alignItems:
    "center",

  gap:
    10,

  marginTop:
    18,
};

const inputStyle = {
  width:
    "100%",

  padding:
    12,

  border:
    "1px solid var(--border)",

  borderRadius:
    12,

  background:
    "var(--card)",

  color:
    "var(--text)",

  font:
    "inherit",
};