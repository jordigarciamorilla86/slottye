import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
  ),

  title: {
    default:
      "Slottye — Encuentra y reserva tu próxima cita",
    template: "%s | Slottye",
  },

  description:
    "Encuentra negocios cerca de ti, consulta sus citas disponibles y reserva online de forma rápida y sencilla con Slottye.",

  applicationName: "Slottye",

  keywords: [
    "Slottye",
    "reservar cita",
    "citas online",
    "reservas online",
    "negocios cerca de mí",
    "peluquerías",
    "dentistas",
    "fisioterapia",
    "psicología",
    "estética",
    "servicios profesionales",
  ],

  authors: [
    {
      name: "Slottye",
    },
  ],

  creator: "Slottye",
  publisher: "Slottye",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Slottye",

    title:
      "Slottye — Encuentra y reserva tu próxima cita",

    description:
      "Encuentra negocios cerca de ti y reserva citas disponibles online en segundos.",

    url: "/",
  },

  twitter: {
    card: "summary_large_image",

    title:
      "Slottye — Encuentra y reserva tu próxima cita",

    description:
      "Encuentra negocios cerca de ti y reserva citas disponibles online en segundos.",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}

        <Analytics />
      </body>
    </html>
  );
}