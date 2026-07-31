"use client";

import AgendaSlotModal from "./AgendaSlotModal";
import AgendaEventModal from "./AgendaEventModal";

import { createClient } from "@/lib/supabase/client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  active: boolean;
};

type BusinessHour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  open_time_2: string | null;
  close_time_2: string | null;
  closed: boolean;
};

type Slot = {
  id: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

type Booking = {
  id: string;
  slot_id: string;
  user_id: string;
  service_id: string | null;
  status: string;
  cancelled_at: string | null;

  profiles: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;

  services: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;

  slots: {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
  } | null;
};

type BusinessBlock = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type ManualBooking = {
  id: string;
  business_id: string;
  service_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  start_at: string;
  end_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  services: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;
};

type SelectedEvent =
  | {
      type: "manual";
      event: ManualBooking;
    }
  | {
      type: "booking";
      event: Booking;
    }
  | {
      type: "block";
      event: BusinessBlock;
    }
  | {
      type: "slot";
      event: Slot;
    }
  | null;

type CellEvent =
  | {
      type: "manual";
      id: string;
      title: string;
      subtitle: string;
      source: ManualBooking;
      startAt: string;
      endAt: string;
    }
  | {
      type: "booking";
      id: string;
      title: string;
      subtitle: string;
      source: Booking;
      startAt: string;
      endAt: string;
    }
  | {
      type: "block";
      id: string;
      title: string;
      subtitle: string;
      source: BusinessBlock;
      startAt: string;
      endAt: string;
    }
  | {
      type: "slot";
      id: string;
      title: string;
      subtitle: string;
      source: Slot;
      startAt: string;
      endAt: string;
    };

    type GlobalSearchResult =
  | {
      type: "manual";
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      event: ManualBooking;
    }
  | {
      type: "booking";
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      event: Booking;
    };

type Props = {
  businessId: string;
  businessName: string;
  initialWeekStart: string;

  services: Service[];

  businessHours: BusinessHour[];

  initialSlots: Slot[];

  initialBookings: Booking[];

  initialBlocks: BusinessBlock[];

  initialManualBookings: ManualBooking[];
};

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const SLOT_MINUTES = 30;
const ROW_HEIGHT = 58;
const INITIAL_SCROLL_HOUR = 8;
const AGENDA_HEIGHT = 600;
const MOBILE_BREAKPOINT = 768;

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function startOfDay(
  date: Date
) {
  const result =
    new Date(date);

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
    new Date(date);

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
    startOfDay(date);

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

function minutesFromTime(
  value: string
) {
  const [
    hour,
    minute,
  ] =
    value
      .slice(0, 5)
      .split(":")
      .map(Number);

  return (
    hour * 60 +
    minute
  );
}

function formatTime(
  minutes: number
) {
  const hour =
    Math.floor(
      minutes / 60
    );

  const minute =
    minutes % 60;

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

function sameLocalDay(
  a: Date,
  b: Date
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}

function localDateInputValue(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
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
    0;

  if (
    minutes === 0
  ) {
    minute =
      30;
  } else if (
    minutes <= 30
  ) {
    minute =
      30;
  } else {
    hour += 1;
    minute = 0;
  }

  if (
    hour >= 24
  ) {
    hour = 23;
    minute = 30;
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

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function WeeklyAgenda({
  businessId,
  businessName,
  initialWeekStart,
  services,
  businessHours,
  initialSlots,
  initialBookings,
  initialBlocks,
  initialManualBookings,
}: Props) {
  /*
   * ============================================================
   * SUPABASE
   * ============================================================
   */

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [
    slots,
    setSlots,
  ] =
    useState<Slot[]>(
      initialSlots
    );

  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>(
      initialBookings
    );

  const [
    blocks,
    setBlocks,
  ] =
    useState<
      BusinessBlock[]
    >(
      initialBlocks
    );

  const [
    manualBookings,
    setManualBookings,
  ] =
    useState<
      ManualBooking[]
    >(
      initialManualBookings
    );

  const [
    loadingWeek,
    setLoadingWeek,
  ] =
    useState(false);

    const [
        currentTime,
        setCurrentTime,
      ] =
        useState(
          new Date()
        );

  /*
   * ============================================================
   * RESPONSIVE
   * ============================================================
   */

  const [
    isMobile,
    setIsMobile,
  ] =
    useState(false);

  const [
    selectedMobileDay,
    setSelectedMobileDay,
  ] =
    useState(
      getMondayDayIndex(
        new Date()
      )
    );

  /*
   * ============================================================
   * MODALES
   * ============================================================
   */

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    selectedEvent,
    setSelectedEvent,
  ] =
    useState<SelectedEvent>(
      null
    );

  /*
   * ============================================================
   * IR A FECHA
   * ============================================================
   */

  const [
    showDatePicker,
    setShowDatePicker,
  ] =
    useState(false);

  /*
   * ============================================================
   * NUEVA CITA
   * ============================================================
   */

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

  /*
   * ============================================================
   * SEMANA
   * ============================================================
   */

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

  /*
   * ============================================================
   * SCROLL
   * ============================================================
   */

  const agendaScrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

    const [
        searchText,
        setSearchText,
      ] = useState("");
      
      const [
        showSearchResults,
        setShowSearchResults,
      ] = useState(false);

      const [
        globalSearchResults,
        setGlobalSearchResults,
      ] =
        useState<
          GlobalSearchResult[]
        >([]);
      
      const [
        loadingSearch,
        setLoadingSearch,
      ] =
        useState(false);

/*
 * ============================================================
 * ACTUALIZAR HORA ACTUAL
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
   * DETECTAR MÓVIL
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
   * DÍAS
   * ============================================================
   */

  const weekDays =
    useMemo(
      () =>
        Array.from(
          {
            length: 7,
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
      [weekStart]
    );

/*
 * ============================================================
 * BUSCADOR GLOBAL DE CITAS
 * ============================================================
 */

useEffect(() => {
    const query =
      searchText
        .trim()
        .toLowerCase();
  
    /*
     * No buscamos con 0 o 1 carácter.
     */
  
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
  
    /*
     * Esperamos 300 ms para no consultar
     * Supabase en cada pulsación.
     */
  
    const timeout =
      window.setTimeout(
        async () => {
          setLoadingSearch(
            true
          );
  
          try {
            /*
             * ================================================
             * RESERVAS MANUALES
             * ================================================
             */
  
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
                .limit(500);
  
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
              ) as ManualBooking[];
  
            /*
             * ================================================
             * RESERVAS SLOTTYE
             * ================================================
             */
  
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
                .limit(500);
  
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
              ) as Booking[];
  
            /*
             * ================================================
             * FILTRAR RESERVAS MANUALES
             * ================================================
             */
  
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
                  ): GlobalSearchResult => ({
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
  
            /*
             * ================================================
             * FILTRAR RESERVAS SLOTTYE
             * ================================================
             */
  
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
                  ): GlobalSearchResult => ({
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
  
            /*
             * ================================================
             * UNIR Y ORDENAR
             * ================================================
             */
  
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

/*
 * ============================================================
 * IR A RESULTADO DE BÚSQUEDA
 * ============================================================
 */

function goToSearchResult(
    result:
      GlobalSearchResult
  ) {
    const date =
      new Date(
        result.startAt
      );
  
    /*
     * La cita puede estar en otra semana.
     */
  
    const resultWeekStart =
      getMonday(
        date
      );
  
    const changesWeek =
      resultWeekStart.getTime() !==
      weekStart.getTime();
  
    /*
     * Ir a su semana.
     */
  
    if (
      changesWeek
    ) {
      setWeekStart(
        resultWeekStart
      );
    }
  
    /*
     * Seleccionar día correspondiente
     * para la vista móvil.
     */
  
    setSelectedMobileDay(
      getMondayDayIndex(
        date
      )
    );
  
    /*
     * Scroll una hora antes.
     *
     * Si estamos cambiando de semana,
     * esperamos a que React pinte la
     * nueva agenda.
     */
  
    const scrollToBooking =
      () => {
        const hour =
          Math.max(
            0,
            date.getHours() -
              1
          );
  
        const rowsBeforeHour =
          hour *
          (60 /
            SLOT_MINUTES);
  
        if (
          agendaScrollRef.current
        ) {
          agendaScrollRef.current.scrollTop =
            rowsBeforeHour *
            ROW_HEIGHT;
        }
      };
  
    if (
      changesWeek
    ) {
      window.setTimeout(
        scrollToBooking,
        250
      );
    } else {
      scrollToBooking();
    }
  
    /*
     * Abrimos la reserva utilizando
     * el objeto que ya devolvió
     * la búsqueda.
     */
  
    if (
      result.type ===
      "manual"
    ) {
      setSelectedEvent({
        type:
          "manual",
  
        event:
          result.event,
      });
    } else {
      setSelectedEvent({
        type:
          "booking",
  
        event:
          result.event,
      });
    }
  
    setShowSearchResults(
      false
    );
  }
  /*
   * ============================================================
   * DÍAS VISIBLES
   * ============================================================
   */

  const visibleDays =
    useMemo(() => {
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

  /*
   * ============================================================
   * GRID
   * ============================================================
   */

  const gridTemplateColumns =
    isMobile
      ? "72px minmax(220px, 1fr)"
      : "80px repeat(7, minmax(130px, 1fr))";

  /*
   * ============================================================
   * 24 HORAS
   * ============================================================
   */

  const timeRows =
    useMemo(() => {
      const result:
        number[] =
        [];

      for (
        let minute = 0;
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
   * CARGAR SEMANA
   * ============================================================
   */

  async function loadWeekData(
    start: Date
  ) {
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
      /*
       * SLOTS
       */

      const {
        data:
          slotsData,
        error:
          slotsError,
      } =
        await supabase
          .from("slots")
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

      /*
       * RESERVAS ONLINE
       */

      const weekSlotIds =
        (
          slotsData ??
          []
        ).map(
          (slot) =>
            slot.id
        );

      let bookingsData:
        Booking[] =
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
          ) as Booking[];
      }

      /*
       * BLOQUEOS
       */

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

      /*
       * RESERVAS MANUALES
       */

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
        ) as ManualBooking[];

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
  }

  /*
   * ============================================================
   * CAMBIO DE SEMANA
   * ============================================================
   */

  useEffect(() => {
    void loadWeekData(
      weekStart
    );
  }, [
    weekStart,
    businessId,
  ]);

  /*
 * ============================================================
 * SCROLL INICIAL INTELIGENTE
 * ============================================================
 */

useEffect(() => {
  const container =
    agendaScrollRef.current;

  if (!container) {
    return;
  }

  const now =
    new Date();

  const currentWeekMonday =
    getMonday(
      now
    );

  const viewingCurrentWeek =
    currentWeekMonday.getTime() ===
    weekStart.getTime();

  let scrollHour =
    INITIAL_SCROLL_HOUR;

  /*
   * Si estamos viendo la semana actual
   * y ya son más de las 08:00,
   * mostramos aproximadamente una hora antes.
   */

  if (
    viewingCurrentWeek &&
    now.getHours() >
      INITIAL_SCROLL_HOUR
  ) {
    scrollHour =
      Math.max(
        INITIAL_SCROLL_HOUR,
        now.getHours() - 1
      );
  }

  const rowsBeforeHour =
    scrollHour *
    (60 /
      SLOT_MINUTES);

  container.scrollTop =
    rowsBeforeHour *
    ROW_HEIGHT;
}, [
  weekStart,
]);

/*
 * ============================================================
 * SELECCIONAR HOY EN MÓVIL
 * ============================================================
 */

useEffect(() => {
    if (!isMobile) {
      return;
    }
  
    const today =
      new Date();
  
    const todayMonday =
      getMonday(
        today
      );
  
    /*
     * Solo seleccionamos hoy si estamos
     * viendo realmente la semana actual.
     */
  
    if (
      todayMonday.getTime() ===
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
  ]);
  /*
   * ============================================================
   * ABRIR CREACIÓN
   * ============================================================
   */

  function openSlotModal(
    day: Date,
    minute: number
  ) {
    const selected =
      new Date(day);

    selected.setHours(
      Math.floor(
        minute / 60
      ),
      minute % 60,
      0,
      0
    );

    setSelectedDate(
      selected
    );
  }

  function closeSlotModal() {
    setSelectedDate(
      null
    );

    void loadWeekData(
      weekStart
    );
  }

  function closeEventModal() {
    setSelectedEvent(
      null
    );

    void loadWeekData(
      weekStart
    );
  }

  /*
   * ============================================================
   * IR A FECHA
   * ============================================================
   */

  function goToDate(
    value: string
  ) {
    if (!value) {
      return;
    }

    const [
      year,
      month,
      day,
    ] =
      value
        .split("-")
        .map(Number);

    const selected =
      new Date(
        year,
        month - 1,
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
  }

  /*
   * ============================================================
   * NUEVA CITA
   * ============================================================
   */

  function openNewAppointment() {
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
        .map(Number);

    const [
      hour,
      minute,
    ] =
      newAppointmentTime
        .split(":")
        .map(Number);

    const selected =
      new Date(
        year,
        month - 1,
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

    setSelectedDate(
      selected
    );
  }

  /*
   * ============================================================
   * HORARIO HABITUAL
   * ============================================================
   */

  function isOpenAt(
    dayIndex: number,
    minute: number
  ) {
    const schedule =
      businessHours.find(
        (hour) =>
          hour.day_of_week ===
          dayIndex
      );

    if (
      !schedule ||
      schedule.closed
    ) {
      return false;
    }

    function inRange(
      start:
        string |
        null,
      end:
        string |
        null
    ) {
      if (
        !start ||
        !end
      ) {
        return false;
      }

      const startMinute =
        minutesFromTime(
          start
        );

      const endMinute =
        minutesFromTime(
          end
        );

      return (
        minute >=
          startMinute &&
        minute <
          endMinute
      );
    }

    return (
      inRange(
        schedule.open_time,
        schedule.close_time
      ) ||
      inRange(
        schedule.open_time_2,
        schedule.close_time_2
      )
    );
  }

  /*
   * ============================================================
   * EVENTOS
   * ============================================================
   */

  function getCellData(
    date: Date,
    minute: number
  ):
    CellEvent |
    null {
    const cellStart =
      new Date(date);

    cellStart.setHours(
      Math.floor(
        minute / 60
      ),
      minute % 60,
      0,
      0
    );

    const cellEnd =
      new Date(
        cellStart.getTime() +
          SLOT_MINUTES *
            60 *
            1000
      );

    /*
     * RESERVA MANUAL
     */

    const manualBooking =
      manualBookings.find(
        (booking) => {
          const start =
            new Date(
              booking.start_at
            );

          const end =
            new Date(
              booking.end_at
            );

          return (
            start <
              cellEnd &&
            end >
              cellStart
          );
        }
      );

    if (
      manualBooking
    ) {
      return {
        type:
          "manual",

        id:
          manualBooking.id,

        title:
          manualBooking.customer_name,

        subtitle:
          manualBooking.services
            ?.name ??
          "Reserva manual",

        source:
          manualBooking,

        startAt:
          manualBooking.start_at,

        endAt:
          manualBooking.end_at,
      };
    }

    /*
     * RESERVA SLOTTYE
     */

    const onlineBooking =
      bookings.find(
        (booking) => {
          if (
            booking.status !==
              "CONFIRMED" ||
            !booking.slots
          ) {
            return false;
          }

          const start =
            new Date(
              booking.slots.start_at
            );

          const end =
            new Date(
              booking.slots.end_at
            );

          return (
            start <
              cellEnd &&
            end >
              cellStart
          );
        }
      );

    if (
      onlineBooking &&
      onlineBooking.slots
    ) {
      return {
        type:
          "booking",

        id:
          onlineBooking.id,

        title:
          onlineBooking.profiles
            ?.name ??
          "Cliente",

        subtitle:
          onlineBooking.services
            ?.name ??
          "Reserva Slottye",

        source:
          onlineBooking,

        startAt:
          onlineBooking.slots.start_at,

        endAt:
          onlineBooking.slots.end_at,
      };
    }

    /*
     * BLOQUEO
     */

    const block =
      blocks.find(
        (item) => {
          const start =
            new Date(
              item.start_at
            );

          const end =
            new Date(
              item.end_at
            );

          return (
            start <
              cellEnd &&
            end >
              cellStart
          );
        }
      );

    if (
      block
    ) {
      return {
        type:
          "block",

        id:
          block.id,

        title:
          "Bloqueado",

        subtitle:
          block.reason ??
          "",

        source:
          block,

        startAt:
          block.start_at,

        endAt:
          block.end_at,
      };
    }

    /*
     * DISPONIBILIDAD
     */

    const slot =
      slots.find(
        (item) => {
          if (
            item.status !==
              "AVAILABLE"
          ) {
            return false;
          }

          const start =
            new Date(
              item.start_at
            );

          const end =
            new Date(
              item.end_at
            );

          return (
            start <
              cellEnd &&
            end >
              cellStart
          );
        }
      );

    if (
      slot
    ) {
      return {
        type:
          "slot",

        id:
          slot.id,

        title:
          "Disponible",

        subtitle:
          services.find(
            (service) =>
              service.id ===
              slot.service_id
          )?.name ??
          "",

        source:
          slot,

        startAt:
          slot.start_at,

        endAt:
          slot.end_at,
      };
    }

    return null;
  }

  /*
   * ============================================================
   * ABRIR EVENTO
   * ============================================================
   */

  function openExistingEvent(
    event: CellEvent
  ) {
    if (
      event.type ===
      "manual"
    ) {
      setSelectedEvent({
        type:
          "manual",

        event:
          event.source,
      });

      return;
    }

    if (
      event.type ===
      "booking"
    ) {
      setSelectedEvent({
        type:
          "booking",

        event:
          event.source,
      });

      return;
    }

    if (
      event.type ===
      "block"
    ) {
      setSelectedEvent({
        type:
          "block",

        event:
          event.source,
      });

      return;
    }

    if (
      event.type ===
      "slot"
    ) {
      setSelectedEvent({
        type:
          "slot",

        event:
          event.source,
      });
    }
  }

  /*
   * ============================================================
   * NAVEGACIÓN
   * ============================================================
   */

  function goPreviousWeek() {
    setWeekStart(
      (
        current
      ) =>
        addDays(
          current,
          -7
        )
    );
  }

  function goNextWeek() {
    setWeekStart(
      (
        current
      ) =>
        addDays(
          current,
          7
        )
    );
  }

  function goToday() {
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
  }

  /*
   * ============================================================
   * TÍTULO
   * ============================================================
   */

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

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div
      style={{
        marginTop:
          28,
      }}
    >
      {/* ======================================================
          NAVEGACIÓN
          ====================================================== */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            12,

          flexWrap:
            "wrap",

          marginBottom:
            20,
        }}
      >
        <button
          type="button"
          className="btn"
          disabled={
            loadingWeek
          }
          onClick={
            goPreviousWeek
          }
        >
          ← Semana anterior
        </button>

        <div
          style={{
            textAlign:
              "center",
          }}
        >
          <strong
            style={{
              fontSize:
                18,
            }}
          >
            {weekTitle}
          </strong>

          <div
            className="muted"
            style={{
              marginTop:
                3,

              fontSize:
                13,
            }}
          >
            Agenda de{" "}
            {businessName}
          </div>

          {loadingWeek && (
            <div
              className="muted"
              style={{
                marginTop:
                  4,

                fontSize:
                  12,
              }}
            >
              Cargando agenda...
            </div>
          )}
        </div>

        <div
          style={{
            display:
              "flex",

            gap:
              8,

            flexWrap:
              "wrap",

            position:
              "relative",
          }}
        >

       
          {/* ================================================
              NUEVA CITA
              ================================================ */}

          <button
            type="button"
            className="btn primary"
            disabled={
              loadingWeek
            }
            onClick={() => {
              setShowNewAppointment(
                (
                  current
                ) =>
                  !current
              );

              setShowDatePicker(
                false
              );
            }}
          >
            + Nueva cita
          </button>

          {showNewAppointment && (
            <div
              style={{
                position:
                  "absolute",

                top:
                  "calc(100% + 8px)",

                right:
                  0,

                zIndex:
                  110,

                width:
                  290,

                maxWidth:
                  "calc(100vw - 32px)",

                padding:
                  16,

                border:
                  "1px solid var(--border)",

                borderRadius:
                  14,

                background:
                  "#ffffff",

                boxShadow:
                  "0 12px 35px rgba(15, 23, 42, 0.15)",

                textAlign:
                  "left",
              }}
            >
              <strong
                style={{
                  display:
                    "block",

                  marginBottom:
                    14,
                }}
              >
                Nueva cita
              </strong>

              <label>
                <span
                  style={{
                    display:
                      "block",

                    fontSize:
                      12,

                    fontWeight:
                      700,

                    marginBottom:
                      6,
                  }}
                >
                  Fecha
                </span>

                <input
                  type="date"
                  value={
                    newAppointmentDate
                  }
                  onChange={(
                    event
                  ) =>
                    setNewAppointmentDate(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    smallInputStyle
                  }
                />
              </label>

              <label>
                <span
                  style={{
                    display:
                      "block",

                    fontSize:
                      12,

                    fontWeight:
                      700,

                    marginBottom:
                      6,
                  }}
                >
                  Hora
                </span>

                <input
                  type="time"
                  step={
                    1800
                  }
                  value={
                    newAppointmentTime
                  }
                  onChange={(
                    event
                  ) =>
                    setNewAppointmentTime(
                      event
                        .target
                        .value
                    )
                  }
                  style={
                    smallInputStyle
                  }
                />
              </label>

              <button
                type="button"
                className="btn primary"
                style={{
                  width:
                    "100%",
                }}
                onClick={
                  openNewAppointment
                }
              >
                Continuar
              </button>

              <button
                type="button"
                className="btn"
                style={{
                  width:
                    "100%",

                  marginTop:
                    8,
                }}
                onClick={() =>
                  setShowNewAppointment(
                    false
                  )
                }
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ================================================
              IR A FECHA
              ================================================ */}

          <button
            type="button"
            className="btn"
            disabled={
              loadingWeek
            }
            onClick={() => {
              setShowDatePicker(
                (
                  current
                ) =>
                  !current
              );

              setShowNewAppointment(
                false
              );
            }}
          >
            📅 Ir a fecha
          </button>

          {showDatePicker && (
            <div
              style={{
                position:
                  "absolute",

                top:
                  "calc(100% + 8px)",

                right:
                  0,

                zIndex:
                  100,

                width:
                  250,

                maxWidth:
                  "calc(100vw - 32px)",

                padding:
                  14,

                border:
                  "1px solid var(--border)",

                borderRadius:
                  14,

                background:
                  "#ffffff",

                boxShadow:
                  "0 12px 35px rgba(15, 23, 42, 0.15)",

                textAlign:
                  "left",
              }}
            >
              <strong
                style={{
                  display:
                    "block",

                  fontSize:
                    14,

                  marginBottom:
                    8,
                }}
              >
                Ir a una fecha
              </strong>

              <input
                type="date"
                autoFocus
                onChange={(
                  event
                ) =>
                  goToDate(
                    event
                      .target
                      .value
                  )
                }
                style={
                  smallInputStyle
                }
              />

              <div
                className="muted"
                style={{
                  fontSize:
                    11,

                  lineHeight:
                    1.4,
                }}
              >
                Selecciona cualquier día y la agenda irá directamente a esa semana.
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn"
            disabled={
              loadingWeek
            }
            onClick={
              goToday
            }
          >
            Hoy
          </button>

          <button
            type="button"
            className="btn"
            disabled={
              loadingWeek
            }
            onClick={
              goNextWeek
            }
          >
            Semana siguiente →
          </button>
        </div>
      </div>
           {/* ======================================================
    BUSCADOR
    ====================================================== */}

<div
  style={{
    position:
      "relative",

    maxWidth:
      520,

    marginBottom:
      18,
  }}
>
  <input
    type="search"
    value={
      searchText
    }
    onChange={(
      event
    ) => {
      setSearchText(
        event.target.value
      );

      setShowSearchResults(
        true
      );
    }}
    onFocus={() =>
      setShowSearchResults(
        true
      )
    }
    placeholder="🔎 Buscar cualquier cita..."
    style={{
      width:
        "100%",

      padding:
        "12px 14px",

      border:
        "1px solid var(--border)",

      borderRadius:
        12,

      background:
        "#ffffff",

      color:
        "var(--text)",

      font:
        "inherit",
    }}
  />

  {showSearchResults &&
    searchText.trim() && (
      <div
        style={{
          position:
            "absolute",

          top:
            "calc(100% + 6px)",

          left:
            0,

          right:
            0,

          zIndex:
            120,

          maxHeight:
            320,

          overflowY:
            "auto",

          background:
            "#ffffff",

          border:
            "1px solid var(--border)",

          borderRadius:
            14,

          boxShadow:
            "0 12px 35px rgba(15, 23, 42, 0.15)",
        }}
      >
        {loadingSearch ? (
  <div
    className="muted"
    style={{
      padding:
        14,

      fontSize:
        13,
    }}
  >
    Buscando...
  </div>
) : globalSearchResults.length ===
  0 ? (
          <div
            className="muted"
            style={{
              padding:
                14,

              fontSize:
                13,
            }}
          >
            No hay citas que coincidan en esta semana.
          </div>
        ) : (
            globalSearchResults.map(
            (
              result
            ) => {
              const date =
                new Date(
                  result.startAt
                );

              return (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() =>
                    goToSearchResult(
                      result
                    )
                  }
                  style={{
                    width:
                      "100%",

                    padding:
                      "12px 14px",

                    display:
                      "block",

                    textAlign:
                      "left",

                    border:
                      "none",

                    borderBottom:
                      "1px solid var(--border)",

                    background:
                      "#ffffff",

                    cursor:
                      "pointer",

                    color:
                      "inherit",

                    font:
                      "inherit",
                  }}
                >
                  <strong>
                    {
                      result.title
                    }
                  </strong>

                  <div
                    className="muted"
                    style={{
                      marginTop:
                        3,

                      fontSize:
                        12,
                    }}
                  >
                    {
                      result.subtitle
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        5,

                      fontSize:
                        12,
                    }}
                  >
                    {date.toLocaleDateString(
                      "es-ES",
                      {
                        weekday:
                          "short",

                        day:
                          "numeric",

                        month:
                          "short",
                      }
                    )}
                    {" · "}
                    {date.toLocaleTimeString(
                      "es-ES",
                      {
                        hour:
                          "2-digit",

                        minute:
                          "2-digit",
                      }
                    )}
                  </div>
                </button>
              );
            }
          )
        )}
      </div>
    )}
</div>

      {/* ======================================================
          SELECTOR MÓVIL DE DÍA
          ====================================================== */}

      {isMobile && (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(7, minmax(64px, 1fr))",

            gap:
              6,

            overflowX:
              "auto",

            marginBottom:
              16,

            paddingBottom:
              4,
          }}
        >
          {weekDays.map(
            (
              day,
              index
            ) => {
              const selected =
                index ===
                selectedMobileDay;

              const today =
                sameLocalDay(
                  day,
                  new Date()
                );

              return (
                <button
                  key={
                    day.toISOString()
                  }
                  type="button"
                  onClick={() =>
                    setSelectedMobileDay(
                      index
                    )
                  }
                  style={{
                    minWidth:
                      64,

                    padding:
                      "9px 5px",

                    borderRadius:
                      12,

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
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,

                      fontWeight:
                        700,

                      textTransform:
                        "capitalize",
                    }}
                  >
                    {day.toLocaleDateString(
                      "es-ES",
                      {
                        weekday:
                          "short",
                      }
                    )}
                  </div>

                  <div
                    style={{
                      marginTop:
                        3,

                      fontSize:
                        13,

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
                          2,

                        fontSize:
                          8,
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

      {/* ======================================================
          LEYENDA
          ====================================================== */}

      <div
        style={{
          display:
            "flex",

          gap:
            14,

          flexWrap:
            "wrap",

          marginBottom:
            16,

          fontSize:
            13,
        }}
      >
        <span>
          🟢 Disponible
        </span>

        <span>
          🟣 Reserva Slottye
        </span>

        <span>
          🔵 Reserva manual
        </span>

        <span>
          🔴 Bloqueado
        </span>

        <span>
          ⚪ Fuera de horario
        </span>
      </div>

      {/* ======================================================
          AGENDA
          ====================================================== */}

      <div
        ref={
          agendaScrollRef
        }
        style={{
          height:
            AGENDA_HEIGHT,

          overflow:
            "auto",

          border:
            "1px solid var(--border)",

          borderRadius:
            16,

          position:
            "relative",

          overscrollBehavior:
            "contain",

          opacity:
            loadingWeek
              ? 0.7
              : 1,

          transition:
            "opacity 0.15s ease",
        }}
      >
        <div
          style={{
            minWidth:
              isMobile
                ? 0
                : 1050,
          }}
        >
          {/* ==================================================
              CABECERA
              ================================================== */}

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns,

              borderBottom:
                "1px solid var(--border)",

              position:
                "sticky",

              top:
                0,

              zIndex:
                30,

              background:
                "#ffffff",
            }}
          >
            <div
              style={{
                padding:
                  12,

                position:
                  "sticky",

                left:
                  0,

                zIndex:
                  40,

                background:
                  "#ffffff",

                borderRight:
                  "1px solid var(--border)",
              }}
            />

            {visibleDays.map(
              ({
                day,
              }) => (
                <div
                  key={
                    day.toISOString()
                  }
                  style={{
                    padding:
                      "12px 8px",

                    textAlign:
                      "center",

                    borderLeft:
                      "1px solid var(--border)",

                    background:
                      sameLocalDay(
                        day,
                        new Date()
                      )
                        ? "#f8fafc"
                        : "#ffffff",
                  }}
                >
                  <strong
                    style={{
                      textTransform:
                        "capitalize",
                    }}
                  >
                    {day.toLocaleDateString(
                      "es-ES",
                      {
                        weekday:
                          "long",
                      }
                    )}
                  </strong>

                  <div
                    className="muted"
                    style={{
                      marginTop:
                        3,
                    }}
                  >
                    {day.toLocaleDateString(
                      "es-ES",
                      {
                        day:
                          "numeric",

                        month:
                          "short",
                      }
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* ==================================================
              FILAS
              ================================================== */}

          {timeRows.map(
            (
              minute
            ) => (
              <div
                key={
                  minute
                }
                style={{
                  display:
                    "grid",

                  gridTemplateColumns,

                  height:
                    ROW_HEIGHT,

                  minHeight:
                    ROW_HEIGHT,
                }}
              >
                {/* HORA */}

                <div
                  style={{
                    padding:
                      "10px 8px",

                    fontSize:
                      13,

                    fontWeight:
                      700,

                    textAlign:
                      "right",

                    position:
                      "sticky",

                    left:
                      0,

                    zIndex:
                      20,

                    background:
                      "#ffffff",

                    borderRight:
                      "1px solid var(--border)",

                    borderBottom:
                      "1px solid var(--border)",
                  }}
                >
                  {formatTime(
                    minute
                  )}
                </div>

                {/* DÍAS VISIBLES */}

                {visibleDays.map(
                  ({
                    day,
                    dayIndex,
                  }) => {
                    const open =
                      isOpenAt(
                        dayIndex,
                        minute
                      );

                    const event =
                      getCellData(
                        day,
                        minute
                      );

                      /*
 * ==========================================
 * HORA ACTUAL
 * ==========================================
 */

const currentMinutes =
currentTime.getHours() *
  60 +
currentTime.getMinutes();

const isCurrentTimeCell =
sameLocalDay(
  day,
  currentTime
) &&
currentMinutes >=
  minute &&
currentMinutes <
  minute +
    SLOT_MINUTES;

const currentTimePosition =
isCurrentTimeCell
  ? (
      (
        currentMinutes -
        minute
      ) /
      SLOT_MINUTES
    ) *
    100
  : 0;

                    const cellStart =
                      new Date(
                        day
                      );

                    cellStart.setHours(
                      Math.floor(
                        minute /
                          60
                      ),
                      minute %
                        60,
                      0,
                      0
                    );

                    const cellEnd =
                      new Date(
                        cellStart.getTime() +
                          SLOT_MINUTES *
                            60 *
                            1000
                      );

                    const isEventStart =
                      event
                        ? new Date(
                            event.startAt
                          ).getTime() >=
                            cellStart.getTime() &&
                          new Date(
                            event.startAt
                          ).getTime() <
                            cellEnd.getTime()
                        : false;

                    const isEventEnd =
                      event
                        ? new Date(
                            event.endAt
                          ).getTime() >
                            cellStart.getTime() &&
                          new Date(
                            event.endAt
                          ).getTime() <=
                            cellEnd.getTime()
                        : false;

                    let background:
                      string;

                    if (
                      event?.type ===
                      "booking"
                    ) {
                      background =
                        "#f3e8ff";
                    } else if (
                      event?.type ===
                      "manual"
                    ) {
                      background =
                        "#eff6ff";
                    } else if (
                      event?.type ===
                      "block"
                    ) {
                      background =
                        "#fef2f2";
                    } else if (
                      event?.type ===
                      "slot"
                    ) {
                      background =
                        "#f0fdf4";
                    } else if (
                      !open
                    ) {
                      background =
                        "#f8fafc";
                    } else {
                      background =
                        "#ffffff";
                    }

                    let eventBorderColor =
                      "transparent";

                    if (
                      event?.type ===
                      "slot"
                    ) {
                      eventBorderColor =
                        "#bbf7d0";
                    } else if (
                      event?.type ===
                      "booking"
                    ) {
                      eventBorderColor =
                        "#e9d5ff";
                    } else if (
                      event?.type ===
                      "manual"
                    ) {
                      eventBorderColor =
                        "#bfdbfe";
                    } else if (
                      event?.type ===
                      "block"
                    ) {
                      eventBorderColor =
                        "#fecaca";
                    }

                    return (
                      <div
                        key={`${day.toISOString()}-${minute}`}
                        style={{
                            
                          height:
                            ROW_HEIGHT,

                          minHeight:
                            ROW_HEIGHT,

                            position:
                              "relative",

                          paddingTop:
                            event &&
                            !isEventStart
                              ? 0
                              : 6,

                          paddingBottom:
                            event &&
                            !isEventEnd
                              ? 0
                              : 6,

                          paddingLeft:
                            6,

                          paddingRight:
                            6,

                          borderLeft:
                            "1px solid var(--border)",

                          borderBottom:
                            event &&
                            !isEventEnd
                              ? `1px solid ${background}`
                              : "1px solid var(--border)",

                          background,
                        }}
                      >
                        

                        {event ? (
  <button
    type="button"
    onClick={() =>
      openExistingEvent(
        event
      )
    }
    style={{
      width: "100%",
      height: "100%",

      borderLeft:
        `1px solid ${eventBorderColor}`,

      borderRight:
        `1px solid ${eventBorderColor}`,

      borderTop:
        isEventStart
          ? `1px solid ${eventBorderColor}`
          : "none",

      borderBottom:
        isEventEnd
          ? `1px solid ${eventBorderColor}`
          : "none",

      borderTopLeftRadius:
        isEventStart
          ? 10
          : 0,

      borderTopRightRadius:
        isEventStart
          ? 10
          : 0,

      borderBottomLeftRadius:
        isEventEnd
          ? 10
          : 0,

      borderBottomRightRadius:
        isEventEnd
          ? 10
          : 0,

      background,

      cursor:
        "pointer",

      textAlign:
        "left",

      padding:
        isEventStart
          ? "7px 8px"
          : "2px 8px",

      color:
        "inherit",

      font:
        "inherit",

      overflow:
        "hidden",
    }}
  >
    {isEventStart && (
      <>
        <strong
          style={{
            fontSize:
              12,
          }}
        >
          {event.title}
        </strong>

        {event.subtitle && (
          <div
            className="muted"
            style={{
              marginTop:
                3,

              fontSize:
                11,

              overflow:
                "hidden",

              textOverflow:
                "ellipsis",

              whiteSpace:
                "nowrap",
            }}
          >
            {event.subtitle}
          </div>
        )}

        <div
          style={{
            marginTop:
              3,

            fontSize:
              10,

            opacity:
              0.7,

            color:
              event.type ===
              "slot"
                ? "#166534"
                : undefined,
          }}
        >
          {event.type ===
          "slot"
            ? "Pulsar para gestionar"
            : "Pulsar para ver"}
        </div>
      </>
    )}
  </button>
) : (
  <button
    type="button"
    onClick={() =>
      openSlotModal(
        day,
        minute
      )
    }
    style={{
      width:
        "100%",

      height:
        "100%",

      minHeight:
        44,

      border:
        "1px dashed var(--border)",

      borderRadius:
        10,

      background:
        "transparent",

      cursor:
        "pointer",

      color:
        "var(--muted)",

      opacity:
        open
          ? 1
          : 0.65,

      fontSize:
        open
          ? 18
          : 10,

      padding:
        "2px 4px",
    }}
    title={
      open
        ? "Crear disponibilidad, reserva manual o bloqueo"
        : "Crear una excepción fuera del horario habitual"
    }
  >
    {open ? (
      "+"
    ) : (
      <>
        <span
          style={{
            fontSize:
              16,

            marginRight:
              4,
          }}
        >
          +
        </span>

        Fuera de horario
      </>
    )}
  </button>
)}

{/* ========================================
    LÍNEA DE HORA ACTUAL
    ======================================== */}

{isCurrentTimeCell && (
  <div
    style={{
      position:
        "absolute",

      left:
        0,

      right:
        0,

      top:
        `${currentTimePosition}%`,

      height:
        2,

      background:
        "#ef4444",

      zIndex:
        25,

      pointerEvents:
        "none",
    }}
  >
    <div
      style={{
        position:
          "absolute",

        left:
          -4,

        top:
          -3,

        width:
          8,

        height:
          8,

        borderRadius:
          "50%",

        background:
          "#ef4444",
      }}
    />
  </div>
)}
                  
                  </div>
                    );
                  }
                )}
              </div>
            )
          )}
        </div>
      </div>      

      {/* ======================================================
          MODAL CREAR
          ====================================================== */}

      {selectedDate && (
        <AgendaSlotModal
          businessId={
            businessId
          }
          date={
            selectedDate
          }
          services={
            services
          }
          onClose={
            closeSlotModal
          }
        />
      )}

      {/* ======================================================
          MODAL EVENTO
          ====================================================== */}

{selectedEvent?.type ===
  "manual" && (
  <AgendaEventModal
    type="manual"
    event={
      selectedEvent.event
    }
    services={
      services
    }
    onClose={
      closeEventModal
    }
  />
)}

{selectedEvent?.type ===
  "booking" && (
  <AgendaEventModal
    type="booking"
    event={
      selectedEvent.event
    }
    services={
      services
    }
    onClose={
      closeEventModal
    }
  />
)}

{selectedEvent?.type ===
  "block" && (
  <AgendaEventModal
    type="block"
    event={
      selectedEvent.event
    }
    services={
      services
    }
    onClose={
      closeEventModal
    }
  />
)}

{selectedEvent?.type ===
  "slot" && (
  <AgendaEventModal
    type="slot"
    event={
      selectedEvent.event
    }
    services={
      services
    }
    onClose={
      closeEventModal
    }
    onReserveManual={(
      date: Date
    ) => {
      setSelectedEvent(
        null
      );

      setSelectedDate(
        date
      );
    }}
  />
)}



    </div>
  );
}

const smallInputStyle = {
  width:
    "100%",

  padding:
    10,

  border:
    "1px solid var(--border)",

  borderRadius:
    10,

  marginBottom:
    12,

  background:
    "#ffffff",

  color:
    "var(--text)",

  font:
    "inherit",
};