export type AgendaService = {
  id: string;
  name: string;
  duration_minutes: number;
  active: boolean;
};

export type AgendaBusinessHour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  open_time_2: string | null;
  close_time_2: string | null;
  closed: boolean;
};

export type AgendaSlot = {
  id: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

export type AgendaProfile = {
  id: string;
  name: string | null;
  email: string | null;
};

export type AgendaServiceSummary = {
  id: string;
  name: string;
  duration_minutes: number;
};

export type AgendaBookingSlot = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
};

export type AgendaBooking = {
  id: string;
  slot_id: string;
  user_id: string | null;
  service_id: string | null;
  status: string;
  cancelled_at: string | null;
  profiles: AgendaProfile | null;
  services: AgendaServiceSummary | null;
  slots: AgendaBookingSlot | null;
};

export type AgendaBusinessBlock = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

export type AgendaManualBooking = {
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
  services: AgendaServiceSummary | null;
};

export type AgendaSelectedEvent =
  | {
      type: "manual";
      event: AgendaManualBooking;
    }
  | {
      type: "booking";
      event: AgendaBooking;
    }
  | {
      type: "block";
      event: AgendaBusinessBlock;
    }
  | {
      type: "slot";
      event: AgendaSlot;
    }
  | null;

export type AgendaCellEvent =
  | {
      type: "manual";
      id: string;
      title: string;
      subtitle: string;
      source: AgendaManualBooking;
      startAt: string;
      endAt: string;
    }
  | {
      type: "booking";
      id: string;
      title: string;
      subtitle: string;
      source: AgendaBooking;
      startAt: string;
      endAt: string;
    }
  | {
      type: "block";
      id: string;
      title: string;
      subtitle: string;
      source: AgendaBusinessBlock;
      startAt: string;
      endAt: string;
    }
  | {
      type: "slot";
      id: string;
      title: string;
      subtitle: string;
      source: AgendaSlot;
      startAt: string;
      endAt: string;
    };

export type GlobalAgendaSearchResult =
  | {
      type: "manual";
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      event: AgendaManualBooking;
    }
  | {
      type: "booking";
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      event: AgendaBooking;
    };

export type AgendaVisibleDay = {
  day: Date;
  dayIndex: number;
};

export type AgendaDraggedEvent =
  AgendaCellEvent;

export type AgendaPendingMove = {
  event: AgendaDraggedEvent;
  targetStartAt: string;
  targetEndAt: string;
};

