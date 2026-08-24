import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="status-modern-page">
        <section className="status-modern-card" aria-labelledby="not-found-title">
          <div className="status-modern-icon"><SearchX aria-hidden="true" size={30} strokeWidth={2} /></div>
          <p className="status-modern-kicker">Error 404</p>
          <h1 id="not-found-title">No hemos encontrado esta página</h1>
          <p className="status-modern-description">Puede que el enlace ya no exista o que la dirección no sea correcta.</p>
          <div className="status-modern-actions">
            <Link href="/" className="status-modern-primary"><ArrowLeft aria-hidden="true" size={18} />Volver a Slottye</Link>
            <Link href="/category/todos" className="status-modern-secondary">Ver negocios</Link>
          </div>
        </section>
      </main>
    </>
  );
}
