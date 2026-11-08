import type { Metadata, Viewport } from "next";
import { RESORT } from "@/lib/resort";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${RESORT.name} · Coffee-estate resort in ${RESORT.place}`, template: `%s · ${RESORT.name}` },
  description: "Rooms and villas on a working coffee estate in Chikkamagaluru. Book direct for the best rate.",
};

export const viewport: Viewport = { themeColor: "#2f4a36", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
