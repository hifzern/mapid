import type { Metadata } from "next";
import localFont from "next/font/local";
import "lenis/dist/lenis.css";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../public/fonts/barlow-condensed-600-latin.woff2", weight: "600" },
    { path: "../public/fonts/barlow-condensed-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-barlow",
  display: "swap",
});
const body = localFont({
  src: [{ path: "../public/fonts/source-sans-3-400-latin.woff2", weight: "400" }],
  variable: "--font-source",
  display: "swap",
});
const metric = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-mono-500-latin.woff2", weight: "500" },
    { path: "../public/fonts/ibm-plex-mono-600-latin.woff2", weight: "600" },
    { path: "../public/fonts/ibm-plex-mono-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-ibm-mono",
  display: "swap",
});
const landingBody = localFont({
  src: [
    { path: "../public/fonts/inter-400-latin.woff2", weight: "400" },
    { path: "../public/fonts/inter-500-latin.woff2", weight: "500" },
    { path: "../public/fonts/inter-600-latin.woff2", weight: "600" },
    { path: "../public/fonts/inter-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-inter",
  display: "swap",
});
const landingHeading = localFont({
  src: [
    { path: "../public/fonts/dm-sans-400-latin.woff2", weight: "400" },
    { path: "../public/fonts/dm-sans-500-latin.woff2", weight: "500" },
    { path: "../public/fonts/dm-sans-600-latin.woff2", weight: "600" },
    { path: "../public/fonts/dm-sans-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});
const landingMono = localFont({
  src: [
    { path: "../public/fonts/roboto-mono-400-latin.woff2", weight: "400" },
    { path: "../public/fonts/roboto-mono-500-latin.woff2", weight: "500" },
    { path: "../public/fonts/roboto-mono-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Transight — Analisis Transit Kabupaten Kulon Progo",
  description: "Evaluasi koridor Kabupaten Kulon Progo dengan analisis spasial transparan dan data ilustratif.",
  icons: { icon: "/dashboard/logo-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body className={`${display.variable} ${body.variable} ${metric.variable} ${landingBody.variable} ${landingHeading.variable} ${landingMono.variable}`}>{children}</body>
    </html>
  );
}
