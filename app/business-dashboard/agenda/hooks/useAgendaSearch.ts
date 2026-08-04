"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import type {
  AgendaBooking,
  AgendaManualBooking,
  GlobalAgendaSearchResult,
} from "../types/agenda";

type Props = {
  businessId: string;
};

export default function useAgendaSearch({
  businessId,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    searchText,
    setSearchText,
  ] =
    useState("");

  const [
    showSearchResults,
    setShowSearchResults,
  ] =
    useState(false);

  const [
    globalSearchResults,
    setGlobalSearchResults,
  ] =
    useState<
      GlobalAgendaSearchResult[]
    >([]);

  const [
    loadingSearch,
    setLoadingSearch,
  ] =
    useState(false);

  useEffect(() => {
    const query =
      searchText
        .trim()
        .toLowerCase();

    if (
      query.length < 2
    ) {
      setGlobalSearchResults(
        []
      );

      setLoadingSearch(
        false
      );

      return;
    }

    const timeout =
      window.setTimeout(
        async () => {
          setLoadingSearch(
            true
          );

          try {
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
                .order(
                  "start_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  500
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

            const {
              data:
                onlineData,
              error:
                onlineError,
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
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  500
                );

            if (
              onlineError
            ) {
              throw onlineError;
            }

            const normalizedOnline =
              (
                onlineData ??
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

            const manualResults =
              normalizedManual
                .filter(
                  (
                    booking
                  ) => {
                    const fields =
                      [
                        booking.customer_name,
                        booking.customer_email,
                        booking.customer_phone,
                        booking.services
                          ?.name,
                      ];

                    return fields.some(
                      (
                        value
                      ) =>
                        value
                          ?.toLowerCase()
                          .includes(
                            query
                          )
                    );
                  }
                )
                .map(
                  (
                    booking
                  ): GlobalAgendaSearchResult => ({
                    type:
                      "manual",

                    id:
                      booking.id,

                    title:
                      booking.customer_name,

                    subtitle:
                      booking.services
                        ?.name ??
                      "Reserva manual",

                    startAt:
                      booking.start_at,

                    event:
                      booking,
                  })
                );

            const onlineResults =
              normalizedOnline
                .filter(
                  (
                    booking
                  ) => {
                    if (
                      !booking.slots
                    ) {
                      return false;
                    }

                    const fields =
                      [
                        booking.profiles
                          ?.name,
                        booking.profiles
                          ?.email,
                        booking.services
                          ?.name,
                      ];

                    return fields.some(
                      (
                        value
                      ) =>
                        value
                          ?.toLowerCase()
                          .includes(
                            query
                          )
                    );
                  }
                )
                .map(
                  (
                    booking
                  ): GlobalAgendaSearchResult => ({
                    type:
                      "booking",

                    id:
                      booking.id,

                    title:
                      booking.profiles
                        ?.name ??
                      "Cliente",

                    subtitle:
                      booking.services
                        ?.name ??
                      "Reserva Slottye",

                    startAt:
                      booking.slots!
                        .start_at,

                    event:
                      booking,
                  })
                );

            const results =
              [
                ...manualResults,
                ...onlineResults,
              ]
                .sort(
                  (
                    a,
                    b
                  ) =>
                    new Date(
                      b.startAt
                    ).getTime() -
                    new Date(
                      a.startAt
                    ).getTime()
                )
                .slice(
                  0,
                  50
                );

            setGlobalSearchResults(
              results
            );
          } catch (
            error
          ) {
            console.error(
              "Error searching agenda:",
              error
            );

            setGlobalSearchResults(
              []
            );
          } finally {
            setLoadingSearch(
              false
            );
          }
        },
        300
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    searchText,
    businessId,
    supabase,
  ]);

  return {
    searchText,
    setSearchText,
    showSearchResults,
    setShowSearchResults,
    globalSearchResults,
    loadingSearch,
  };
}
