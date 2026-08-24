"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

type Props = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => { console.error("Error de aplicación:", error); }, [error]);
  return (
    <main className="status-modern-page">
      <section className="status-modern-card" aria-labelledby="error-page-title">
        <div className="status-modern-icon status-modern-icon-error"><AlertTriangle aria-hidden="true" size={30} strokeWidth={2} /></div>
        <p className="status-modern-kicker">Algo ha fallado</p>
        <h1 id="error-page-title">No hemos podido cargar esta página</h1>
        <p className="status-modern-description">Puedes intentarlo de nuevo o volver al inicio.</p>
        <div className="status-modern-actions">
          <button type="button" className="status-modern-primary" onClick={reset}><RotateCcw aria-hidden="true" size={18} />Intentar de nuevo</button>
          <Link href="/" className="status-modern-secondary"><ArrowLeft aria-hidden="true" size={18} />Volver al inicio</Link>
        </div>
        {error.digest && <p className="status-modern-reference">Referencia: {error.digest}</p>}
      </section>
    </main>
  );
}
