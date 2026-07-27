"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stationStops = [
  { x: 50, y: 62 },
  { x: 42, y: 106 },
  { x: 43, y: 152 },
  { x: 57, y: 244 },
  { x: 46, y: 342 },
  { x: 54, y: 438 },
  { x: 48, y: 526 },
];

const mainRoute =
  "M 50 42 L 50 58 L 58 66 L 58 82 L 50 90 L 42 90 L 42 106 L 50 114 L 50 130 L 43 138 L 43 152 L 51 160 L 51 196 L 57 204 L 57 244 L 49 254 L 49 302 L 46 314 L 46 342 L 53 352 L 53 408 L 54 438 L 48 454 L 48 526 L 52 548";

const heroBranches = [
  {
    d: "M 10 44 L 30 44 L 42 56 L 50 56 L 58 64 L 76 64 L 92 48",
    color: "#EF4444",
    width: 1.15,
  },
  {
    d: "M 4 76 L 28 76 L 42 90 L 58 90 L 72 76 L 96 76",
    color: "#2563EB",
    width: 1.1,
  },
  {
    d: "M 18 112 L 34 112 L 50 96 L 66 112 L 86 112 L 100 98",
    color: "#14B8A6",
    width: 1.05,
  },
  {
    d: "M 24 24 L 24 42 L 38 56 L 38 84 L 50 96 L 50 130",
    color: "#0F766E",
    width: 1.05,
  },
  {
    d: "M 0 94 L 22 94 L 42 114 L 62 114 L 82 94 L 104 94",
    color: "#FACC15",
    width: 0.95,
  },
];

const heroStationStops = [
  [30, 44],
  [42, 56],
  [58, 64],
  [28, 76],
  [42, 90],
  [58, 90],
  [72, 76],
  [38, 56],
  [50, 96],
  [66, 112],
] as const;

export default function HeroRouteCanvas() {
  const progressPathRef = useRef<SVGPathElement>(null);
  const stationRefs = useRef<SVGCircleElement[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const path = progressPathRef.current;
    const stations = stationRefs.current.filter(Boolean);
    if (!path || reduceMotion) return;

    const length = path.getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
    gsap.set(stations, {
      opacity: 0,
      scale: 0.55,
      transformOrigin: "center",
    });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
      },
    });

    timeline
      .to(path, {
        strokeDashoffset: 0,
        duration: 1,
        ease: "none",
      })
      .to(
        stations,
        {
          opacity: 1,
          scale: 1,
          duration: 0.08,
          stagger: 0.12,
          ease: "power2.out",
        },
        0,
      );

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
  }, [reduceMotion]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="map-grid absolute inset-0 opacity-[0.18]" />
      <div className="absolute inset-x-0 top-0 h-[860px] bg-gradient-to-b from-background via-background/90 to-transparent" />
      <div className="absolute inset-y-0 left-1/2 w-[min(1120px,100vw)] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.94),rgba(250,251,252,0.72)_48%,transparent_78%)]" />

      <svg
        className="absolute left-1/2 top-0 h-full min-h-[3600px] w-[min(1180px,118vw)] -translate-x-1/2"
        viewBox="0 0 100 560"
        preserveAspectRatio="none"
      >
        <g opacity="0.12">
          <path
            d={mainRoute}
            fill="none"
            stroke="#64748B"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
          {heroBranches.map((branch) => (
            <path
              key={`base-${branch.d}`}
              d={branch.d}
              fill="none"
              stroke="#64748B"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={branch.width}
            />
          ))}
          {stationStops.map((stop) => (
            <circle
              key={`base-${stop.y}`}
              cx={stop.x}
              cy={stop.y}
              r="1.75"
              fill="#FAFBFC"
              stroke="#64748B"
              strokeWidth="0.55"
            />
          ))}
          {heroStationStops.map(([cx, cy]) => (
            <circle
              key={`hero-base-${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="1.35"
              fill="#FAFBFC"
              stroke="#64748B"
              strokeWidth="0.48"
            />
          ))}
        </g>

        <g opacity="0.42">
          {heroBranches.map((branch) => (
            <path
              key={branch.d}
              d={branch.d}
              fill="none"
              stroke={branch.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={branch.width}
            />
          ))}
          {heroStationStops.map(([cx, cy]) => (
            <circle
              key={`hero-${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="1.35"
              fill="#FAFBFC"
              stroke="#0F172A"
              strokeWidth="0.48"
            />
          ))}
        </g>

        <path
          ref={progressPathRef}
          d={mainRoute}
          fill="none"
          stroke="#0F766E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.05"
        />

        {stationStops.map((stop, index) => (
          <circle
            key={stop.y}
            ref={(node) => {
              if (node) stationRefs.current[index] = node;
            }}
            cx={stop.x}
            cy={stop.y}
            r="1.85"
            fill="#FAFBFC"
            stroke="#0F172A"
            strokeWidth="0.6"
          />
        ))}
      </svg>
    </div>
  );
}
