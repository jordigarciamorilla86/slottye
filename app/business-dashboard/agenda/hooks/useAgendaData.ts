"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import type {
  AgendaBooking,
  AgendaBusinessBlock,
  AgendaManualBooking,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  businessId: string;
  weekStart: Date;
  initialSlots: AgendaSlot[];
  initialBookings: AgendaBooking[];
  initialBlocks: AgendaBusinessBlock[];
  initialManualBookings: AgendaManualBooking[];
};

export default function useAgendaData({
  businessId,
  weekStart,
  initialSlots,
  initialBookings,
  initialBlocks,
  initialManualBookings,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

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

  const loadWeekData =
    useCallback(
      async (
        start: Date
      ) => {
        setLoadingWeek(
          true
        );

        const end =
          new Date(
            start
          );

        end.setDate(
          start.getDate() +
            7
        );

        try {
          const {
            data:
              slotsData,
            error:
              slotsError,
          } =
            await supabase
              .from(
                "slots"
              )
              .select(`
                id,
                service_id,
                start_at,
                end_at,
                status
              `)
              .eq(
                "business_id",
                businessId
              )
              .lt(
                "start_at",
                end.toISOString()
              )
              .gt(
                "end_at",
                start.toISOString()
              )
              .order(
                "start_at"
              );

          if (
            slotsError
          ) {
            throw slotsError;
          }

          const weekSlotIds =
            (
              slotsData ??
              []
            ).map(
              (slot) =>
                slot.id
            );

          let bookingsData:
            AgendaBooking[] =
            [];

          if (
            weekSlotIds.length >
            0
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "bookings"
                )
                .select(`
                  id,
                  slot_id,
                  user_id,
                  service_id,
                  status,
                  cancelled_at,

                  profiles (
                    id,
                    name,
                    email
                  ),

                  services (
                    id,
                    name,
                    duration_minutes
                  ),

                  slots (
                    id,
                    start_at,
                    end_at,
                    status
                  )
                `)
                .eq(
                  "business_id",
                  businessId
                )
                .in(
                  "slot_id",
                  weekSlotIds
                );

            if (
              error
            ) {
              throw error;
            }

            bookingsData =
              (
                data ??
                []
              ).map(
                (
                  booking
                ) => ({
                  ...booking,

                  profiles:
                    Array.isArray(
                      booking.profiles
                    )
                      ? booking
                          .profiles[0] ??
                        null
                      : booking.profiles,

                  services:
                    Array.isArray(
                      booking.services
                    )
                      ? booking
                          .services[0] ??
                        null
                      : booking.services,

                  slots:
                    Array.isArray(
                      booking.slots
                    )
                      ? booking
                          .slots[0] ??
                        null
                      : booking.slots,
                })
              ) as AgendaBooking[];
          }

          const {
            data:
              blocksData,
            error:
              blocksError,
          } =
            await supabase
              .from(
                "business_blocks"
              )
              .select(`
                id,
                start_at,
                end_at,
                reason
              `)
              .eq(
                "business_id",
                businessId
              )
              .lt(
                "start_at",
                end.toISOString()
              )
              .gt(
                "end_at",
                start.toISOString()
              )
              .order(
                "start_at"
              );

          if (
            blocksError
          ) {
            throw blocksError;
          }

          const {
            data:
              manualData,
            error:
              manualError,
          } =
            await supabase
              .from(
                "manual_bookings"
              )
              .select(`
                id,
                business_id,
                service_id,
                customer_name,
                customer_phone,
                customer_email,
                start_at,
                end_at,
                notes,
                created_at,
                updated_at,

                services (
                  id,
                  name,
                  duration_minutes
                )
              `)
              .eq(
                "business_id",
                businessId
              )
              .lt(
                "start_at",
                end.toISOString()
              )
              .gt(
                "end_at",
                start.toISOString()
              )
              .order(
                "start_at"
              );

          if (
            manualError
          ) {
            throw manualError;
          }

          const normalizedManual =
            (
              manualData ??
              []
            ).map(
              (
                booking
              ) => ({
                ...booking,

                services:
                  Array.isArray(
                    booking.services
                  )
                    ? booking
                        .services[0] ??
                      null
                    : booking.services,
              })
            ) as AgendaManualBooking[];

          setSlots(
            slotsData ??
              []
          );

          setBookings(
            bookingsData
          );

          setBlocks(
            blocksData ??
              []
          );

          setManualBookings(
            normalizedManual
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
        supabase,
      ]
    );

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
