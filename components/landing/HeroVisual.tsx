"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => null,
});

export default function HeroVisual() {
  return (
    <div className="tr-hero-visual" aria-label="Visualisasi tiga dimensi koridor transportasi">
      <div className="tr-hero-live-scene"><HeroScene /></div>
      <div className="tr-hero-edge-blur" aria-hidden="true" />
    </div>
  );
}
