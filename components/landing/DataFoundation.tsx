"use client";

import { useEffect, useRef, useState } from "react";

const values = [
  "Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo", "ROAD_NETWORK",
  "Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo", "TRAIN_STATIONS",
  "Property Go", "BUS_STOPS", "BUFFER_ANALYSIS", "ROAD_NETWORK", "ROAD_NETWORK", "OpenStreetMap",
  "MOBILITY_DATA", "SPATIAL_LAYER", "PUBLIC_TRANSPORT", "TRANSIT_GAP", "ROAD_NETWORK", "ROAD_NETWORK",
  "ROAD_NETWORK", "DISTRICT_DATA", "PUBLIC_FACILITIES", "TRANSIT_GAP", "TRAIN_STATIONS", "TRANSIT_GAP",
  "TRANSIT_GAP", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo", "OVERLAY_DATA",
  "Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo", "OVERLAY_DATA",
  "Data Populasi", "MOBILITY_DATA", "SPATIAL_LAYER", "BUFFER_ANALYSIS", "MOBILITY_DATA", "Batas Administrasi",
  "Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo", "ROAD_NETWORK",
  "MOBILITY_DATA", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "TRANSIT_GAP", "ROAD_NETWORK",
];

const scrambleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const animatedIndexes = new Set([2, 7, 12, 17, 29, 32, 42, 47, 54, 56]);

type ScrollDirection = "forward" | "reverse";

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildCharacterSequence(actual: string, wordIndex: number, characterIndex: number) {
  const decoyCount = 4 + ((wordIndex + characterIndex) % 2);
  const sequence: string[] = [];
  let cursor = (wordIndex * 13 + characterIndex * 7 + 5) % scrambleCharacters.length;

  while (sequence.length < decoyCount) {
    const candidate = scrambleCharacters[cursor];
    if (candidate !== actual && !sequence.includes(candidate)) sequence.push(candidate);
    cursor = (cursor + 17) % scrambleCharacters.length;
  }

  return [...sequence, actual];
}

export default function DataFoundation() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrollState, setScrollState] = useState<{ progress: number; direction: ScrollDirection }>({
    progress: 0,
    direction: "forward",
  });

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateProgress = () => {
      frameRef.current = null;
      const section = sectionRef.current;
      if (!section) return;

      if (motionQuery.matches) {
        progressRef.current = 1;
        setScrollState({ progress: 1, direction: "forward" });
        return;
      }

      const bounds = section.getBoundingClientRect();
      const entryLine = window.innerHeight * 0.92;
      const settleLine = window.innerHeight * 0.14;
      const nextProgress = clamp((entryLine - bounds.top) / (entryLine - settleLine));
      const previousProgress = progressRef.current;

      const isBoundary = nextProgress === 0 || nextProgress === 1;
      if (!isBoundary && Math.abs(nextProgress - previousProgress) < 0.008) return;

      const direction: ScrollDirection = nextProgress < previousProgress ? "reverse" : "forward";
      progressRef.current = nextProgress;
      setScrollState({ progress: nextProgress, direction });
    };

    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(updateProgress);
    };

    const updateMotionPreference = () => {
      setReducedMotion(motionQuery.matches);
      requestUpdate();
    };

    updateMotionPreference();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    motionQuery.addEventListener("change", updateMotionPreference);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      motionQuery.removeEventListener("change", updateMotionPreference);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const visibleProgress = reducedMotion ? 1 : scrollState.progress;

  return (
    <section
      id="data"
      ref={sectionRef}
      className="tr-data-section"
      data-scroll-direction={scrollState.direction}
      data-scroll-progress={Math.round(visibleProgress * 100)}
    >
      <div className="tr-data-grid" aria-hidden="true">
        {values.map((value, index) => {
          const isSource = value.includes(" ") || value === "OpenStreetMap";

          if (!animatedIndexes.has(index)) {
            return (
              <div key={`${value}-${index}`} className={`${isSource ? "is-source " : ""}is-settled`}>
                <span className="tr-data-word">{value}</span>
              </div>
            );
          }

          const staggerRank = ((index * 19) % values.length) / (values.length - 1);
          const staggerStart = staggerRank * 0.18;
          const wordProgress = clamp((visibleProgress - staggerStart) / (1 - staggerStart));
          const characters = value.split("").map((actual, characterIndex) => {
            if (actual === " " || actual === "_" || actual === "-") {
              return { actual, display: actual, stage: -1 };
            }

            const characterRank = characterIndex / Math.max(1, value.length - 1);
            const characterStart = characterRank * 0.28;
            const characterProgress = clamp((wordProgress - characterStart) / (1 - characterStart));
            const sequence = buildCharacterSequence(actual, index, characterIndex);
            const stage = Math.min(sequence.length - 1, Math.floor(characterProgress * sequence.length));

            return { actual, display: sequence[stage], stage };
          });
          const isSettled = characters.every(({ actual, display }) => actual === display);

          return (
            <div
              key={`${value}-${index}`}
              className={`${isSource ? "is-source" : ""}${isSettled ? " is-settled" : ""}`}
            >
              <span className="tr-data-word">
                {characters.map(({ display, stage }, characterIndex) => (
                  <span
                    key={`${index}-${characterIndex}-${stage}`}
                    className={`tr-data-char${stage >= 0 ? ` is-${scrollState.direction}` : ""}`}
                    data-stage={stage}
                  >
                    {display === " " ? "\u00a0" : display}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="tr-data-copy">
        <p className="tr-eyebrow">Sumber evaluasi</p>
        <h2>Data yang Menjadi Dasar<br />Setiap Evaluasi</h2>
        <p>Transight menggabungkan data spasial dari berbagai sumber untuk memahami kondisi wilayah, jaringan transportasi, kepadatan penduduk, dan fasilitas publik secara lebih utuh.</p>
      </div>
    </section>
  );
}
