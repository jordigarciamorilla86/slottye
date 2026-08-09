"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  AgendaBooking,
  AgendaBusinessBlock,
  AgendaManualBooking,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  businessId: string;
  weekStart: Date;

  mode?:
    | "business"
    | "admin";

  initialSlots: AgendaSlot[];
  initialBookings: AgendaBooking[];
  initialBlocks: AgendaBusinessBlock[];
  initialManualBookings: AgendaManualBooking[];
};

type WeekResponse = {
  slots:
    AgendaSlot[];

  bookings:
    AgendaBooking[];

  blocks:
    AgendaBusinessBlock[];

  manualBookings:
    AgendaManualBooking[];

  error?:
    string;
};

export default function useAgendaData({
  businessId,
  weekStart,
  mode = "business",
  initialSlots,
  initialBookings,
  initialBlocks,
  initialManualBookings,
}: Props) {
  const [
    slots,
    setSlots,
  ] =
    useState<
      AgendaSlot[]
    >(
      initialSlots
    );

  const [
    bookings,
    setBookings,
  ] =
    useState<
      AgendaBooking[]
    >(
      initialBookings
    );

  const [
    blocks,
    setBlocks,
  ] =
    useState<
      AgendaBusinessBlock[]
    >(
      initialBlocks
    );

  const [
    manualBookings,
    setManualBookings,
  ] =
    useState<
      AgendaManualBooking[]
    >(
      initialManualBookings
    );

  const [
    loadingWeek,
    setLoadingWeek,
  ] =
    useState(false);

  /*
   * ============================================================
   * CARGAR SEMANA
   * ============================================================
   */

  const loadWeekData =
    useCallback(
      async (
        start:
          Date
      ) => {
        setLoadingWeek(
          true
        );

        const normalizedStart =
          new Date(
            start
          );

        normalizedStart.setHours(
          0,
          0,
          0,
          0
        );

        try {
          /*
           * ======================================================
           * ENDPOINT
           * ======================================================
           *
           * Admin mantiene su API administrativa existente.
           *
           * Negocio utiliza ahora /api/agenda/week, que valida
           * sesión, bloqueo y propiedad antes de devolver datos.
           */

          const normalizedEnd =
  new Date(
    normalizedStart
  );

normalizedEnd.setDate(
  normalizedStart.getDate() +
    7
);

const startParam =
  encodeURIComponent(
    normalizedStart.toISOString()
  );

const endParam =
  encodeURIComponent(
    normalizedEnd.toISOString()
  );

const endpoint =
  mode ===
    "admin"
    ? `/api/admin/businesses/${businessId}/agenda/week?start=${startParam}&end=${endParam}`
    : `/api/agenda/week?businessId=${encodeURIComponent(
        businessId
      )}&start=${startParam}&end=${endParam}`;

          const response =
            await fetch(
              endpoint,
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const result =
            (
              await response.json()
            ) as WeekResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ??
                "No se ha podido cargar la semana."
            );
          }

          /*
           * ======================================================
           * ACTUALIZAR ESTADO
           * ======================================================
           */

          setSlots(
            result.slots ??
              []
          );

          setBookings(
            result.bookings ??
              []
          );

          setBlocks(
            result.blocks ??
              []
          );

          setManualBookings(
            result.manualBookings ??
              []
          );

          
          
        } catch (
          error
        ) {
          console.error(
            "Error loading agenda week:",
            error
          );
        } finally {
          setLoadingWeek(
            false
          );
        }
      },
      [
        businessId,
        mode,
      ]
    );

  /*
   * ============================================================
   * RECARGAR AL CAMBIAR DE SEMANA
   * ============================================================
   */

  useEffect(() => {
    void loadWeekData(
      weekStart
    );
  }, [
    weekStart,
    loadWeekData,
  ]);

  return {
    slots,
    bookings,
    blocks,
    manualBookings,
    loadingWeek,
    loadWeekData,
  };
}