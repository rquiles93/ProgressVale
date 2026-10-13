import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABLLS-R — Evaluación",
  description: "Prototipo visual de evaluación ABLLS-R",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
