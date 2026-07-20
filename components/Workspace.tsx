"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  Layers3,
  LoaderCircle,
  Play,
  Route as RouteIcon,
  Sparkles,
  GitCompareArrows,
  FileText,
  Redo2,
  Undo2,
  Download,
  Plus,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AnalysisResult, Insight, LineString, MapContext, SelectedFeature } from "@/lib/types";

const TransitMap = dynamic(() => import("./TransitMap"), {
  ssr: false,
  loading: () => <div className="map-loading"><LoaderCircle className="spin" /> Memuat peta…</div>,
});

const directionLabel = { north: "utara", south: "selatan", east: "timur", west: "barat" };

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Baik";
  if (score >= 40) return "Cukup";
  return "Perlu perbaikan";
}

// demo route for Load Demo Route
const demoRoute: LineString = {
  type: "LineString",
  coordinates: [
    [106.8, -6.2],
    [106.805, -6.205],
    [106.81, -6.21],
    [106.815, -6.215],
    [106.82, -6.22],
  ],
};

export default function Workspace() {
  const [route, setRoute] = useState<LineString | null>(null);
  const [context, setContext] = useState<MapContext | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapNotice, setMapNotice] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [focusRequest, setFocusRequest] = useState<(SelectedFeature & { nonce: number }) | null>(null);
  const [layers, setLayers] = useState({ routes: true, population: true, property: true, facilities: true, buffer: true });
  const analysisRequest = useRef<AbortController | null>(null);
  const insightRequest = useRef<AbortController | null>(null);

  const updateRoute = useCallback((nextRoute: LineString | null) => {
    analysisRequest.current?.abort();
    insightRequest.current?.abort();
    setRoute(nextRoute);
    setAnalysis(null);
    setInsight(null);
    setLoading(false);
    setInsightLoading(false);
    setError("");
  }, []);

  async function analyze(nextRoute = route) {
    if (!nextRoute) return;
    analysisRequest.current?.abort();
    insightRequest.current?.abort();
    const analysisController = new AbortController();
    analysisRequest.current = analysisController;
    setLoading(true);
    setInsightLoading(false);
    setError("");
    setAnalysis(null);
    setInsight(null);
    let result: AnalysisResult;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ route: nextRoute }),
        signal: analysisController.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analisis gagal dijalankan.");
      if (analysisRequest.current !== analysisController) return;
      result = payload;
      setAnalysis(payload);
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Analisis gagal dijalankan.");
      return;
    } finally {
      if (analysisRequest.current === analysisController) {
        analysisRequest.current = null;
        setLoading(false);
      }
    }

    const insightController = new AbortController();
    insightRequest.current = insightController;
    setInsightLoading(true);
    try {
      const insightResponse = await fetch("/api/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
        signal: insightController.signal,
      });
      const narrative = await insightResponse.json();
      if (insightResponse.ok && insightRequest.current === insightController) setInsight(narrative);
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setInsight(null);
    } finally {
      if (insightRequest.current === insightController) {
        insightRequest.current = null;
        setInsightLoading(false);
      }
    }
  }

  async function applyRecommendation() {
    const recommended = analysis?.recommendation?.route_geojson;
    if (!recommended || loading) return;
    updateRoute(recommended);
    await analyze(recommended);
  }

  function loadDemo() {
    updateRoute(demoRoute);
  }

  function selectFeature(feature: SelectedFeature) {
    // ponytail: Keep inspection in the map; add a persistent attribute panel only when Figma defines one.
    setSelectedFeature(feature);
    setFocusRequest({ ...feature, nonce: Date.now() });
  }

  // Build AI paragraphs from the verified analysis data
  function aiParagraphs(a: AnalysisResult): string[] {
    const b = a.baseline;
    const lines: string[] = [];
    lines.push(`Rute ini menjangkau ${b.population_covered.toLocaleString("id-ID")} warga dalam buffer ${b.formula.buffer_meters} m dengan overlap rute existing ${b.overlap_pct}%.`);
    if (b.overlap_pct > 15) {
      lines.push(`Overlap ${b.overlap_pct}% masih perlu dikendalikan. Prioritaskan koridor dengan tumpang tindih minimal.`);
    } else {
      lines.push(`Overlap ${b.overlap_pct}% masih dalam toleransi perencanaan.`);
    }
    if (a.recommendation) {
      lines.push(`Geser segmen ${a.recommendation.distance_meters} m ke ${directionLabel[a.recommendation.direction]} untuk meningkatkan cakupan.`);
    }
    return lines;
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="workspace-title">
          <Link href="/" aria-label="Kembali ke beranda"><ArrowLeft size={18} /></Link>
          <span className="brand-mark"><RouteIcon size={17} /></span>
          <div>
            <strong>{context?.study_area.properties.name || "Bandung Corridor Study"}</strong>
            <span>Bandung Timur · Evaluasi aksesibilitas rute angkutan umum</span>
          </div>
          <div className="scenario-tabs" aria-label="Scenario analisis">
            <button className="scenario-tab active" aria-pressed="true">Scenario A</button>
            <button className="scenario-tab" disabled title="Belum tersedia pada prototype">Scenario B</button>
            <button className="scenario-add" disabled title="Belum tersedia pada prototype" aria-label="Tambah scenario, belum tersedia"><Plus size={12} /></button>
            <button className="scenario-duplikat" disabled title="Belum tersedia pada prototype">Duplikat</button>
          </div>
        </div>
        <div className="workspace-meta">
          <span className="save-state"><i /> Sesi lokal</span>
          <span className="divider" />
          <Link href="/#metodologi" className="header-link">Metodologi</Link>
          <button className="header-link" disabled title="Belum tersedia pada prototype"><Download size={12} /> Ekspor</button>
        </div>
      </header>

      <aside className="tool-panel">
        <div className="panel-block" style={{ paddingBottom: "16px" }}>
          <p className="panel-kicker">PROJECT</p>
          <div className="project-info">
            <RouteIcon size={17} />
            <h3>Bandung Corridor Study</h3>
          </div>
          <span className="project-loc">Bandung Timur</span>
          <button className="load-demo-btn" onClick={loadDemo}><Play size={12} /> Load Demo Route</button>
        </div>

        <div className="panel-block">
          <p className="panel-kicker">TOOLS</p>
          <div className="tool-stack">
            <p className="tool-hint">Gunakan kontrol peta untuk gambar, edit, atau hapus rute.</p>
            <div className="tool-row">
              <button className="tool-btn" disabled title="Gunakan kontrol edit pada peta">Select</button>
              <button className="tool-btn" disabled title="Gunakan kontrol edit pada peta">Edit Route</button>
            </div>
            <div className="tool-row">
              <button className="tool-btn" disabled title="Belum tersedia pada prototype"><Undo2 size={14} /> Undo</button>
              <button className="tool-btn" disabled title="Belum tersedia pada prototype"><Redo2 size={14} /> Redo</button>
              <button className="tool-btn primary-btn" disabled={!route || loading} onClick={() => analyze()}>
                {loading ? <LoaderCircle className="spin" size={14} /> : <Play size={14} fill="currentColor" />}
                Evaluasi
              </button>
            </div>
          </div>
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
            <span><i className="swatch facility-swatch" /> Fasilitas publik</span>
            <input type="checkbox" checked={layers.facilities} onChange={() => setLayers({ ...layers, facilities: !layers.facilities })} />
          </label>
          <label className="layer-toggle">
            <span><i className="swatch buffer-swatch" /> Buffer layanan</span>
            <input type="checkbox" checked={layers.buffer} onChange={() => setLayers({ ...layers, buffer: !layers.buffer })} />
          </label>
        </div>

        <div className="panel-block settings-block">
          <div className="panel-label">PENGATURAN ANALISIS</div>
          <label>Radius aksesibilitas <output>500 m</output></label>
          <input type="range" min="500" max="500" value="500" readOnly aria-label="Radius aksesibilitas 500 meter" />
          <p>Bobot: populasi/km 62,5% · anti-overlap 37,5%</p>
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
          selectedFeature={selectedFeature}
          onFeatureSelect={selectFeature}
          focusRequest={focusRequest}
        />
        <div className="map-legend-box">
          <span className="map-legend-title">Legenda</span>
          <div className="map-legend-items">
            <span><i className="legend-current" /> Current Route</span>
            <span><i className="legend-recommended" /> Recommended</span>
            <span><i className="legend-existing" /> Existing</span>
          </div>
        </div>
        {mapNotice && <div className="map-notice"><CircleAlert size={15} /> {mapNotice}</div>}
      </section>

      <aside className="result-panel">
        {!analysis && !loading && !error && (
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
                <p className="panel-kicker">ACCESSIBILITY SCORE</p>
                <h2>Panel Hasil</h2>
                <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "9px" }}>Analisis spasial PostGIS</p>
              </div>
              <span className="score-status"><i /> {scoreLabel(analysis.baseline.score)}</span>
            </div>

            <div className="score-overview">
              <div
                className="score-ring-ws"
                style={{ "--score": `${analysis.baseline.score * 3.6}deg` } as CSSProperties}
              >
                <div><strong>{Math.round(analysis.baseline.score)}</strong><span>/ 100</span></div>
              </div>
              <div><span>Transit Accessibility Score</span><p>Gabungan cakupan populasi per km dan penghindaran overlap.</p></div>
            </div>

            <div className="metrics-grid-6">
              <div className="metric-cell">
                <div className="metric-label">POPULASI</div>
                <div className="metric-value">{analysis.baseline.population_covered.toLocaleString("id-ID")}</div>
                <div className="metric-unit">warga terjangkau</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">PROPERTY</div>
                <div className="metric-value">{analysis.baseline.property_go_count.toLocaleString("id-ID")}</div>
                <div className="metric-unit">titik terjangkau</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">OVERLAP</div>
                <div className="metric-value">{analysis.baseline.overlap_pct}%</div>
                <div className="metric-unit">rute existing</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">PANJANG</div>
                <div className="metric-value">{analysis.baseline.route_length_km.toLocaleString("id-ID")}</div>
                <div className="metric-unit">km estimasi</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">POPULASI/KM</div>
                <div className="metric-value">{analysis.baseline.population_per_km.toLocaleString("id-ID")}</div>
                <div className="metric-unit">warga per km</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">BUFFER</div>
                <div className="metric-value">{analysis.baseline.formula.buffer_meters.toLocaleString("id-ID")}</div>
                <div className="metric-unit">meter layanan</div>
              </div>
            </div>

            <div className="route-facts">
              <span>Target populasi/km <b>{analysis.baseline.population_per_km_target.toLocaleString("id-ID")}</b></span>
              <span>Toleransi overlap <b>{analysis.baseline.formula.overlap_tolerance_meters} m</b></span>
            </div>

            <section className="ai-card">
              <div className="ai-title"><span><Sparkles size={16} /></span><div><strong>AI Planning Insight</strong><small>berdasarkan hasil PostGIS</small></div></div>
              {insightLoading && <p className="ai-loading"><LoaderCircle className="spin" size={16} /> Menyusun insight terverifikasi…</p>}
              {insight ? (
                <div className="ai-content">
                  {insight.summary.split(". ").filter(Boolean).map((s, i) => (
                    <p key={i} className="ai-paragraph">{s}{s.endsWith(".") ? "" : "."}</p>
                  ))}
                  {insight.actions.length > 0 && (
                    <ul className="ai-actions" aria-label="Rekomendasi tindakan">
                      {insight.actions.map((action) => <li key={action}>{action}</li>)}
                    </ul>
                  )}
                  <small>{insight.source === "ai" ? "Narasi AI dari data terverifikasi" : "Narasi fallback deterministik"}</small>
                </div>
              ) : analysis && !insightLoading ? (
                <div className="ai-content">
                  {aiParagraphs(analysis).map((p, i) => (
                    <p key={i} className="ai-paragraph">{p}</p>
                  ))}
                  <small>Narasi deterministik dari data PostGIS</small>
                </div>
              ) : null}
            </section>

            {analysis.recommendation ? (
              <section className="recommendation-card">
                <p className="panel-kicker">ALTERNATIF TERBAIK</p>
                <h3>Geser {analysis.recommendation.distance_meters} m ke {directionLabel[analysis.recommendation.direction]}</h3>
                <div className="delta-row">
                  <span>Skor <b>+{analysis.recommendation.score_delta}</b></span>
                  <span>Populasi/km <b>+{analysis.recommendation.population_per_km_delta.toLocaleString("id-ID")}</b></span>
                </div>
                <button className="apply-button" disabled={loading} onClick={applyRecommendation}><Check size={17} /> Terapkan Rekomendasi</button>
              </section>
            ) : (
              <section className="no-recommendation"><Check size={17} /><span><b>Alignment saat ini paling kuat</b>Tidak ada pergeseran teruji yang meningkatkan skor.</span></section>
            )}

            <div className="action-row">
              <button className="secondary-action" disabled title="Belum tersedia pada prototype"><GitCompareArrows size={14} /> Bandingkan Rute</button>
              <button className="secondary-action" disabled title="Belum tersedia pada prototype"><FileText size={14} /> Ekspor Report</button>
            </div>
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
