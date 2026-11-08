import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { RESORT } from "@/lib/resort";
import "./globals.css";

const bricolage = localFont({
  src: "./fonts/Bricolage-display.woff2",
  variable: "--font-bricolage",
  weight: "400 700",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const albert = localFont({
  src: "./fonts/Albert-text.woff2",
  variable: "--font-albert",
  weight: "400 700",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: `${RESORT.name}, coffee-estate rooms and villas in ${RESORT.place}`, template: `%s | ${RESORT.name}` },
  description: "Rooms and villas on a coffee estate in Chikkamagaluru. Book direct for the best available rate.",
};

export const viewport: Viewport = { themeColor: "#1f3d2b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${albert.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
