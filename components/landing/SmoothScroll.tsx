"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;

    const configure = () => {
      lenis?.destroy();
      lenis = null;

      if (motionQuery.matches) return;

      lenis = new Lenis({
        autoRaf: true,
        anchors: true,
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
        stopInertiaOnNavigate: true,
      });
    };

    configure();
    motionQuery.addEventListener("change", configure);

    return () => {
      motionQuery.removeEventListener("change", configure);
      lenis?.destroy();
    };
  }, []);

  return null;
}
