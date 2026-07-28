import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slotty — Encuentra tu próxima cita",
  description: "Encuentra negocios cerca de ti y reserva citas disponibles al instante.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
