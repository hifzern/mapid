"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  Eraser,
  Layers3,
  LoaderCircle,
  MapPin,
  Play,
  Route as RouteIcon,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import type { AnalysisResult, Insight, LineString, MapContext } from "@/lib/types";

const TransitMap = dynamic(() => import("./TransitMap"), {
  ssr: false,
  loading: () => <div className="map-loading"><LoaderCircle className="spin" /> Memuat peta…</div>,
});

const directionLabel = { north: "utara", south: "selatan", east: "timur", west: "barat" };

function scoreLabel(score: number) {
  if (score >= 80) return "Sangat baik";
  if (score >= 60) return "Baik";
  if (score >= 40) return "Cukup";
  return "Perlu perbaikan";
}

export default function Workspace() {
  const [route, setRoute] = useState<LineString | null>(null);
  const [context, setContext] = useState<MapContext | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapNotice, setMapNotice] = useState("");
  const [layers, setLayers] = useState({ routes: true, population: true, property: true, buffer: true });

  const updateRoute = useCallback((nextRoute: LineString | null) => {
    setRoute(nextRoute);
    setAnalysis(null);
    setInsight(null);
    setError("");
  }, []);

  async function analyze(nextRoute = route) {
    if (!nextRoute) return;
    setLoading(true);
    setError("");
    setInsight(null);
    let result: AnalysisResult;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ route: nextRoute }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analisis gagal dijalankan.");
      result = payload;
      setAnalysis(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analisis gagal dijalankan.");
      setLoading(false);
      return;
    }
    setLoading(false);

    setInsightLoading(true);
    try {
      const insightResponse = await fetch("/api/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });
      const narrative = await insightResponse.json();
      if (insightResponse.ok) setInsight(narrative);
    } catch {
      // The verified spatial result remains visible when the narrative service fails.
    } finally {
      setInsightLoading(false);
    }
  }

  async function applyRecommendation() {
    const recommended = analysis?.recommendation?.route_geojson;
    if (!recommended) return;
    setRoute(recommended);
    await analyze(recommended);
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="workspace-title">
          <Link href="/" aria-label="Kembali ke beranda"><ArrowLeft size={18} /></Link>
          <span className="brand-mark"><RouteIcon size={17} /></span>
          <div>
            <strong>{context?.study_area.properties.name || "Studi koridor transit"}</strong>
            <span>Evaluasi aksesibilitas rute angkutan umum</span>
          </div>
        </div>
        <div className="workspace-meta">
          <span className="save-state"><i /> Analisis tidak disimpan</span>
          <Link href="/#metodologi" className="header-link">Metodologi</Link>
        </div>
      </header>

      <aside className="tool-panel">
        <div className="panel-block route-tools">
          <p className="panel-kicker">RUTE USULAN</p>
          <h2>Gambar di peta</h2>
          <p>Pakai alat garis di peta. Klik titik akhir dua kali untuk selesai.</p>
          <button className="secondary-action" onClick={() => updateRoute(null)} disabled={!route}>
            <Eraser size={16} /> Bersihkan rute
          </button>
        </div>

        <div className="panel-block">
          <div className="panel-label"><Layers3 size={16} /> Layer analisis</div>
          <label className="layer-toggle">
            <span><i className="swatch route-swatch" /> Rute existing</span>
            <input type="checkbox" checked={layers.routes} onChange={() => setLayers({ ...layers, routes: !layers.routes })} />
          </label>
          <label className="layer-toggle">
            <span><i className="swatch population-swatch" /> Kepadatan penduduk</span>
            <input type="checkbox" checked={layers.population} onChange={() => setLayers({ ...layers, population: !layers.population })} />
          </label>
          <label className="layer-toggle">
            <span><i className="swatch property-swatch" /> Property GO</span>
            <input type="checkbox" checked={layers.property} onChange={() => setLayers({ ...layers, property: !layers.property })} />
          </label>
          <label className="layer-toggle">
            <span><i className="swatch buffer-swatch" /> Buffer layanan</span>
            <input type="checkbox" checked={layers.buffer} onChange={() => setLayers({ ...layers, buffer: !layers.buffer })} />
          </label>
        </div>

        <div className="panel-block settings-block">
          <div className="panel-label">Pengaturan analisis</div>
          <label>Radius layanan <output>500 m</output></label>
          <input type="range" min="500" max="500" value="500" readOnly aria-label="Radius layanan 500 meter" />
          <p>Bobot: populasi/km 62,5% · anti-overlap 37,5%</p>
        </div>

        <div className="evaluate-wrap">
          <button className="evaluate-button" disabled={!route || loading} onClick={() => analyze()}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <Play size={18} fill="currentColor" />}
            {loading ? "Menghitung…" : "Evaluasi rute"}
          </button>
          <span>{route ? `${route.coordinates.length} titik siap dianalisis` : "Gambar minimal dua titik"}</span>
        </div>
      </aside>

      <section className="map-canvas" aria-label="Peta evaluasi transit">
        <TransitMap
          route={route}
          onRouteChange={updateRoute}
          context={context}
          onContext={setContext}
          onNotice={setMapNotice}
          analysis={analysis}
          layers={layers}
        />
        <div className="map-legend workspace-legend">
          <span><i className="legend-current" /> Rute saat ini</span>
          <span><i className="legend-recommended" /> Rekomendasi</span>
          <span><i className="legend-existing" /> Existing</span>
        </div>
        {mapNotice && <div className="map-notice"><CircleAlert size={15} /> {mapNotice}</div>}
      </section>

      <aside className="result-panel">
        {!analysis && !loading && (
          <div className="empty-result">
            <div className="empty-icon"><RouteIcon size={27} /></div>
            <p className="panel-kicker">HASIL EVALUASI</p>
            <h2>Belum ada rute yang dinilai.</h2>
            <p>Gambar sebuah garis di peta, lalu pilih <b>Evaluasi rute</b> untuk melihat skor dan alternatif.</p>
            <div className="empty-steps">
              <span><i>1</i> Gambar koridor</span><ChevronRight size={14} />
              <span><i>2</i> Evaluasi</span><ChevronRight size={14} />
              <span><i>3</i> Bandingkan</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="result-loading">
            <LoaderCircle className="spin" size={28} />
            <h2>Menghitung konteks rute…</h2>
            <p>PostGIS sedang menguji buffer, populasi, overlap, dan alternatif alignment.</p>
          </div>
        )}

        {error && !loading && (
          <div className="result-error" role="alert">
            <CircleAlert size={22} />
            <div><strong>Evaluasi belum dapat dijalankan</strong><p>{error}</p></div>
          </div>
        )}

        {analysis && !loading && (
          <div className="result-content">
            <div className="result-heading">
              <div>
                <p className="panel-kicker">HASIL EVALUASI</p>
                <h2>Ringkasan koridor</h2>
              </div>
              <span className="score-status"><i /> {scoreLabel(analysis.baseline.score)}</span>
            </div>

            <div className="score-overview">
              <div
                className="score-ring"
                style={{ "--score": `${analysis.baseline.score * 3.6}deg` } as CSSProperties}
              >
                <div><strong>{Math.round(analysis.baseline.score)}</strong><span>/ 100</span></div>
              </div>
              <div><span>Transit Accessibility Score</span><p>Gabungan cakupan populasi per km dan penghindaran overlap.</p></div>
            </div>

            <div className="metrics-grid">
              <article><Users size={17} /><span>Populasi terjangkau</span><strong>{analysis.baseline.population_covered.toLocaleString("id-ID")}</strong></article>
              <article><Database size={17} /><span>Populasi / km</span><strong>{analysis.baseline.population_per_km.toLocaleString("id-ID")}</strong></article>
              <article><RouteIcon size={17} /><span>Overlap existing</span><strong>{analysis.baseline.overlap_pct.toLocaleString("id-ID")}%</strong></article>
              <article><MapPin size={17} /><span>Property GO</span><strong>{analysis.baseline.property_go_count.toLocaleString("id-ID")}</strong></article>
            </div>

            <div className="route-facts">
              <span>Panjang rute <b>{analysis.baseline.route_length_km.toLocaleString("id-ID")} km</b></span>
              <span>Buffer layanan <b>{analysis.baseline.formula.buffer_meters} m</b></span>
            </div>

            <section className="ai-card">
              <div className="ai-title"><span><Sparkles size={16} /></span><div><strong>AI Planning Insight</strong><small>berdasarkan hasil PostGIS</small></div></div>
              {insightLoading && <p className="ai-loading"><LoaderCircle className="spin" size={16} /> Menyusun insight terverifikasi…</p>}
              {insight ? (
                <div className="ai-content">
                  <p>{insight.summary}</p>
                  <ul>{insight.actions.map((action) => <li key={action}>{action}</li>)}</ul>
                  {insight.source === "template" && <small>Narasi fallback deterministik</small>}
                </div>
              ) : !insightLoading ? <p className="ai-unavailable">Insight AI belum tersedia. Angka spasial di atas tetap valid.</p> : null}
            </section>

            {analysis.recommendation ? (
              <section className="recommendation-card">
                <p className="panel-kicker">ALTERNATIF TERBAIK</p>
                <h3>Geser {analysis.recommendation.distance_meters} m ke {directionLabel[analysis.recommendation.direction]}</h3>
                <div className="delta-row">
                  <span>Skor <b>+{analysis.recommendation.score_delta}</b></span>
                  <span>Populasi/km <b>+{analysis.recommendation.population_per_km_delta.toLocaleString("id-ID")}</b></span>
                </div>
                <button className="apply-button" onClick={applyRecommendation}><Check size={17} /> Terapkan & evaluasi ulang</button>
              </section>
            ) : (
              <section className="no-recommendation"><Check size={17} /><span><b>Alignment saat ini paling kuat</b>Tidak ada pergeseran teruji yang meningkatkan skor.</span></section>
            )}
          </div>
        )}
      </aside>

      <footer className="workspace-status">
        <span><i className={context ? "online" : ""} /> {context ? "Layer studi siap" : "Menunggu konfigurasi data"}</span>
        <span>EPSG:4326 · Analisis sinkron</span>
      </footer>
    </main>
  );
}
