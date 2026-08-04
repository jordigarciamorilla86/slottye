"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

type Props = {
  initialWeekStart: string;
  onOpenAppointment: (
    date: Date
  ) => void;
};

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

function addDays(
  date: Date,
  days: number
) {
  const result =
    new Date(
      date
    );

  result.setDate(
    result.getDate() +
      days
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

function localDateInputValue(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function nextHalfHourValue() {
  const now =
    new Date();

  let hour =
    now.getHours();

  const minutes =
    now.getMinutes();

  let minute =
    minutes <= 30
      ? 30
      : 0;

  if (
    minutes > 30
  ) {
    hour +=
      1;
  }

  if (
    hour >= 24
  ) {
    hour =
      23;

    minute =
      30;
  }

  return `${String(
    hour
  ).padStart(
    2,
    "0"
  )}:${String(
    minute
  ).padStart(
    2,
    "0"
  )}`;
}

export default function useAgendaNavigation({
  initialWeekStart,
  onOpenAppointment,
}: Props) {
  const [
    selectedMobileDay,
    setSelectedMobileDay,
  ] =
    useState(
      getMondayDayIndex(
        new Date()
      )
    );

  const [
    showDatePicker,
    setShowDatePicker,
  ] =
    useState(false);

  const [
    showNewAppointment,
    setShowNewAppointment,
  ] =
    useState(false);

  const [
    newAppointmentDate,
    setNewAppointmentDate,
  ] =
    useState(
      localDateInputValue(
        new Date()
      )
    );

  const [
    newAppointmentTime,
    setNewAppointmentTime,
  ] =
    useState(
      nextHalfHourValue()
    );

  const [
    weekStart,
    setWeekStart,
  ] =
    useState(
      startOfDay(
        new Date(
          initialWeekStart
        )
      )
    );

  const weekDays =
    useMemo(
      () =>
        Array.from(
          {
            length:
              7,
          },
          (
            _,
            index
          ) =>
            addDays(
              weekStart,
              index
            )
        ),
      [
        weekStart,
      ]
    );

  const weekTitle =
    `${weekDays[0].toLocaleDateString(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "short",
      }
    )} – ${weekDays[6].toLocaleDateString(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "short",

        year:
          "numeric",
      }
    )}`;

  const closeTransientPanels =
    useCallback(
      () => {
        setShowDatePicker(
          false
        );

        setShowNewAppointment(
          false
        );
      },
      []
    );

  const toggleNewAppointment =
    useCallback(
      () => {
        setShowNewAppointment(
          (
            current
          ) =>
            !current
        );

        setShowDatePicker(
          false
        );
      },
      []
    );

  const closeNewAppointment =
    useCallback(
      () => {
        setShowNewAppointment(
          false
        );
      },
      []
    );

  const toggleDatePicker =
    useCallback(
      () => {
        setShowDatePicker(
          (
            current
          ) =>
            !current
        );

        setShowNewAppointment(
          false
        );
      },
      []
    );

  const goToDate =
    useCallback(
      (
        value:
          string
      ) => {
        if (
          !value
        ) {
          return;
        }

        const [
          year,
          month,
          day,
        ] =
          value
            .split("-")
            .map(
              Number
            );

        const selected =
          new Date(
            year,
            month -
              1,
            day,
            0,
            0,
            0,
            0
          );

        setWeekStart(
          getMonday(
            selected
          )
        );

        setSelectedMobileDay(
          getMondayDayIndex(
            selected
          )
        );

        setShowDatePicker(
          false
        );
      },
      []
    );

  const openNewAppointment =
    useCallback(
      () => {
        if (
          !newAppointmentDate ||
          !newAppointmentTime
        ) {
          return;
        }

        const [
          year,
          month,
          day,
        ] =
          newAppointmentDate
            .split("-")
            .map(
              Number
            );

        const [
          hour,
          minute,
        ] =
          newAppointmentTime
            .split(":")
            .map(
              Number
            );

        const selected =
          new Date(
            year,
            month -
              1,
            day,
            hour,
            minute,
            0,
            0
          );

        setWeekStart(
          getMonday(
            selected
          )
        );

        setSelectedMobileDay(
          getMondayDayIndex(
            selected
          )
        );

        setShowNewAppointment(
          false
        );

        onOpenAppointment(
          selected
        );
      },
      [
        newAppointmentDate,
        newAppointmentTime,
        onOpenAppointment,
      ]
    );

  const goPreviousWeek =
    useCallback(
      () => {
        setWeekStart(
          (
            current
          ) =>
            addDays(
              current,
              -7
            )
        );
      },
      []
    );

  const goNextWeek =
    useCallback(
      () => {
        setWeekStart(
          (
            current
          ) =>
            addDays(
              current,
              7
            )
        );
      },
      []
    );

  const goToday =
    useCallback(
      () => {
        const today =
          new Date();

        setWeekStart(
          getMonday(
            today
          )
        );

        setSelectedMobileDay(
          getMondayDayIndex(
            today
          )
        );
      },
      []
    );

  return {
    selectedMobileDay,
    setSelectedMobileDay,
    showDatePicker,
    showNewAppointment,
    newAppointmentDate,
    setNewAppointmentDate,
    newAppointmentTime,
    setNewAppointmentTime,
    weekStart,
    setWeekStart,
    weekDays,
    weekTitle,
    closeTransientPanels,
    toggleNewAppointment,
    closeNewAppointment,
    toggleDatePicker,
    goToDate,
    openNewAppointment,
    goPreviousWeek,
    goNextWeek,
    goToday,
  };
}
