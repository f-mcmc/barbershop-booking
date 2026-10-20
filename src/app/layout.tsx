import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ustara Barbershop — onlayn yozilish",
  description: "Usta, xizmat va vaqtni tanlang — 1 daqiqada yoziling. Toshkent, Chilonzor.",
};

export const viewport: Viewport = { themeColor: "#14213d" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
