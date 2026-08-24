"use client";

import {
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  Plus,
  Save,
  X,
} from "lucide-react";

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
  endpoint?: string;
};

export default function BusinessHoursManager({
  businessId,
  initialHours,
  endpoint = "/api/business/hours",
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
          endpoint,
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

  const openDays =
    days.filter(
      (day) =>
        !day.closed
    ).length;

  return (
    <div className="hours10">
      <section className="hours10-card">
        <div className="hours10-head">
          <div className="hours10-title">
            <span className="hours10-icon">
              <CalendarDays
                size={20}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div>
              <span className="hours10-kicker">
                Horario semanal
              </span>

              <h2>
                Horario habitual
              </h2>

              <p>
                Define cuándo está abierto el negocio y añade un segundo tramo si
                haces una pausa al mediodía.
              </p>
            </div>
          </div>

          <div className="hours10-summary">
            <strong>
              {openDays}
            </strong>

            <span>
              días abiertos
            </span>
          </div>
        </div>

        <div className="hours10-week">
          {days.map(
            (day) => (
              <article
                key={
                  day.day_of_week
                }
                className={
                  day.closed
                    ? "hours10-day is-closed"
                    : "hours10-day"
                }
              >
                <div className="hours10-day-name">
                  <strong>
                    {day.name}
                  </strong>

                  {day.closed && (
                    <span className="hours10-status is-closed">
                      Cerrado
                    </span>
                  )}
                </div>

                <label className="hours10-switch">
                  <span className="sr-only">
                    {day.closed
                      ? `Abrir ${day.name}`
                      : `Cerrar ${day.name}`}
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      !day.closed
                    }
                    onChange={(
                      event
                    ) =>
                      updateDay(
                        day.day_of_week,
                        {
                          closed:
                            !event
                              .target
                              .checked,
                        }
                      )
                    }
                  />

                  <span className="hours10-switch-track">
                    <span className="hours10-switch-knob" />
                  </span>
                </label>

                {!day.closed ? (
                  <div className="hours10-day-body">
                    <div className="hours10-shift">
                      <div className="hours10-shift-label">
                        <Clock3
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        <span>
                          Primer tramo
                        </span>
                      </div>

                      <div className="hours10-times">
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
                        />

                        <span className="hours10-separator">
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
                        />
                      </div>
                    </div>

                    {day.secondShift && (
                      <div className="hours10-shift is-second">
                        <div className="hours10-shift-label">
                          <Clock3
                            size={15}
                            strokeWidth={2}
                            aria-hidden="true"
                          />

                          <span>
                            Segundo tramo
                          </span>
                        </div>

                        <div className="hours10-times">
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
                          />

                          <span className="hours10-separator">
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
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className={
                        day.secondShift
                          ? "hours10-secondary-action is-remove"
                          : "hours10-secondary-action"
                      }
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
                      {day.secondShift ? (
                        <X
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      ) : (
                        <Plus
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      )}

                      {day.secondShift
                        ? "Quitar segundo tramo"
                        : "Añadir segundo tramo"}
                    </button>
                  </div>
                ) : (
                  <div className="hours10-closed-copy">
                    No se mostrarán horas disponibles este día.
                  </div>
                )}
              </article>
            )
          )}
        </div>
      </section>

      <div className="hours10-save">
        <div className="hours10-save-copy">
          {message ? (
            <div
              className="hours10-message is-success"
              role="status"
            >
              {message}
            </div>
          ) : errorMessage ? (
            <div
              className="hours10-message is-error"
              role="alert"
            >
              {errorMessage}
            </div>
          ) : (
            <span>
              Guarda el horario habitual para aplicarlo a tu ficha y calendario.
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn primary hours10-save-button"
          disabled={
            loading
          }
          onClick={
            saveHours
          }
        >
          <Save
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          {loading
            ? "Guardando..."
            : "Guardar horario"}
        </button>
      </div>

      <style jsx>{`
        .hours10 {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .hours10-card {
          border: 1px solid var(--border);
          border-radius: 17px;
          background: #fff;
          box-shadow:
            0 10px 28px
            rgba(31,27,48,.025);
          overflow: hidden;
        }

        .hours10-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 19px;
          border-bottom: 1px solid #efedf2;
        }

        .hours10-title {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
        }

        .hours10-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 36px;
          border-radius: 10px;
          background: #f0ecff;
          color: var(--accent);
        }

        .hours10-kicker {
          color: var(--accent-dark);
          font-size: 11px;
          font-weight: 850;
        }

        .hours10-title h2 {
          margin: 2px 0 3px;
          font-size: 22px;
          line-height: 1.18;
          letter-spacing: -.025em;
        }

        .hours10-title p {
          max-width: 620px;
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .hours10-summary {
          min-width: 92px;
          padding: 9px 11px;
          border-radius: 11px;
          background: #f8f6ff;
          text-align: center;
        }

        .hours10-summary strong,
        .hours10-summary span {
          display: block;
        }

        .hours10-summary strong {
          color: var(--accent-dark);
          font-size: 20px;
          line-height: 1;
        }

        .hours10-summary span {
          margin-top: 3px;
          color: var(--muted);
          font-size: 11px;
        }

        .hours10-week {
          display: grid;
        }

        .hours10-day {
          display: grid;
          grid-template-columns:
            135px
            46px
            minmax(520px, 680px);
          align-items: center;
          justify-content: center;
          column-gap: 18px;
          row-gap: 8px;
          padding: 13px 18px;
          border-bottom: 1px solid #efedf2;
        }

        .hours10-day:last-child {
          border-bottom: 0;
        }

        .hours10-day.is-closed {
          background: #fcfbfd;
        }

        .hours10-day-name {
          min-width: 0;
          align-self: center;
        }

        .hours10-day-name strong {
          display: block;
          font-size: 13px;
        }

        .hours10-status {
          display: inline-flex;
          margin-top: 4px;
          padding: 3px 7px;
          border-radius: 999px;
          background: #eaf8ef;
          color: #24774c;
          font-size: 9px;
          font-weight: 800;
        }

        .hours10-status.is-closed {
          background: #f1eff4;
          color: #77717c;
        }

        .hours10-switch {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          justify-self: center;
          flex: 0 0 auto;
          cursor: pointer;
        }

        .hours10-switch input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .hours10-switch-track {
          position: relative;
          width: 38px;
          height: 22px;
          border-radius: 999px;
          background: #d9d6df;
          transition:
            background .16s ease;
        }

        .hours10-switch-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 1px 4px
            rgba(20,17,28,.22);
          transition:
            transform .16s ease;
        }

        .hours10-switch input:checked +
        .hours10-switch-track {
          background: var(--accent);
        }

        .hours10-switch input:checked +
        .hours10-switch-track
        .hours10-switch-knob {
          transform: translateX(16px);
        }

        .hours10-day-body {
          display: grid;
          gap: 8px;
          width: 100%;
          min-width: 0;
        }

        .hours10-shift {
          display: grid;
          grid-template-columns:
            126px
            minmax(0, 1fr);
          align-items: center;
          gap: 16px;
        }

        .hours10-shift-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #514d57;
          font-size: 12px;
          font-weight: 750;
        }

        .hours10-shift-label :global(svg) {
          color: #8276d9;
        }

        .hours10-times {
          display: grid;
          grid-template-columns:
            minmax(175px, 1fr)
            24px
            minmax(175px, 1fr);
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .hours10-times input {
          width: 100%;
          padding: 8px 9px;
          border: 1px solid #dedbe5;
          border-radius: 9px;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 12px;
          outline: none;
        }

        .hours10-times input:focus {
          border-color: #b9adff;
          box-shadow:
            0 0 0 3px
            rgba(112,87,245,.07);
        }

        .hours10-separator {
          color: var(--muted);
          text-align: center;
          font-size: 12px;
          font-weight: 650;
        }

        .hours10-secondary-action {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--accent-dark);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .hours10-secondary-action.is-remove {
          color: #a64a4a;
        }

        .hours10-closed-copy {
          grid-column: 3;
          color: var(--muted);
          font-size: 12px;
        }

        .hours10-save {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          border: 1px solid #dcd8e5;
          border-radius: 13px;
          background:
            linear-gradient(
              90deg,
              #fff,
              #fbfaff
            );
          box-shadow:
            0 8px 22px
            rgba(31,27,48,.03);
        }

        .hours10-save-copy {
          min-width: 0;
        }

        .hours10-save-copy span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .hours10-save-button {
          min-width: 165px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex: 0 0 auto;
        }

        .hours10-message {
          padding: 7px 9px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 750;
        }

        .hours10-message.is-success {
          background: #edf9f1;
          color: #237549;
        }

        .hours10-message.is-error {
          background: #fff0f0;
          color: #b42318;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 820px) {
          .hours10-day {
            grid-template-columns:
              minmax(0, 1fr)
              auto;
            justify-content: stretch;
            align-items: center;
            column-gap: 12px;
          }

          .hours10-day-name {
            grid-column: 1;
          }

          .hours10-switch {
            grid-column: 2;
            justify-self: end;
          }

          .hours10-day-body,
          .hours10-closed-copy {
            grid-column: 1 / -1;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .hours10 {
            gap: 10px;
            margin-top: 10px;
          }

          .hours10-head {
            padding: 15px;
          }

          .hours10-summary {
            display: none;
          }

          .hours10-title h2 {
            font-size: 21px;
          }

          .hours10-day {
            gap: 12px;
            padding: 14px;
          }

          .hours10-shift {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .hours10-times {
            grid-template-columns:
              minmax(0,1fr)
              18px
              minmax(0,1fr);
            justify-content: stretch;
          }

          .hours10-save {
            align-items: stretch;
            flex-direction: column;
          }

          .hours10-save-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
