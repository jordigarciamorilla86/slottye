"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AgendaVisibleDay,
} from "../types/agenda";

type Props = {
  weekStart: Date;
  weekDays: Date[];
  selectedMobileDay: number;

  setSelectedMobileDay: (
    value: number
  ) => void;

  setWeekStart: (
    value: Date
  ) => void;
};

const SLOT_MINUTES = 30;
const ROW_HEIGHT = 58;
const INITIAL_SCROLL_HOUR = 8;
const MOBILE_BREAKPOINT = 768;

function startOfDay(
  date: Date
) {
  const result =
    new Date(
      date
    );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function getMonday(
  date: Date
) {
  const result =
    startOfDay(
      date
    );

  const day =
    result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      diff
  );

  return result;
}

function getMondayDayIndex(
  date: Date
) {
  const day =
    date.getDay();

  return day === 0
    ? 6
    : day - 1;
}

function minutesFromStartOfDay(
  date: Date
) {
  return (
    date.getHours() *
      60 +
    date.getMinutes() +
    date.getSeconds() /
      60
  );
}

function scrollTopForMinute(
  minute: number
) {
  const normalizedMinute =
    Math.max(
      0,
      Math.min(
        24 * 60,
        minute
      )
    );

  return (
    normalizedMinute /
    SLOT_MINUTES
  ) *
    ROW_HEIGHT;
}

export default function useAgendaView({
  weekStart,
  weekDays,
  selectedMobileDay,
  setSelectedMobileDay,
  setWeekStart,
}: Props) {
  const [
    isMobile,
    setIsMobile,
  ] =
    useState(false);

  const [
    currentTime,
    setCurrentTime,
  ] =
    useState(
      new Date()
    );

  const agendaScrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
   * ============================================================
   * HORA ACTUAL
   * ============================================================
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date()
          );
        },
        60 * 1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  /*
   * ============================================================
   * RESPONSIVE
   * ============================================================
   */

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        `(max-width: ${MOBILE_BREAKPOINT}px)`
      );

    function updateMobile() {
      setIsMobile(
        mediaQuery.matches
      );
    }

    updateMobile();

    mediaQuery.addEventListener(
      "change",
      updateMobile
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMobile
      );
    };
  }, []);

  /*
   * ============================================================
   * DÍAS VISIBLES
   * ============================================================
   */

  const visibleDays =
    useMemo<
      AgendaVisibleDay[]
    >(() => {
      if (
        isMobile
      ) {
        return [
          {
            day:
              weekDays[
                selectedMobileDay
              ],

            dayIndex:
              selectedMobileDay,
          },
        ];
      }

      return weekDays.map(
        (
          day,
          index
        ) => ({
          day,

          dayIndex:
            index,
        })
      );
    }, [
      isMobile,
      weekDays,
      selectedMobileDay,
    ]);

  const gridTemplateColumns =
    isMobile
      ? "72px minmax(220px, 1fr)"
      : "80px repeat(7, minmax(130px, 1fr))";

  /*
   * ============================================================
   * FILAS VISUALES
   * ============================================================
   *
   * La agenda conserva líneas cada 30 minutos.
   * Los eventos, clics, movimientos y scroll pueden trabajar
   * con minutos exactos dentro de cada fila.
   * ============================================================
   */

  const timeRows =
    useMemo(() => {
      const result:
        number[] =
        [];

      for (
        let minute =
          0;
        minute <
        24 * 60;
        minute +=
          SLOT_MINUTES
      ) {
        result.push(
          minute
        );
      }

      return result;
    }, []);

  /*
   * ============================================================
   * SCROLL A FECHA Y HORA EXACTAS
   * ============================================================
   */

  const scrollToDate =
    useCallback(
      (
        date: Date,
        delay =
          0
      ) => {
        const performScroll =
          () => {
            const targetMinute =
              Math.max(
                0,
                minutesFromStartOfDay(
                  date
                ) -
                  60
              );

            if (
              agendaScrollRef.current
            ) {
              agendaScrollRef.current.scrollTop =
                scrollTopForMinute(
                  targetMinute
                );
            }
          };

        if (
          delay >
          0
        ) {
          window.setTimeout(
            performScroll,
            delay
          );
        } else {
          performScroll();
        }
      },
      []
    );

  /*
   * ============================================================
   * IR A UNA FECHA DE LA AGENDA
   * ============================================================
   */

  const goToAgendaDate =
    useCallback(
      (
        date: Date
      ) => {
        const resultWeekStart =
          getMonday(
            date
          );

        const changesWeek =
          resultWeekStart.getTime() !==
          weekStart.getTime();

        if (
          changesWeek
        ) {
          setWeekStart(
            resultWeekStart
          );
        }

        setSelectedMobileDay(
          getMondayDayIndex(
            date
          )
        );

        scrollToDate(
          date,
          changesWeek
            ? 250
            : 0
        );
      },
      [
        weekStart,
        setWeekStart,
        setSelectedMobileDay,
        scrollToDate,
      ]
    );

  /*
   * ============================================================
   * SCROLL INICIAL
   * ============================================================
   */

  useEffect(() => {
    const container =
      agendaScrollRef.current;

    if (
      !container
    ) {
      return;
    }

    const now =
      new Date();

    const viewingCurrentWeek =
      getMonday(
        now
      ).getTime() ===
      weekStart.getTime();

    let scrollMinute =
      INITIAL_SCROLL_HOUR *
      60;

    if (
      viewingCurrentWeek &&
      minutesFromStartOfDay(
        now
      ) >
        scrollMinute
    ) {
      scrollMinute =
        Math.max(
          scrollMinute,
          minutesFromStartOfDay(
            now
          ) -
            60
        );
    }

    container.scrollTop =
      scrollTopForMinute(
        scrollMinute
      );
  }, [
    weekStart,
  ]);

  /*
   * ============================================================
   * DÍA ACTUAL EN MÓVIL
   * ============================================================
   */

  useEffect(() => {
    if (
      !isMobile
    ) {
      return;
    }

    const today =
      new Date();

    if (
      getMonday(
        today
      ).getTime() ===
      weekStart.getTime()
    ) {
      setSelectedMobileDay(
        getMondayDayIndex(
          today
        )
      );
    }
  }, [
    isMobile,
    weekStart,
    setSelectedMobileDay,
  ]);

  return {
    isMobile,
    currentTime,
    agendaScrollRef,
    visibleDays,
    gridTemplateColumns,
    timeRows,
    goToAgendaDate,
  };
}