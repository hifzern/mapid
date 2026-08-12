"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  { side: "left", gif: false },
  { side: "right", gif: false },
  { side: "left", gif: true },
  { side: "right", gif: true },
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
            <div className="tr-media-placeholder">{step.gif ? "Gif" : null}</div>
            <div className="tr-step-copy">
              <h3>Uji Ide Rute<br />Secara Bertahap</h3>
              <p>Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial, metrik transparan, dan rekomendasi yang dapat ditelusuri.</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
