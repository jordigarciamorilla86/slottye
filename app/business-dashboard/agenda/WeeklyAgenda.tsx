"use client";

import AgendaHeader from "./components/AgendaHeader";
import AgendaSummary from "./components/AgendaSummary";
import AgendaSearch from "./components/AgendaSearch";
import AgendaRescheduleBanner from "./components/AgendaRescheduleBanner";
import AgendaMobileDaySelector from "./components/AgendaMobileDaySelector";
import AgendaLegend from "./components/AgendaLegend";
import AgendaGrid from "./components/AgendaGrid";
import AgendaModals from "./components/AgendaModals";
import AgendaMoveConfirmModal from "./components/AgendaMoveConfirmModal";

import useAgendaData from "./hooks/useAgendaData";
import useAgendaSearch from "./hooks/useAgendaSearch";
import useAgendaReschedule from "./hooks/useAgendaReschedule";
import useAgendaNavigation from "./hooks/useAgendaNavigation";
import useAgendaSummary from "./hooks/useAgendaSummary";
import useAgendaEvents from "./hooks/useAgendaEvents";
import useAgendaView from "./hooks/useAgendaView";
import useAgendaModals from "./hooks/useAgendaModals";
import useAgendaDragMove from "./hooks/useAgendaDragMove";

import type {
  AgendaBooking,
  AgendaBusinessBlock,
  AgendaBusinessHour,
  AgendaManualBooking,
  AgendaService,
  AgendaSlot,
  GlobalAgendaSearchResult,
} from "./types/agenda";

