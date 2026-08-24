const items = [
  { className: "is-booking", label: "Reserva online" },
  { className: "is-completed", label: "Completada" },
  { className: "is-manual", label: "Cita manual" },
  { className: "is-blocked", label: "Bloqueo" },
  { className: "is-closed", label: "Fuera de horario" },
];

export default function AgendaLegend() {
  return (
    <div className="agendalegend11" aria-label="Leyenda de la agenda">
      <strong>Estados</strong>

      <div>
        {items.map((item) => (
          <span key={item.className}>
            <i className={item.className} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>

      <style jsx>{`
        .agendalegend11 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 9px 11px;
          border: 1px solid #ece9f0;
          border-radius: 12px;
          background: #fcfbfd;
        }
        .agendalegend11 > strong {
          padding-right: 11px;
          border-right: 1px solid #e7e3eb;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .055em;
        }
        .agendalegend11 > div { display: flex; align-items: center; gap: 7px 13px; flex-wrap: wrap; }
        .agendalegend11 span { display: inline-flex; align-items: center; gap: 6px; color: #575260; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .agendalegend11 i { width: 11px; height: 11px; display: block; flex: 0 0 11px; border: 1px solid; border-radius: 3px; }
        .is-booking { border-color: #7e22ce !important; background: #a855f7; }
        .is-completed { border-color: #9ca3af !important; background: #e5e7eb; }
        .is-manual { border-color: #2563eb !important; background: #3b82f6; }
        .is-blocked { border-color: #dc2626 !important; background: #ef4444; }
        .is-closed { border-color: #9ca3af !important; background: #fff; }
        @media (max-width: 650px) {
          .agendalegend11 { align-items: flex-start; flex-direction: column; gap: 8px; }
          .agendalegend11 > strong { padding-right: 0; border-right: 0; }
        }
      `}</style>
    </div>
  );
}
