import Link from "next/link";
import { Header } from "@/components/Header";

type Props = {
  kicker: string;
  title: string;
  children: React.ReactNode;
};

export function LegalPage({
  kicker,
  title,
  children,
}: Props) {
  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth: 850,
        }}
      >
        <section className="panel">
          <div className="kicker">
            {kicker}
          </div>

          <h1 className="business-title">
            {title}
          </h1>

          <div
            style={{
              lineHeight: 1.7,
              marginTop: 24,
            }}
          >
            {children}
          </div>

          <div
            style={{
              borderTop:
                "1px solid var(--border)",
              marginTop: 32,
              paddingTop: 20,
            }}
          >
            <Link
              href="/"
              className="btn"
            >
              Volver a Slottye
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}