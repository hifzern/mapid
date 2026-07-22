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
  MousePointer2,
  Hand,
  Pencil,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AnalysisResult, LineString } from "@/lib/types";
import { useStore } from "@/lib/workspace-store";
import type { Store } from "@/lib/workspace-store";
import ToastContainer from "./ToastContainer";

const TransitMap = dynamic(() => import("./TransitMap"), {
  ssr: false,
  loading: () => <div className="map-loading"><LoaderCircle className="spin" /> Memuat peta…</div>,
});

const directionLabel = { north: "utara", south: "selatan", east: "timur", west: "barat" };
const toolLabels: Record<string, string> = { select: "Select (V)", pan: "Pan (Space)", draw: "Draw (D)", edit: "Edit (E)" };

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Baik";
  if (score >= 40) return "Cukup";
  return "Perlu perbaikan";
}

function roadFeasibility(score: number): string {
  if (score >= 80) return "Baik";
  if (score >= 60) return "Cukup";
  return "Perlu tinjauan";
}

const demoRoute: LineString = {
  type: "LineString",
  coordinates: [
    [110.07, -7.87],
    [110.10, -7.86],
    [110.14, -7.86],
    [110.16, -7.86],
    [110.20, -7.87],
    [110.23, -7.88],
  ],
};

export default function Workspace() {
  const store = useStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);

  const analyze = useCallback(async (nextRoute = store.route) => {
    if (!nextRoute) return;
    store.setLoading(true);
    store.setRouteState("analyzing");
    store.setError("");
    store.setInsight(null);
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
      store.setAnalysis(payload);
    } catch (caught) {
      store.setError(caught instanceof Error ? caught.message : "Analisis gagal dijalankan.");
      store.setLoading(false);
      store.setRouteState("ready");
      return;
    }
    store.setLoading(false);
    store.setRouteState("analyzed");
    store.saveCurrentToScenario();

    store.setInsightLoading(true);
    try {
      const insightResponse = await fetch("/api/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });
      const narrative = await insightResponse.json();
      if (insightResponse.ok) store.setInsight(narrative);
    } catch {
    } finally {
      store.setInsightLoading(false);
    }
  }, [store]);

  const applyRecommendation = useCallback(async () => {
    const recommended = store.analysis?.recommendation?.route_geojson;
    if (!recommended) return;
    store.pushRouteHistory(recommended);
    store.addToast("Rekomendasi diterapkan. Mengevaluasi ulang...", "info");
    await analyze(recommended);
  }, [store, analyze]);

  const loadDemo = useCallback(() => {
    store.pushRouteHistory(demoRoute);
    store.addToast("Demo route dimuat", "success");
  }, [store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case "v": store.setActiveTool("select"); break;
        case "d": store.setActiveTool("draw"); break;
        case "e": store.setActiveTool("edit"); break;
        case " ":
          e.preventDefault();
          store.setActiveTool(store.activeTool === "pan" ? "select" : "pan");
          break;
        case "escape":
          store.setActiveTool("select");
          break;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [store]);

  // AI insight paragraphs
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

  const {
    routeState, activeTool, route, context, analysis, insight, error, mapNotice,
    loading, insightLoading, layers, scenarios, activeScenarioId,
    pointCount, routeLengthKm, settings,
  } = store;

  return (
    <main className="workspace">
      <ToastContainer />

      <header className="workspace-header">
        <div className="workspace-title">
          <Link href="/" aria-label="Kembali ke beranda"><ArrowLeft size={18} /></Link>
          <span className="brand-mark"><RouteIcon size={17} /></span>
          <div>
            <strong>{context?.study_area.properties.name || "Bandung Corridor Study"}</strong>
            <span>Bandung Timur · Evaluasi aksesibilitas rute angkutan umum</span>
          </div>
          <div className="scenario-tabs">
            {scenarios.map((s) => (
              <button
                key={s.id}
                className={`scenario-tab ${s.id === activeScenarioId ? "active" : ""}`}
                onClick={() => store.switchScenario(s.id)}
              >
                {s.name}
              </button>
            ))}
            <button className="scenario-add" title="Buat scenario baru" onClick={() => store.createScenario()}>
              <Plus size={12} />
            </button>
          </div>
        </div>
        <div className="workspace-meta">
          <span className="save-state"><i /> {analysis ? "Saved" : "Unsaved"}</span>
          <span className="divider" />
          <Link href="/#metodologi" className="header-link">Report</Link>
          <button className="header-link" onClick={() => setShowExport(true)}><Download size={12} /> Ekspor</button>
        </div>
      </header>

      <aside className="tool-panel">
        <div className="panel-block" style={{ paddingBottom: "16px" }}>
          <p className="panel-kicker">PROJECT</p>
          <div className="project-info">
            <RouteIcon size={17} />
            <h3>Kab. Kulonprogo</h3>
          </div>
          <span className="project-loc">DIY Yogyakarta</span>
          <input
            className="route-name-input"
            value={store.routeName}
            onChange={(e) => store.setRouteName(e.target.value)}
            placeholder="Nama rute"
          />
          <button className="load-demo-btn" onClick={loadDemo}><Play size={12} /> Load Demo Route</button>
        </div>

        <div className="panel-block">
          <p className="panel-kicker">TOOLS</p>
          <div className="tool-stack">
            <div className="tool-row">
              {(["select", "pan", "draw", "edit"] as const).map((tool) => (
                <button
                  key={tool}
                  className={`tool-btn${activeTool === tool ? " active-tool" : ""}`}
                  onClick={() => store.setActiveTool(activeTool === tool ? "select" : tool)}
                >
                  {tool === "select" ? <MousePointer2 size={14} /> : tool === "pan" ? <Hand size={14} /> : <Pencil size={14} />}
                  {toolLabels[tool]}
                </button>
              ))}
            </div>
            <div className="tool-row">
              <button className="tool-btn" onClick={() => store.undo()} disabled={!store.canUndo()}>
                <Undo2 size={14} /> Undo
              </button>
              <button className="tool-btn" onClick={() => store.redo()} disabled={!store.canRedo()}>
                <Redo2 size={14} /> Redo
              </button>
              <button className="tool-btn primary-btn" disabled={!route || loading} onClick={() => analyze()}>
                {loading ? <LoaderCircle className="spin" size={14} /> : <Play size={14} fill="currentColor" />}
                Evaluasi
              </button>
            </div>
          </div>
        </div>

        <div className="panel-block">
          <div className="panel-label"><Layers3 size={16} /> Layer analisis</div>
          {(["routes", "population", "property", "facilities", "buffer"] as const).map((layer) => (
            <label key={layer} className="layer-toggle">
              <span><i className={`swatch ${layer}-swatch`} /> {
                layer === "routes" ? "Rute existing" :
                layer === "population" ? "Kepadatan penduduk" :
                layer === "property" ? "Property GO" :
                layer === "facilities" ? "Fasilitas publik" : "Buffer layanan"
              }</span>
              <input type="checkbox" checked={layers[layer]} onChange={() => store.toggleLayer(layer)} />
            </label>
          ))}
        </div>

        <div className="panel-block settings-block">
          <div className="panel-label">PENGATURAN ANALISIS</div>
          <label>Radius aksesibilitas <output>{settings.bufferRadius} m</output></label>
          <input
            type="range" min="300" max="800" step="100"
            value={settings.bufferRadius}
            onChange={(e) => store.setSettings({ bufferRadius: Number(e.target.value) })}
            aria-label="Radius aksesibilitas"
          />
          <label style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "10px" }}>
            Prioritas
            <select
              value={settings.priority}
              onChange={(e) => store.setSettings({ priority: e.target.value as Store["settings"]["priority"] })}
              style={{ fontSize: "9px", padding: "2px 4px", border: "1px solid var(--line)", borderRadius: "4px", color: "var(--ink)", background: "#fff" }}
            >
              <option value="balanced">Seimbang</option>
              <option value="coverage">Max Coverage</option>
              <option value="overlap">Min Overlap</option>
              <option value="residential">Serve Residential</option>
            </select>
          </label>
          <p>Bobot: populasi/km 62,5% · anti-overlap 37,5%</p>
        </div>
      </aside>

      <section className="map-canvas" aria-label="Peta evaluasi transit">
        <div className="map-toolbar">
          <button title="Perbesar" onClick={() => {}}>+</button>
          <button title="Perkecil" onClick={() => {}}>−</button>
          <button title="Sesuaikan tampilan" onClick={() => {}}>Fit</button>
        </div>
        <TransitMap
          ref={mapRef}
          route={route}
          onRouteChange={store.pushRouteHistory}
          context={context}
          onContext={store.setContext}
          onNotice={store.setMapNotice}
          analysis={analysis}
          layers={layers}
          selectedFeature={null}
          onFeatureSelect={() => {}}
          focusRequest={null}
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
        {!analysis && !loading && routeState !== "analyzing" && (
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

        {(loading || routeState === "analyzing") && (
          <div className="result-loading">
            <LoaderCircle className="spin" size={28} />
            <h2>Menganalisis konteks rute…</h2>
            <div style={{ textAlign: "left", maxWidth: "260px", marginTop: "12px", display: "grid", gap: "6px" }}>
              {["Memvalidasi geometri rute", "Membentuk buffer 500 m", "Menghitung cakupan populasi", "Mendeteksi overlap existing", "Menguji 16 alternatif alignment", "Menyusun hasil evaluasi"].map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: "8px", color: i < 5 ? "var(--teal)" : "var(--muted)", fontSize: "9px" }}>
                  <span style={{ width: "14px", height: "14px", display: "grid", placeItems: "center", background: i < 5 ? "var(--teal-pale)" : "transparent", borderRadius: "50%", fontSize: "8px", fontWeight: 800, color: i < 5 ? "var(--teal)" : "var(--muted)" }}>
                    {i < 5 ? <Check size={10} /> : i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
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
                <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "9px" }}>Mock Spatial Analysis</p>
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
                <div className="metric-unit">residents</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">PROPERTY</div>
                <div className="metric-value">{analysis.baseline.property_go_count.toLocaleString("id-ID")}</div>
                <div className="metric-unit">area terjangkau</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">OVERLAP</div>
                <div className="metric-value">{analysis.baseline.overlap_pct}%</div>
                <div className="metric-unit">rute existing</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">PANJANG</div>
                <div className="metric-value">{analysis.baseline.route_length_km.toLocaleString("id-ID")}</div>
                <div className="metric-unit">estimasi</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">JALAN</div>
                <div className="metric-value">{roadFeasibility(analysis.baseline.score)}</div>
                <div className="metric-unit">aksesibilitas</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">FASILITAS</div>
                <div className="metric-value">-</div>
                <div className="metric-unit">sekolah + RS</div>
              </div>
            </div>

            <div className="route-facts">
              <span>Populasi/km <b>{analysis.baseline.population_per_km.toLocaleString("id-ID")}</b></span>
              <span>Buffer layanan <b>{analysis.baseline.formula.buffer_meters} m</b></span>
            </div>

            {analysis.recommendation && (
              <section className="comparison-section">
                <p className="panel-kicker">PERBANDINGAN RUTE</p>
                <h3>Baseline vs Rekomendasi</h3>
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      <th style={{ textAlign: "right" }}>Baseline</th>
                      <th style={{ textAlign: "right" }}>Rekomendasi</th>
                      <th style={{ textAlign: "right" }}>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Skor", base: analysis.baseline.score, rec: analysis.recommendation.result.score, unit: "", fmt: (v: number) => Math.round(v).toString() },
                      { label: "Populasi", base: analysis.baseline.population_covered, rec: analysis.recommendation.result.population_covered, unit: "jiwa", fmt: (v: number) => v.toLocaleString("id-ID") },
                      { label: "Overlap", base: analysis.baseline.overlap_pct, rec: analysis.recommendation.result.overlap_pct, unit: "%", fmt: (v: number) => `${v}%` },
                      { label: "Panjang", base: analysis.baseline.route_length_km, rec: analysis.recommendation.result.route_length_km, unit: "km", fmt: (v: number) => `${v.toLocaleString("id-ID")} km` },
                      { label: "Property", base: analysis.baseline.property_go_count, rec: analysis.recommendation.result.property_go_count, unit: "", fmt: (v: number) => v.toLocaleString("id-ID") },
                    ].map(({ label, base, rec, fmt }) => {
                      const delta = rec - base;
                      return (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>{fmt(base)}</td>
                          <td>{fmt(rec)}</td>
                          <td className={delta >= 0 ? "delta-pos" : "delta-neg"}>
                            {delta > 0 ? "+" : ""}{fmt(Math.abs(delta))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            <section className="ai-card">
              <div className="ai-title"><span><Sparkles size={16} /></span><div><strong>AI Planning Insight</strong><small>berdasarkan hasil PostGIS</small></div></div>
              {insightLoading && <p className="ai-loading"><LoaderCircle className="spin" size={16} /> Menyusun insight terverifikasi…</p>}
              {insight ? (
                <div className="ai-content">
                  {insight.summary.split(". ").filter(Boolean).map((s, i) => (
                    <p key={i} className="ai-paragraph">{s}.</p>
                  ))}
                  {insight.source === "template" && <small>Narasi fallback deterministik</small>}
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
                <button className="apply-button" onClick={applyRecommendation}><Check size={17} /> Terapkan Rekomendasi</button>
              </section>
            ) : (
              <section className="no-recommendation"><Check size={17} /><span><b>Alignment saat ini paling kuat</b>Tidak ada pergeseran teruji yang meningkatkan skor.</span></section>
            )}

            <div className="action-row">
              <button className="secondary-action"><GitCompareArrows size={14} /> Bandingkan Rute</button>
              <button className="secondary-action"><FileText size={14} /> Ekspor Report</button>
            </div>
          </div>
        )}
      </aside>

      <footer className="workspace-status">
        <span>
          <i className={context ? "online" : ""} />
          {context ? "Layer studi siap" : "Menunggu konfigurasi data"}
        </span>
        <span style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {activeTool !== "select" && (
            <span className="tool-indicator">{toolLabels[activeTool]}</span>
          )}
          {route && (
            <>
              <span className="stat-divider" />
              <span>{pointCount} titik</span>
              <span className="stat-divider" />
              <span>{routeLengthKm} km</span>
            </>
          )}
          <span className="stat-divider" />
          <span>EPSG:4326</span>
          <span className="stat-divider" />
          <span>Analisis sinkron</span>
        </span>
      </footer>

      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ekspor Hasil</h3>
            <p>Pilih format untuk mengekspor hasil evaluasi rute ini.</p>
            <div className="modal-options">
              <div className="modal-option" onClick={() => { store.addToast("PDF simulation — fitur akan datang", "info"); setShowExport(false); }}>
                <FileText size={20} />
                <div>PDF Report<small>Laporan lengkap dengan peta dan metrik</small></div>
              </div>
              <div className="modal-option" onClick={() => { store.addToast("Image simulation — fitur akan datang", "info"); setShowExport(false); }}>
                <Download size={20} />
                <div>Map Image<small>Snapshot peta dengan legenda (PNG)</small></div>
              </div>
              <div className="modal-option" onClick={() => { navigator.clipboard.writeText(window.location.href); store.addToast("Link disalin!", "success"); setShowExport(false); }}>
                <GitCompareArrows size={20} />
                <div>Share Link<small>Salin tautan ke clipboard</small></div>
              </div>
            </div>
            <button className="modal-close" onClick={() => setShowExport(false)}>Tutup</button>
          </div>
        </div>
      )}
    </main>
  );
}
