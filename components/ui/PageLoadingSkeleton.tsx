import type { CSSProperties } from "react";

import styles from "./PageLoadingSkeleton.module.css";

type Variant = "dashboard" | "list" | "agenda" | "profile" | "home";

type Props = {
  variant?: Variant;
  width?: number;
};

const pulse = styles.pulse;

function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.copy}>
        <div className={`${pulse} ${styles.eyebrow}`} />
        <div className={`${pulse} ${styles.title}`} />
        <div className={`${pulse} ${styles.text}`} />
        <div className={`${pulse} ${styles.text} ${styles.textShort}`} />
      </div>
      <div className={`${pulse} ${styles.heroAction}`} />
    </div>
  );
}

function Toolbar() {
  return (
    <div className={styles.toolbar}>
      <div className={`${pulse} ${styles.tool} ${styles.toolWide}`} />
      <div className={`${pulse} ${styles.tool}`} />
      <div className={`${pulse} ${styles.tool}`} />
    </div>
  );
}

function Card({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`${styles.card} ${tall ? styles.cardTall : ""}`}>
      <div className={`${pulse} ${styles.icon}`} />
      <div className={`${pulse} ${styles.line} ${styles.lineStrong}`} />
      <div className={`${pulse} ${styles.line} ${styles.lineMedium}`} />
      <div className={`${pulse} ${styles.line} ${styles.lineShort}`} />
    </div>
  );
}

function Agenda() {
  return (
    <div className={styles.agenda}>
      {Array.from({ length: 6 }, (_, column) => (
        <div className={styles.agendaColumn} key={column}>
          <div className={`${pulse} ${styles.agendaHead}`} />
          {Array.from({ length: 7 }, (__, slot) =>
            column === 2 && slot === 2 ? (
              <div className={styles.agendaEvent} key={slot} />
            ) : (
              <div className={styles.agendaSlot} key={slot} />
            )
          )}
        </div>
      ))}
    </div>
  );
}

export function PageLoadingSkeleton({ variant = "dashboard", width = 1180 }: Props) {
  const columns = variant === "list" ? 2 : variant === "home" ? 3 : 4;

  return (
    <div aria-busy="true" aria-label="Cargando contenido">
      <div className={styles.header} aria-hidden="true">
        <div className={styles.headerInner}>
          <div className={`${pulse} ${styles.brand}`} />
          <div className={styles.headerActions}>
            <div className={`${pulse} ${styles.headerAction}`} />
            <div className={`${pulse} ${styles.headerAction}`} />
            <div className={`${pulse} ${styles.avatar}`} />
          </div>
        </div>
      </div>

      <main className={styles.page}>
        <div
          className={styles.shell}
          style={{
            "--loading-width": `${width}px`,
            "--loading-columns": columns,
          } as CSSProperties}
        >
          <Hero />
          {(variant === "list" || variant === "agenda" || variant === "home") && <Toolbar />}

          {variant === "agenda" ? (
            <Agenda />
          ) : variant === "profile" ? (
            <div className={styles.profile}>
              <Card tall />
              <Card tall />
            </div>
          ) : (
            <div className={styles.grid}>
              {Array.from({ length: variant === "list" ? 4 : 6 }, (_, index) => (
                <Card key={index} tall={variant === "home" && index > 2} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
