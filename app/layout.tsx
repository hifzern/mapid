import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans, IBM_Plex_Mono, Inter, Roboto_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], variable: "--font-barlow", weight: ["600", "700"] });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-source" });
const metric = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-ibm-mono", weight: ["500", "600", "700"] });
const landingBody = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"] });
const landingHeading = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const landingMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono", weight: ["400", "500", "700"] });

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
