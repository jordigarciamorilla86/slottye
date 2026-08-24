"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CirclePlus, Clock3, LocateFixed, X } from "lucide-react";

type Props = {
  weekTitle: string; businessName: string; loadingWeek: boolean; rescheduling: boolean;
  showNewAppointment: boolean; newAppointmentDate: string; newAppointmentTime: string; showDatePicker: boolean;
  onPreviousWeek: () => void; onToggleNewAppointment: () => void;
  onNewAppointmentDateChange: (value: string) => void; onNewAppointmentTimeChange: (value: string) => void;
  onOpenNewAppointment: () => void; onCloseNewAppointment: () => void; onToggleDatePicker: () => void;
  onGoToDate: (value: string) => void; onToday: () => void; onNextWeek: () => void;
};

export default function AgendaHeader(props: Props) {
  const {
    weekTitle, businessName, loadingWeek, rescheduling, showNewAppointment, newAppointmentDate,
    newAppointmentTime, showDatePicker, onPreviousWeek, onToggleNewAppointment,
    onNewAppointmentDateChange, onNewAppointmentTimeChange, onOpenNewAppointment,
    onCloseNewAppointment, onToggleDatePicker, onGoToDate, onToday, onNextWeek,
  } = props;

  const newAppointmentRef = useRef<HTMLDivElement | null>(null);
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (showNewAppointment && newAppointmentRef.current && !newAppointmentRef.current.contains(event.target)) onCloseNewAppointment();
      if (showDatePicker && datePickerRef.current && !datePickerRef.current.contains(event.target)) onToggleDatePicker();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (showNewAppointment) onCloseNewAppointment();
      if (showDatePicker) onToggleDatePicker();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNewAppointment, showDatePicker, onCloseNewAppointment, onToggleDatePicker]);

  function toggleNewAppointment() {
    if (showDatePicker) onToggleDatePicker();
    onToggleNewAppointment();
  }

  function toggleDatePicker() {
    if (showNewAppointment) onCloseNewAppointment();
    onToggleDatePicker();
  }

  return (
    <header className="agendahead11">
      <div className="agendahead11-period">
        <div className="agendahead11-navigation">
          <button type="button" className="agendahead11-icon-btn" disabled={loadingWeek} onClick={onPreviousWeek} aria-label="Semana anterior"><ChevronLeft size={19} /></button>
          <button type="button" className="agendahead11-today" disabled={loadingWeek} onClick={onToday}>Hoy</button>
          <button type="button" className="agendahead11-icon-btn" disabled={loadingWeek} onClick={onNextWeek} aria-label="Semana siguiente"><ChevronRight size={19} /></button>
        </div>

        <div className="agendahead11-title">
          <span>Semana seleccionada</span>
          <strong>{weekTitle}</strong>
          <small>{loadingWeek ? "Actualizando agenda…" : businessName}</small>
        </div>
      </div>

      <div className="agendahead11-actions">
        <div ref={datePickerRef} className="agendahead11-popover-wrap">
          <button type="button" className="btn agendahead11-action" disabled={loadingWeek} onClick={toggleDatePicker} aria-expanded={showDatePicker}>
            <CalendarDays size={16} /> Ir a fecha
          </button>
          {showDatePicker && (
            <div className="agendahead11-popover is-date" role="dialog" aria-label="Ir a una fecha">
              <div className="agendahead11-popover-head">
                <div><span>Navegación</span><strong>Ir a una fecha</strong></div>
                <button type="button" onClick={onToggleDatePicker} aria-label="Cerrar"><X size={17} /></button>
              </div>
              <label><span>Selecciona un día</span><input type="date" autoFocus onChange={(event) => onGoToDate(event.target.value)} /></label>
              <p>Mostraremos automáticamente la semana que contiene ese día.</p>
            </div>
          )}
        </div>

        <div ref={newAppointmentRef} className="agendahead11-popover-wrap">
          <button type="button" className="btn primary agendahead11-action" disabled={loadingWeek || rescheduling} onClick={toggleNewAppointment} aria-expanded={showNewAppointment}>
            <CirclePlus size={17} /> Nueva cita
          </button>
          {showNewAppointment && (
            <div className="agendahead11-popover" role="dialog" aria-label="Nueva cita">
              <div className="agendahead11-popover-head">
                <div><span>Agenda</span><strong>Nueva cita</strong></div>
                <button type="button" onClick={onCloseNewAppointment} aria-label="Cerrar"><X size={17} /></button>
              </div>
              <div className="agendahead11-fields">
                <label><span><CalendarDays size={14} /> Fecha</span><input type="date" value={newAppointmentDate} onChange={(event) => onNewAppointmentDateChange(event.target.value)} /></label>
                <label><span><Clock3 size={14} /> Hora</span><input type="time" step={1800} value={newAppointmentTime} onChange={(event) => onNewAppointmentTimeChange(event.target.value)} /></label>
              </div>
              <button type="button" className="btn primary agendahead11-continue" onClick={onOpenNewAppointment}>Continuar <ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      {rescheduling && <div className="agendahead11-mode"><LocateFixed size={15} /> Selecciona el nuevo día y hora para la reserva</div>}

      <style jsx>{`
        .agendahead11 { position: relative; z-index: 1200; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 17px; padding: 14px 15px; border: 1px solid #e8e5ee; border-radius: 15px; background: #fcfbfd; }
        .agendahead11-period { display: flex; align-items: center; gap: 15px; min-width: 0; }
        .agendahead11-navigation { display: flex; align-items: center; gap: 4px; padding: 3px; border: 1px solid #e2dee9; border-radius: 11px; background: #fff; }
        .agendahead11-icon-btn, .agendahead11-today { min-height: 34px; border: 0; border-radius: 8px; background: transparent; color: var(--text); font: inherit; font-weight: 800; cursor: pointer; }
        .agendahead11-icon-btn { width: 34px; display: grid; place-items: center; padding: 0; }
        .agendahead11-today { padding: 0 10px; font-size: 11.5px; }
        .agendahead11-icon-btn:hover, .agendahead11-today:hover { background: #f1eef9; color: var(--accent-dark); }
        button:disabled { opacity: .5; cursor: not-allowed; }
        .agendahead11-title { min-width: 0; display: grid; gap: 1px; }
        .agendahead11-title span { color: var(--muted); font-size: 9.5px; font-weight: 850; text-transform: uppercase; letter-spacing: .055em; }
        .agendahead11-title strong { overflow: hidden; font-size: 16px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
        .agendahead11-title small { color: var(--muted); font-size: 10.5px; }
        .agendahead11-actions { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
        .agendahead11-action { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 39px; }
        .agendahead11-popover-wrap { position: relative; }
        .agendahead11-popover { position: absolute; top: calc(100% + 9px); right: 0; z-index: 1230; width: 320px; max-width: calc(100vw - 32px); padding: 17px; border: 1px solid #ded9e8; border-radius: 16px; background: #fff; box-shadow: 0 18px 48px rgba(31,27,48,.16); }
        .agendahead11-popover.is-date { width: 275px; }
        .agendahead11-popover-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .agendahead11-popover-head div { display: grid; gap: 2px; }
        .agendahead11-popover-head span { color: var(--accent-dark); font-size: 10px; font-weight: 850; }
        .agendahead11-popover-head strong { font-size: 16px; }
        .agendahead11-popover-head button { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 8px; background: #f5f3f8; color: var(--muted); cursor: pointer; }
        .agendahead11-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .agendahead11-popover label > span { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; color: var(--muted); font-size: 10.5px; font-weight: 800; }
        .agendahead11-popover input { width: 100%; min-height: 41px; box-sizing: border-box; padding: 0 10px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); font: inherit; font-size: 12px; outline: none; }
        .agendahead11-popover input:focus { border-color: #a99bf4; box-shadow: 0 0 0 3px rgba(112,87,245,.1); }
        .agendahead11-popover p { margin: 9px 0 0; color: var(--muted); font-size: 10.5px; line-height: 1.45; }
        .agendahead11-continue { width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 12px; }
        .agendahead11-mode { position: absolute; top: calc(100% + 7px); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #fff4df; color: #8a5700; font-size: 10.5px; font-weight: 800; box-shadow: 0 5px 14px rgba(80,50,0,.08); }
        @media (max-width: 780px) {
          .agendahead11 { align-items: stretch; flex-direction: column; gap: 12px; padding: 13px; }
          .agendahead11-period { align-items: stretch; flex-direction: column-reverse; gap: 10px; }
          .agendahead11-title { text-align: center; }
          .agendahead11-navigation { display: grid; grid-template-columns: 40px 1fr 40px; }
          .agendahead11-icon-btn { width: 100%; }
          .agendahead11-actions { display: grid; grid-template-columns: 1fr 1fr; }
          .agendahead11-action, .agendahead11-popover-wrap { width: 100%; }
          .agendahead11-popover { right: auto; left: 0; }
          .agendahead11-popover-wrap:last-child .agendahead11-popover { right: 0; left: auto; }
          .agendahead11-mode { position: static; justify-content: center; transform: none; text-align: center; }
        }
        @media (max-width: 470px) {
          .agendahead11-actions { grid-template-columns: 1fr; }
          .agendahead11-popover, .agendahead11-popover.is-date { position: fixed; top: 50%; right: auto; left: 50%; width: calc(100vw - 28px); transform: translate(-50%,-50%); }
        }
      `}</style>
    </header>
  );
}
