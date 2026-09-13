"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    stepNumber: "01",
    side: "left",
    gif: "/landing/step-1.gif",
    alt: "Mengaktifkan layer analisis spasial di workspace",
    title: "Eksplorasi Layer Wilayah",
    description: "Aktifkan data spasial kepadatan penduduk BPS, batas administrasi kecamatan, jaringan rute eksisting, dan sebaran fasilitas publik untuk memahami konteks wilayah Kulon Progo.",
  },
  {
    stepNumber: "02",
    side: "right",
    gif: "/landing/step-2.gif",
    alt: "Menggambar rute dan mencocokkannya ke jaringan jalan",
    title: "Gambar & Sesuaikan Rute",
    description: "Tarik koridor baru di peta interaktif, sesuaikan titik belok rute, atau gunakan fitur ikuti jalan (road snap) berbasis jaringan jalan OSRM secara otomatis.",
  },
  {
    stepNumber: "03",
    side: "left",
    gif: "/landing/step-3.gif",
    alt: "Menghitung skor aksesibilitas dan membaca hasil evaluasi",
    title: "Evaluasi Metrik & AI Insight",
    description: "Dapatkan skor komposit instan (0–100), estimasi populasi terjangkau (buffer 500m / isochrone), deteksi konflik rute, dan narasi analisis perencanaan terverifikasi AI.",
  },
  {
    stepNumber: "04",
    side: "right",
    gif: "/landing/step-4.gif",
    alt: "Membandingkan baseline dengan rute rekomendasi",
    title: "Bandingkan Alternatif Skenario",
    description: "Bandingkan performa Skenario A vs Skenario B secara berdampingan dengan perbandingan metrik delta untuk memilih rute paling efektif sebelum diajukan ke publik.",
  },
] as const;

export default function RouteJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const routeRef = useRef<SVGSVGElement>(null);
  const [progress, setProgress] = useState(0);
  const [routeWidth, setRouteWidth] = useState(719);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const route = routeRef.current;
    if (!route) return;

    const updateWidth = () => setRouteWidth(Math.max(1, route.clientWidth));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(route);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = requestAnimationFrame(update);

    function update() {
      frame = 0;
      const section = sectionRef.current;
      const route = routeRef.current;
      if (!section || !route) return;

      const sectionRect = section.getBoundingClientRect();
      const routeRect = route.getBoundingClientRect();
      const playhead = window.innerHeight * 0.58;

      // Fast Refresh can preserve the previous SVG coordinate width while the
      // responsive element has already resized. Reconcile it during scrolling
      // as well as through ResizeObserver so an open tab cannot get stuck with
      // a shortened dash path.
      const measuredWidth = Math.max(1, routeRect.width);
      setRouteWidth((current) => Math.abs(current - measuredWidth) > 0.5 ? measuredWidth : current);

      // Follow the visible route rather than the full section. The active
      // stroke begins when the route's start reaches the viewport playhead and
      // completes when its final point reaches that same line.
      const routeProgress = routeRect.height > 0
        ? (playhead - routeRect.top) / routeRect.height
        : 0;
      const sectionHasEnded = sectionRect.bottom <= window.innerHeight;
      const nextProgress = sectionHasEnded
        ? 1
        : Math.min(1, Math.max(0, routeProgress));

      setProgress(nextProgress);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  const displayedProgress = reducedMotion ? 1 : progress;
  const routePath = `M0 0 V85 H${routeWidth} V584 H0 V1090 H${routeWidth} V1220`;
  const routeViewBox = `0 0 ${routeWidth} 1220`;
  const routePathLength = routeWidth * 3 + 1220;

  return (
    <section id="cara-kerja" ref={sectionRef} className="tr-journey tr-shell">
      <div className="tr-section-heading">
        <h2>Uji Ide Rute<br />Secara Bertahap</h2>
        <p>Lihat kondisi wilayah, gambar rute, evaluasi metrik utama, lalu bandingkan alternatif yang tersedia.</p>
      </div>

      <svg className="tr-journey-route tr-journey-route-guide" viewBox={routeViewBox} preserveAspectRatio="none" aria-hidden="true">
        <path d={routePath} />
      </svg>
      <svg ref={routeRef} className="tr-journey-route tr-journey-route-progress" viewBox={routeViewBox} preserveAspectRatio="none" aria-hidden="true">
        <path
          className="tr-journey-route-active"
          d={routePath}
          style={{
            strokeDasharray: `${routePathLength} ${routePathLength}`,
            strokeDashoffset: routePathLength * (1 - displayedProgress),
          }}
        />
      </svg>
      <span className="tr-route-dot tr-route-dot-start" aria-hidden="true" />
      <span
        className="tr-route-dot tr-route-dot-end"
        aria-hidden="true"
        style={{ opacity: displayedProgress >= 0.999 ? 1 : 0 }}
      />

      <div className="tr-steps">
        {steps.map((step, index) => (
          <article key={index} className={`tr-step tr-step-${step.side}`}>
            <div className="tr-media-placeholder">
              <Image src={step.gif} alt={step.alt} width={589} height={315} unoptimized priority={index < 2} />
            </div>
            <div className="tr-step-copy">
              <span className="tr-step-badge">LANGKAH {step.stepNumber}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
