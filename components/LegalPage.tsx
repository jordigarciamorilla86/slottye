import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";

type Props = { kicker: string; title: string; children: React.ReactNode };

export function LegalPage({ kicker, title, children }: Props) {
  return (
    <>
      <Header />
      <main className="legal-modern-page">
        <article className="legal-modern-card" aria-labelledby="legal-page-title">
          <header className="legal-modern-header">
            <p className="legal-modern-kicker">{kicker}</p>
            <h1 id="legal-page-title">{title}</h1>
          </header>
          <div className="legal-modern-content">{children}</div>
          <footer className="legal-modern-footer">
            <Link href="/" className="legal-modern-back">
              <ArrowLeft aria-hidden="true" size={18} />
              Volver a Slottye
            </Link>
          </footer>
        </article>
      </main>
    </>
  );
}
