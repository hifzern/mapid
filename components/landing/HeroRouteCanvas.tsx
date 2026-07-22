"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HeroRouteCanvas() {
  const pathRef = useRef<SVGPathElement>(null);
  const stationRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const path = pathRef.current;
    const stations = stationRefs.current.filter(Boolean);
    if (!path) return;

    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    gsap.set(stations, { opacity: 0, scale: 0.55, transformOrigin: "center" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
      },
    });

    tl.to(path, { strokeDashoffset: 0, duration: 1, ease: "none" })
      .to(stations, { opacity: 1, scale: 1, duration: 0.08, stagger: 0.12, ease: "power2.out" }, 0);

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      className="hero-canvas"
      aria-hidden="true"
      style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}
    >
      <div className="map-grid" style={{ position: "absolute", inset: 0, opacity: 0.18 }} />
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, #fafbfc 0%, transparent 860px)",
      }} />
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.6) 0%, transparent 60%)",
      }} />
      <svg
        viewBox="0 0 100 560"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(1180px, 118vw)",
          minHeight: "3600px",
          display: "block",
        }}
      >
        {/* Base layer — opacity 0.12 */}
        <g opacity={0.12}>
          <path d="M50 0 L48 40 L52 90 L47 140 L53 190 L49 240 L51 300 L48 360 L52 420 L47 480 L53 520 L50 560" fill="none" stroke="#64748b" strokeWidth="2" />
          <path d="M48 40 L20 80" fill="none" stroke="#ef4444" strokeWidth="1.5" />
          <path d="M52 90 L75 50" fill="none" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M47 140 L25 170" fill="none" stroke="#14b8a6" strokeWidth="1.5" />
          <path d="M53 190 L78 210" fill="none" stroke="#0f766e" strokeWidth="1.5" />
          <path d="M49 240 L30 290" fill="none" stroke="#facc15" strokeWidth="1.5" />
          {[0, 40, 90, 140, 190, 240, 300, 360, 420, 480, 520, 560].map((y, i) => (
            <circle key={i} cx={[50,48,52,47,53,49,51,48,52,47,53,50][i]} cy={y} r="1.5" fill="#64748b" />
          ))}
        </g>

        {/* Color layer — opacity 0.42 */}
        <g opacity={0.42}>
          <path d="M48 40 L20 80" fill="none" stroke="#ef4444" strokeWidth="1.5" />
          <path d="M52 90 L75 50" fill="none" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M47 140 L25 170" fill="none" stroke="#14b8a6" strokeWidth="1.5" />
          <path d="M53 190 L78 210" fill="none" stroke="#0f766e" strokeWidth="1.5" />
          <path d="M49 240 L30 290" fill="none" stroke="#facc15" strokeWidth="1.5" />
          {[0, 40, 90, 140, 190, 240, 300, 360, 420, 480, 520, 560].map((y, i) => (
            <circle key={i} cx={[50,48,52,47,53,49,51,48,52,47,53,50][i]} cy={y} r="2" fill="#0f172a" />
          ))}
        </g>

        {/* Animated progress path */}
        <path
          ref={pathRef}
          d="M50 0 L48 40 L52 90 L47 140 L53 190 L49 240 L51 300 L48 360 L52 420 L47 480 L53 520 L50 560"
          fill="none"
          stroke="#0f766e"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Animated stations */}
        {[0, 40, 90, 140, 190, 240, 300, 360, 420, 480, 520, 560].map((y, i) => (
          <circle
            key={i}
            ref={(el) => { stationRefs.current[i] = el; }}
            cx={[50,48,52,47,53,49,51,48,52,47,53,50][i]}
            cy={y}
            r="1.8"
            fill="#0f766e"
          />
        ))}
      </svg>
    </div>
  );
}
