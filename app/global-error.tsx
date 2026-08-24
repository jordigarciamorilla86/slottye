"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="status-modern-page status-modern-global">
          <section className="status-modern-card" aria-labelledby="global-error-title">
            <Link className="status-modern-brand" href="/" aria-label="Ir al inicio de Slottye">Slottye<span>.</span></Link>
            <div className="status-modern-icon status-modern-icon-error"><AlertTriangle aria-hidden="true" size={30} strokeWidth={2} /></div>
            <p className="status-modern-kicker">Error inesperado</p>
            <h1 id="global-error-title">Slottye no está disponible en este momento</h1>
            <p className="status-modern-description">Ha ocurrido un error inesperado. Puedes volver a intentarlo.</p>
            <div className="status-modern-actions">
              <button type="button" className="status-modern-primary" onClick={reset}><RotateCcw aria-hidden="true" size={18} />Intentar de nuevo</button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
