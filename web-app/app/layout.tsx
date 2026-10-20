import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProgressVale — Evaluation & Tracking",
  description: "Professional assessment and progress tracking",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
