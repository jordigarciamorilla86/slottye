"use client";

import AgendaSlotModal from "../AgendaSlotModal";
import AgendaEventModal from "../AgendaEventModal";
import AgendaRescheduleConfirmModal from "./AgendaRescheduleConfirmModal";

import type {
  AgendaBooking,
  AgendaSelectedEvent,
  AgendaService,
  AgendaSlot,
} from "../types/agenda";

type Props = {
  businessId: string;
  services: AgendaService[];
  selectedDate: Date | null;
  selectedEvent: AgendaSelectedEvent;
  reschedulingBooking: AgendaBooking | null;
  pendingRescheduleSlot: AgendaSlot | null;
  reschedulingLoading: boolean;
  reschedulingError: string;
  onCloseSlotModal: () => void;
  onCloseEventModal: () => void;
  onStartRescheduling: () => void;
  onReserveManual: (
    date: Date
  ) => void;
  onCloseRescheduleConfirmation: () => void;
  onConfirmRescheduling: () => void;
};

export default function AgendaModals({
  businessId,
  services,
  selectedDate,
  selectedEvent,
  reschedulingBooking,
  pendingRescheduleSlot,
  reschedulingLoading,
  reschedulingError,
  onCloseSlotModal,
  onCloseEventModal,
  onStartRescheduling,
  onReserveManual,
  onCloseRescheduleConfirmation,
  onConfirmRescheduling,
}: Props) {
  return (
    <>
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
            onCloseSlotModal
          }
        />
      )}

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
            onCloseEventModal
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
            onCloseEventModal
          }
          onRescheduleBooking={
            onStartRescheduling
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
            onCloseEventModal
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
            onCloseEventModal
          }
          onReserveManual={
            onReserveManual
          }
        />
      )}

      {reschedulingBooking &&
        pendingRescheduleSlot && (
          <AgendaRescheduleConfirmModal
            booking={
              reschedulingBooking
            }
            newSlot={
              pendingRescheduleSlot
            }
            loading={
              reschedulingLoading
            }
            error={
              reschedulingError
            }
            onClose={
              onCloseRescheduleConfirmation
            }
            onConfirm={
              onConfirmRescheduling
            }
          />
        )}
    </>
  );
}