type Props = {
  businessId: string;
  businessName: string;
  initialWeekStart: string;

  mode?:
    | "business"
    | "admin";

  services: AgendaService[];

  businessHours: AgendaBusinessHour[];

  initialSlots: AgendaSlot[];

  initialBookings: AgendaBooking[];

  initialBlocks: AgendaBusinessBlock[];

  initialManualBookings: AgendaManualBooking[];
};

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function WeeklyAgenda({
  businessId,
  businessName,
  initialWeekStart,
  mode = "business",
  services,
  businessHours,
  initialSlots,
  initialBookings,
  initialBlocks,
  initialManualBookings,
}: Props) {
  /*
   * ============================================================
   * MODALES
   * ============================================================
   */

  const {
    selectedDate,
    selectedEvent,
    openAppointment,
    openSlotModal,
    selectEvent,
    clearModals,
    closeSlotModal,
    closeEventModal,
    reserveManualFromSlot,
  } =
    useAgendaModals();

  /*
   * ============================================================
   * NAVEGACIÓN
   * ============================================================
   */

  const {
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
  } =
    useAgendaNavigation({
      initialWeekStart,

      onOpenAppointment:
        openAppointment,
    });

  /*
   * ============================================================
   * VISTA, RESPONSIVE Y SCROLL
   * ============================================================
   */

  const {
    isMobile,
  
    mobileAgendaMode,
    setMobileAgendaMode,
  
    currentTime,
    agendaScrollRef,
    visibleDays,
    gridTemplateColumns,
    timeRows,
    goToAgendaDate,
  } =
    useAgendaView({
      weekStart,
      weekDays,
      selectedMobileDay,
      setSelectedMobileDay,
      setWeekStart,
    });

  /*
   * ============================================================
   * DATOS DE LA SEMANA
   * ============================================================
   */

  const {
    slots,
    bookings,
    blocks,
    manualBookings,
    loadingWeek,
    loadWeekData,
  } =
  useAgendaData({
    businessId,
    weekStart,
    mode,
    initialSlots,
      initialBookings,
      initialBlocks,
      initialManualBookings,
    });

  /*
   * ============================================================
   * MOVIMIENTO UNIVERSAL POR ARRASTRE
   * ============================================================
   */

  const {
    draggedEvent,
    pendingMove,
    moving,
    moveError,
    startDragging,
    finishDragging,
    dropAt,
    cancelPendingMove,
    confirmMove,
  } =
    useAgendaDragMove({
      businessId,

      reloadAgenda:
        async () => {
          await loadWeekData(
            weekStart
          );
        },
    });

  /*
   * ============================================================
   * REPROGRAMACIÓN DE RESERVAS
   * ============================================================
   */

  const {
    reschedulingBooking,
    pendingRescheduleSlot,
    reschedulingLoading,
    reschedulingError,
    startRescheduling,
    cancelRescheduling,
    chooseRescheduleTarget,
    closeRescheduleConfirmation,
    confirmRescheduling,
  } =
    useAgendaReschedule({
      reloadAgenda:
        async () => {
          await loadWeekData(
            weekStart
          );
        },

      prepareInterface:
        () => {
          clearModals();

          closeTransientPanels();
        },
    });

  /*
   * ============================================================
   * BUSCADOR GLOBAL
   * ============================================================
   */

  const {
    searchText,
    setSearchText,
    showSearchResults,
    setShowSearchResults,
    globalSearchResults,
    loadingSearch,
  } =
    useAgendaSearch({
      businessId,
    });

  /*
   * ============================================================
   * RESUMEN DEL DÍA
   * ============================================================
   */

  const {
    summaryDay,
    viewingCurrentWeek,
    dailySummary,
  } =
    useAgendaSummary({
      isMobile,
      selectedMobileDay,
      weekStart,
      weekDays,
      currentTime,
      bookings,
      manualBookings,
      slots,
      blocks,
    });

  /*
   * ============================================================
   * IR A RESULTADO DE BÚSQUEDA
   * ============================================================
   */

  function goToSearchResult(
  result:
    GlobalAgendaSearchResult
) {
    const date =
      new Date(
        result.startAt
      );

    goToAgendaDate(
      date
    );

    if (
      result.type ===
      "manual"
    ) {
      selectEvent({
        type:
          "manual",

        event:
          result.event,
      });
    } else {
      selectEvent({
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
   * EVENTOS Y HORARIO
   * ============================================================
   */

  const {
    isOpenAt,
    getCellData,
    openExistingEvent,
  } =
    useAgendaEvents({
      services,
      businessHours,
      slots,
      bookings,
      blocks,
      manualBookings,

      onSelectEvent:
        selectEvent,
    });

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
      <AgendaHeader
        weekTitle={weekTitle}
        businessName={businessName}
        loadingWeek={loadingWeek}
        rescheduling={Boolean(
          reschedulingBooking
        )}
        showNewAppointment={
          showNewAppointment
        }
        newAppointmentDate={
          newAppointmentDate
        }
        newAppointmentTime={
          newAppointmentTime
        }
        showDatePicker={
          showDatePicker
        }
        onPreviousWeek={
          goPreviousWeek
        }
        onToggleNewAppointment={
          toggleNewAppointment
        }
        onNewAppointmentDateChange={
          setNewAppointmentDate
        }
        onNewAppointmentTimeChange={
          setNewAppointmentTime
        }
        onOpenNewAppointment={
          openNewAppointment
        }
        onCloseNewAppointment={
          closeNewAppointment
        }
        onToggleDatePicker={
          toggleDatePicker
        }
        onGoToDate={goToDate}
        onToday={goToday}
        onNextWeek={goNextWeek}
      />

      {reschedulingBooking && (
        <AgendaRescheduleBanner
          customerName={
            reschedulingBooking.profiles
              ?.name ??
            "Cliente"
          }
          serviceName={
            reschedulingBooking.services
              ?.name ??
            "Servicio"
          }
          currentStartAt={
            reschedulingBooking.slots
              ?.start_at ??
            null
          }
          loading={
            reschedulingLoading
          }
          error={
            reschedulingError
          }
          onCancel={
            cancelRescheduling
          }
        />
      )}

<AgendaSearch<
  AgendaManualBooking,
  AgendaBooking
>
  searchText={
    searchText
  }
  showResults={
    showSearchResults
  }
  loading={
    loadingSearch
  }
  results={
    globalSearchResults
  }
  onSearchTextChange={(value) => {
    setSearchText(
      value
    );

    setShowSearchResults(
      true
    );
  }}
  onFocus={() => {
    setShowSearchResults(
      true
    );
  }}
  onCloseResults={() => {
    setShowSearchResults(
      false
    );
  }}
  onSelectResult={(result) => {
    goToSearchResult(
      result
    );
  }}
/>

{isMobile && (
  <AgendaMobileDaySelector
    weekDays={
      weekDays
    }
    selectedDayIndex={
      selectedMobileDay
    }
    currentTime={
      currentTime
    }
    mode={
      mobileAgendaMode
    }
    onModeChange={
      setMobileAgendaMode
    }
    onSelectDay={
      setSelectedMobileDay
    }
  />
)}

{!(
  isMobile &&
  mobileAgendaMode ===
    "week"
) && (
  <AgendaSummary
    summaryDay={
      summaryDay
    }
    currentTime={
      currentTime
    }
    isMobile={
      isMobile
    }
    viewingCurrentWeek={
      viewingCurrentWeek
    }
    dailySummary={
      dailySummary
    }
  />
)}

      <AgendaLegend />

      <AgendaGrid
        agendaScrollRef={
          agendaScrollRef
        }
        loadingWeek={
          loadingWeek
        }
        isMobile={
          isMobile
        }
        compactMobileWeek={
          isMobile &&
          mobileAgendaMode ===
            "week"
        }
        gridTemplateColumns={
          gridTemplateColumns
        }
        visibleDays={
          visibleDays
        }
        currentTime={
          currentTime
        }
        timeRows={
          timeRows
        }
        draggingEvent={
          draggedEvent
        }
        reschedulingBooking={
          reschedulingBooking
        }
        
        onChooseRescheduleTarget={
          chooseRescheduleTarget
        }
        isOpenAt={
          isOpenAt
        }
        getCellData={
          getCellData
        }
        openExistingEvent={
          openExistingEvent
        }
        openSlotModal={
          openSlotModal
        }
        startDragging={
          startDragging
        }
        finishDragging={
          finishDragging
        }
        dropAt={
          dropAt
        }
      />

      {pendingMove && (
        <AgendaMoveConfirmModal
          pendingMove={
            pendingMove
          }
          loading={
            moving
          }
          error={
            moveError
          }
          onClose={
            cancelPendingMove
          }
          onConfirm={
            confirmMove
          }
        />
      )}

      <AgendaModals
        businessId={
          businessId
        }
        services={
          services
        }
        selectedDate={
          selectedDate
        }
        selectedEvent={
          selectedEvent
        }
        reschedulingBooking={
          reschedulingBooking
        }
        pendingRescheduleSlot={
          pendingRescheduleSlot
        }
        reschedulingLoading={
          reschedulingLoading
        }
        reschedulingError={
          reschedulingError
        }
        onCloseSlotModal={() =>
          closeSlotModal(
            async () => {
              await loadWeekData(
                weekStart
              );
            }
          )
        }
        onCloseEventModal={() =>
          closeEventModal(
            async () => {
              await loadWeekData(
                weekStart
              );
            }
          )
        }
        onStartRescheduling={() => {
          if (
            selectedEvent?.type ===
            "booking"
          ) {
            startRescheduling(
              selectedEvent.event
            );
          }
        }}
        onReserveManual={
          reserveManualFromSlot
        }
        onCloseRescheduleConfirmation={
          closeRescheduleConfirmation
        }
        onConfirmRescheduling={
          confirmRescheduling
        }
      />
    </div>
  );
}