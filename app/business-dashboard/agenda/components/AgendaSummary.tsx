"use client";

import { Ban, CalendarCheck2, CalendarClock, CheckCheck, UserRoundPlus } from "lucide-react";

type DailySummary = { onlineBookings: number; completedCount: number; manualCount: number; availableCount: number; blockCount: number; };
type Props = { summaryDay: Date; currentTime: Date; isMobile: boolean; viewingCurrentWeek: boolean; dailySummary: DailySummary; };

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function AgendaSummary({ summaryDay, currentTime, isMobile, viewingCurrentWeek, dailySummary }: Props) {
  const items = [
    { icon: CalendarClock, value: dailySummary.availableCount, label: "Disponibles", tone: "green" },
    { icon: CalendarCheck2, value: dailySummary.onlineBookings, label: "Reservas Slottye", tone: "purple" },
    { icon: CheckCheck, value: dailySummary.completedCount, label: "Completadas", tone: "gray" },
    { icon: UserRoundPlus, value: dailySummary.manualCount, label: "Citas manuales", tone: "blue" },
    { icon: Ban, value: dailySummary.blockCount, label: "Bloqueos", tone: "red" },
  ];

  return (
    <section className="agendasummary11">
      <div className="agendasummary11-heading">
        <div>
          <span>Resumen del día</span>
          <strong>
            {sameLocalDay(summaryDay, currentTime) ? "Hoy · " : ""}
            {summaryDay.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </strong>
        </div>
        {!isMobile && <small>{viewingCurrentWeek ? "Actividad de hoy" : "Actividad del lunes seleccionado"}</small>}
      </div>

      <div className="agendasummary11-metrics">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`agendasummary11-metric is-${item.tone}`}>
              <span><Icon size={18} strokeWidth={2} /></span>
              <div><strong>{item.value}</strong><small>{item.label}</small></div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .agendasummary11 { display: grid; grid-template-columns: minmax(210px,.72fr) minmax(0,1.55fr); align-items: center; gap: 18px; margin-bottom: 12px; padding: 13px 14px; border: 1px solid #e8e5ec; border-radius: 14px; background: #fff; }
        .agendasummary11-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .agendasummary11-heading > div { display: grid; gap: 3px; }
        .agendasummary11-heading span { color: var(--accent-dark); font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: .055em; }
        .agendasummary11-heading strong { font-size: 15px; text-transform: capitalize; }
        .agendasummary11-heading > small { color: var(--muted); font-size: 12px; font-weight: 700; }
        .agendasummary11-metrics { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 7px; }
        .agendasummary11-metric { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 9px; border: 1px solid #ece9ef; border-radius: 11px; background: #fbfafc; }
        .agendasummary11-metric > span { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 34px; border-radius: 10px; }
        .agendasummary11-metric > div { min-width: 0; display: grid; gap: 1px; }
        .agendasummary11-metric strong { font-size: 17px; line-height: 1; }
        .agendasummary11-metric small { overflow: hidden; color: var(--muted); font-size: 11.5px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        .is-green > span { background: #e8f8ee; color: #17834a; }
        .is-purple > span { background: #f0eaff; color: #7149d8; }
        .is-gray > span { background: #eff0f2; color: #68707c; }
        .is-blue > span { background: #e8f2ff; color: #2871ca; }
        .is-red > span { background: #ffeded; color: #cf3e3e; }
        @media (max-width: 1050px) { .agendasummary11 { grid-template-columns: 1fr; } }
        @media (max-width: 720px) { .agendasummary11-metrics { grid-template-columns: repeat(2,minmax(0,1fr)); } .agendasummary11-metric:last-child { grid-column: 1 / -1; } }
      `}</style>
    </section>
  );
}
