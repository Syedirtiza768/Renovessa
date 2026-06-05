import type { Metadata } from "next";
import { Inter, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-landing",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Renovessa — Verified Home Improvement Appointments | DMV",
  description:
    "Submit your project and Renovessa will qualify it and schedule a confirmed appointment with one vetted DMV contractor — not five callbacks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSerif.variable} ${jetbrains.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
