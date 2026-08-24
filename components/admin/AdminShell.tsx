import type { CSSProperties, ReactNode } from "react";
import styles from "./AdminShell.module.css";

export function AdminShell({ children, maxWidth = 1180 }: { children: ReactNode; maxWidth?: number }) {
  return <main className={styles.page}><div className={styles.shell} style={{ "--admin-width": `${maxWidth}px` } as CSSProperties}>{children}</div></main>;
}
export function AdminPageHeader({ title, description, eyebrow = "Slottye Admin", children, compact = false }: { title: string; description: ReactNode; eyebrow?: string; children?: ReactNode; compact?: boolean }) {
  return <header className={`${styles.header} ${compact ? styles.headerCompact : ""}`}><div className={styles.headerCopy}><p className={styles.eyebrow}>{eyebrow}</p><h1 className={styles.title}>{title}</h1><div className={styles.description}>{description}</div></div>{children ? <div className={styles.headerActions}>{children}</div> : null}</header>;
}
export function AdminContent({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`${styles.content} ${className}`}>{children}</div>; }
export function AdminFilterBar({ children }: { children: ReactNode }) { return <div className={styles.filter}>{children}</div>; }
export function AdminSubnav({ children }: { children: ReactNode }) { return <nav className={styles.subnav} aria-label="Navegación del negocio">{children}</nav>; }
export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) { return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>; }
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className={styles.empty}><strong>{title}</strong>{children}</div>; }
