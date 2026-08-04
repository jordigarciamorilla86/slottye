"use client";

import {
  useCallback,
  useState,
} from "react";

import type {
  AgendaSelectedEvent,
} from "../types/agenda";

type ReloadAgenda =
  () =>
    void |
    Promise<void>;

export default function useAgendaModals() {
  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState<
      Date |
      null
    >(
      null
    );

  const [
    selectedEvent,
    setSelectedEvent,
  ] =
    useState<
      AgendaSelectedEvent
    >(
      null
    );

  const openAppointment =
    useCallback(
      (
        date:
          Date
      ) => {
        setSelectedEvent(
          null
        );

        setSelectedDate(
          date
        );
      },
      []
    );

  const openSlotModal =
    useCallback(
      (
        day:
          Date,
        minute:
          number
      ) => {
        const selected =
          new Date(
            day
          );

        selected.setHours(
          Math.floor(
            minute /
              60
          ),
          minute %
            60,
          0,
          0
        );

        openAppointment(
          selected
        );
      },
      [
        openAppointment,
      ]
    );

  const selectEvent =
    useCallback(
      (
        event:
          AgendaSelectedEvent
      ) => {
        setSelectedDate(
          null
        );

        setSelectedEvent(
          event
        );
      },
      []
    );

  const clearModals =
    useCallback(
      () => {
        setSelectedDate(
          null
        );

        setSelectedEvent(
          null
        );
      },
      []
    );

  const closeSlotModal =
    useCallback(
      (
        reloadAgenda?:
          ReloadAgenda
      ) => {
        setSelectedDate(
          null
        );

        if (
          reloadAgenda
        ) {
          void reloadAgenda();
        }
      },
      []
    );

  const closeEventModal =
    useCallback(
      (
        reloadAgenda?:
          ReloadAgenda
      ) => {
        setSelectedEvent(
          null
        );

        if (
          reloadAgenda
        ) {
          void reloadAgenda();
        }
      },
      []
    );

  const reserveManualFromSlot =
    useCallback(
      (
        date:
          Date
      ) => {
        openAppointment(
          date
        );
      },
      [
        openAppointment,
      ]
    );

  return {
    selectedDate,
    selectedEvent,
    openAppointment,
    openSlotModal,
    selectEvent,
    clearModals,
    closeSlotModal,
    closeEventModal,
    reserveManualFromSlot,
  };
}
