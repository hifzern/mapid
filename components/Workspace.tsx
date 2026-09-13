"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  Play,
  Route as RouteIcon,
  Sparkles,
  FileText,
  FileUp,
  Redo2,
  Undo2,
  Download,
  Plus,
  Copy,
  GitCompare,
  Hand,
  Pencil,
  Trash2,
  X,
  Users,
  Building2,
  Clock,
  MapPin,
  Layers,
  LogOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import type { AnalysisResult, LineString, MapContext, MapGeoJSON, Position, RouteChangeSource, SelectedFeature, SnapEndpoint, SnapPreview, SourceStatus } from "@/lib/types";
import { isLineString, normalizeMapGeoJSON } from "@/lib/types";
import { MAX_IMPORTED_DATASETS, useStore } from "@/lib/workspace-store";
import ToastContainer from "./ToastContainer";

const TransitMap = dynamic(() => import("./TransitMap"), {
  ssr: false,
  loading: () => <div className="map-loading"><LoaderCircle className="spin" /> Memuat peta…</div>,
});

const directionLabel = { north: "utara", south: "selatan", east: "timur", west: "barat" };
const toolLabels = { pan: "Select (V)", draw: "Gambar (D)", edit: "Edit Route (E)" };
const sourceStatusLabel: Record<SourceStatus, string> = {
  demo: "Demo",
  provisional: "Provisional",
  verified: "Terverifikasi",
  unavailable: "Belum tersedia",
};

function dataReadiness(context: MapContext | null): SourceStatus {
  if (!context?.sources.length) return "unavailable";
  const statuses = [
    ...context.sources.map((source) => source.status),
    context.methodology.target_calibration_status,
  ];
  if (statuses.includes("unavailable")) return "unavailable";
  if (statuses.includes("demo")) return "demo";
  if (statuses.includes("provisional")) return "provisional";
  return "verified";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Sangat Baik";
  if (score >= 60) return "Baik";
  if (score >= 40) return "Cukup";
  return "Perlu perbaikan";
}

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function fileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rute-kulon-progo";
}

function featureLabel(context: MapContext | null, selected: SelectedFeature | null) {
  if (!context || !selected) return "";
  const collections = {
    existing_route: context.existing_routes,
    population: context.population,
    property_go: context.property_go,
    public_facility: context.public_facilities,
  };
  const feature = collections[selected.kind].features.find((item) => item.properties.id === selected.id);
  if (!feature) return "Objek peta";
  const properties = feature.properties as Record<string, unknown>;
  if (selected.kind === "population") return `Kepadatan ${String(properties.density_band || "tidak diketahui").replaceAll("_", " ")}`;
  return String(properties.label || properties.name || properties.id || "Objek peta");
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

function singleRoute(data: MapGeoJSON): LineString | null {
  const features = data.type === "FeatureCollection" ? data.features : [data];
  return features.length === 1 && features[0].geometry.type === "LineString"
    ? features[0].geometry
    : null;
}

function snapEndpoint(value: unknown): SnapEndpoint | null {
  if (!value || typeof value !== "object") return null;
  const endpoint = value as Partial<SnapEndpoint>;
  const validPosition = (position: unknown): position is Position => Array.isArray(position)
    && position.length === 2
    && position.every(Number.isFinite);
  return validPosition(endpoint.input) && validPosition(endpoint.snapped) && Number.isFinite(endpoint.distance_meters)
    ? endpoint as SnapEndpoint
    : null;
}

function normalizeSnapPreview(value: unknown): SnapPreview | null {
  if (!value || typeof value !== "object") return null;
  const preview = value as Partial<SnapPreview>;
  const start = snapEndpoint(preview.endpoints?.start);
  const end = snapEndpoint(preview.endpoints?.end);
  return isLineString(preview.route)
    && Number.isFinite(preview.distance_meters)
    && Number.isFinite(preview.duration_seconds)
    && preview.provider === "osrm"
    && start && end
    ? { ...preview, endpoints: { start, end } } as SnapPreview
    : null;
}

async function requestRoadPreview(route: LineString, signal: AbortSignal) {
  const response = await fetch("/api/route-snap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ route }),
    signal,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Rute belum dapat mengikuti jaringan jalan.");
  const preview = normalizeSnapPreview(payload);
  if (!preview) throw new Error("Layanan jalan mengembalikan geometri yang tidak valid.");
  return preview;
}

const {
  pushRouteHistory, addToast, setLoading, setRouteState, setError, setInsight,
  setAnalysis, saveCurrentToScenario, setInsightLoading, renameScenario,
  deleteScenario, setActiveTool, undo, redo, canUndo, canRedo, toggleLayer,
  switchScenario, createScenario, duplicateScenario, setContext, setMapNotice, addImportedDataset,
  toggleImportedDataset, removeImportedDataset, setSnapLoading, setSnapPreview,
} = useStore.getState();

export default function Workspace() {
  const {
    routeState, activeTool, route, context, analysis, insight, error, mapNotice,
    loading, insightLoading, layers, scenarios, activeScenarioId, pointCount,
    routeLengthKm, progressStep, importedDatasets, snapLoading, snapPreview,
  } = useStore(useShallow((state) => ({
    routeState: state.routeState,
    activeTool: state.activeTool,
    route: state.route,
    context: state.context,
    analysis: state.analysis,
    insight: state.insight,
    error: state.error,
    mapNotice: state.mapNotice,
    loading: state.loading,
    insightLoading: state.insightLoading,
    layers: state.layers,
    scenarios: state.scenarios,
    activeScenarioId: state.activeScenarioId,
    pointCount: state.pointCount,
    routeLengthKm: state.routeLengthKm,
    progressStep: state.progressStep,
    importedDatasets: state.importedDatasets,
    snapLoading: state.snapLoading,
    snapPreview: state.snapPreview,
  })));
  const analysisRequest = useRef<AbortController | null>(null);
  const insightRequest = useRef<AbortController | null>(null);
  const snapRequest = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState<"peta" | "perbandingan" | "hasil" | "laporan">("peta");
  const [sidebarMode, setSidebarMode] = useState<"layer" | "rute" | "halte">("layer");
  const [reportSubTab, setReportSubTab] = useState<"property" | "halte" | "layer">("property");
  const [floatingScenarioOpen, setFloatingScenarioOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [focusRequest, setFocusRequest] = useState<(SelectedFeature & { nonce: number }) | null>(null);
  const [datasetFitRequest, setDatasetFitRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const cancelRequests = useCallback(() => {
    analysisRequest.current?.abort();
    insightRequest.current?.abort();
    snapRequest.current?.abort();
    analysisRequest.current = null;
    insightRequest.current = null;
    snapRequest.current = null;
    useStore.setState({ loading: false, insightLoading: false, snapLoading: false, progressStep: 0 });
  }, []);

  const changeRoute = useCallback((nextRoute: LineString | null) => {
    cancelRequests();
    pushRouteHistory(nextRoute);
  }, [cancelRequests]);

  const analyze = useCallback(async (requestedRoute?: LineString) => {
    const nextRoute = requestedRoute || useStore.getState().route;
    if (!nextRoute) return;
    if (nextRoute.coordinates.length < 2) {
      addToast("Rute minimal 2 titik", "error");
      return;
    }
    if (useStore.getState().routeLengthKm < 0.01) {
      addToast("Rute terlalu pendek (min 10 m)", "error");
      return;
    }
    cancelRequests();
    const controller = new AbortController();
    analysisRequest.current = controller;
    useStore.setState({ progressStep: 0 });
    setLoading(true);
    setRouteState("analyzing");
    setError("");
    setInsight(null);
    let result: AnalysisResult;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ route: nextRoute }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analisis gagal dijalankan.");
      result = payload;
      setAnalysis(payload);
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Analisis gagal dijalankan.");
      setLoading(false);
      setRouteState("ready");
      return;
    }
    analysisRequest.current = null;
    setLoading(false);
    setRouteState("analyzed");
    saveCurrentToScenario();

    setInsightLoading(true);
    const insightController = new AbortController();
    insightRequest.current = insightController;
    try {
      const insightResponse = await fetch("/api/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
        signal: insightController.signal,
      });
      const narrative = await insightResponse.json();
      if (insightResponse.ok) setInsight(narrative);
    } catch {
    } finally {
      if (insightRequest.current === insightController) {
        insightRequest.current = null;
        setInsightLoading(false);
      }
    }
  }, [cancelRequests]);

  const applyRecommendation = useCallback(async () => {
    const recommended = analysis?.recommendation?.route_geojson;
    if (!recommended) return;
    cancelRequests();
    const controller = new AbortController();
    snapRequest.current = controller;
    setSnapLoading(true);
    let roadRoute: LineString;
    try {
      roadRoute = (await requestRoadPreview(recommended, controller.signal)).route;
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        addToast("Rekomendasi belum diterapkan karena jaringan jalan tidak menemukan rute yang sesuai.", "error");
      }
      return;
    } finally {
      if (snapRequest.current === controller) {
        snapRequest.current = null;
        setSnapLoading(false);
      }
    }
    changeRoute(roadRoute);
    addToast("Rekomendasi diterapkan. Mengevaluasi ulang...", "info");
    await analyze(roadRoute);
  }, [analysis, analyze, cancelRequests, changeRoute]);

  const loadDemo = useCallback(() => {
    changeRoute(demoRoute);
    addToast("Rute contoh Wates dimuat", "success");
  }, [changeRoute]);

  const snapToRoad = useCallback(async (requestedRoute?: LineString, automatic = false) => {
    const currentRoute = requestedRoute || useStore.getState().route;
    if (!currentRoute) return;
    cancelRequests();
    const controller = new AbortController();
    snapRequest.current = controller;
    setSnapLoading(true);
    try {
      const preview = await requestRoadPreview(currentRoute, controller.signal);
      setActiveTool("pan");
      setSnapPreview(preview);
      if (!automatic) addToast("Preview rute jalan siap diperiksa", "success");
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        addToast(
          automatic
            ? "Jaringan jalan tidak ditemukan; garis bebas tetap dipakai."
            : caught instanceof Error ? caught.message : "Layanan pencarian jalan tidak tersedia.",
          automatic ? "info" : "error",
        );
      }
    } finally {
      if (snapRequest.current === controller) {
        snapRequest.current = null;
        setSnapLoading(false);
      }
    }
  }, [cancelRequests]);

  const applySnapPreview = useCallback(() => {
    const preview = useStore.getState().snapPreview;
    if (!preview) return;
    changeRoute(preview.route);
    addToast("Rute jalan diterapkan", "success");
  }, [changeRoute]);

  const cancelSnapPreview = useCallback(() => setSnapPreview(null), []);

  const handleMapRouteChange = useCallback((nextRoute: LineString | null, source?: RouteChangeSource) => {
    changeRoute(nextRoute);
    if (nextRoute && source) void snapToRoad(nextRoute, true);
  }, [changeRoute, snapToRoad]);

  const importFile = useCallback(async (file: File) => {
    if (!/\.geojson$|\.json$/i.test(file.name)) throw new Error("Gunakan file .geojson atau .json.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10 MB.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error("File bukan JSON yang valid.");
    }
    if (parsed && typeof parsed === "object" && (parsed as { type?: string }).type === "FeatureCollection") {
      const features = (parsed as { features?: unknown }).features;
      if (Array.isArray(features) && features.length > 5000) throw new Error("FeatureCollection maksimal 5.000 fitur.");
    }
    const data = normalizeMapGeoJSON(parsed);
    if (!data) throw new Error("GeoJSON tidak valid atau berisi geometri yang belum didukung.");
    setSnapPreview(null);

    const importedRoute = singleRoute(data);
    if (importedRoute) {
      changeRoute(importedRoute);
      renameScenario(useStore.getState().activeScenarioId, file.name.replace(/\.(geo)?json$/i, ""));
      setActiveTool("pan");
      addToast(`Rute ${file.name} dimuat`, "success");
      return;
    }

    const id = `${file.name}-${file.lastModified}-${Date.now()}`;
    if (!addImportedDataset({ id, name: file.name, data, visible: true })) return;
    setDatasetFitRequest({ id, nonce: Date.now() });
    addToast(`Dataset ${file.name} ditampilkan`, "success");
  }, [changeRoute]);

  const importFirstFile = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      await importFile(file);
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : "Dataset gagal dimuat.", "error");
    }
  }, [importFile]);

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragActive(false);
    void importFirstFile(event.dataTransfer.files);
  }, [importFirstFile, setDragActive]);

  const handleFeatureSelect = useCallback((feature: SelectedFeature) => {
    setSelectedFeature(feature);
    setFocusRequest({ ...feature, nonce: Date.now() });
  }, [setFocusRequest, setSelectedFeature]);

  useEffect(() => cancelRequests, [cancelRequests]);

  useEffect(() => {
    if (!loading && routeState !== "analyzing") {
      useStore.setState({ progressStep: 0 });
      return;
    }
    const steps = 6;
    const tick = setInterval(() => {
      const current = useStore.getState().progressStep;
      if (current < steps) {
        useStore.setState({ progressStep: current + 1 });
      } else {
        clearInterval(tick);
      }
    }, 400);
    return () => clearInterval(tick);
  }, [loading, routeState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case "d": setActiveTool("draw"); break;
        case "e": if (useStore.getState().route) setActiveTool("edit"); break;
        case "escape":
          setActiveTool("pan");
          break;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function aiParagraphs(a: AnalysisResult): string[] {
    const b = a.baseline;
    const lines: string[] = [];
    const catchment = b.catchment_method === "network_isochrone"
      ? `isochrone berjalan kaki ${b.formula.walking_minutes} menit dari ${b.stop_count} halte`
      : `buffer ${b.formula.buffer_meters} m dari ${b.stop_count} halte`;
    lines.push(`Rute ini menjangkau ${b.population_covered.toLocaleString("id-ID")} warga dan ${b.facility_count} fasilitas publik melalui ${catchment}, dengan overlap rute existing ${b.overlap_pct}%.`);
    if (b.overlap_conflict) {
      lines.push(`Overlap ${b.overlap_pct}% melewati ambang konflik ${b.formula.overlap_conflict_threshold_pct}%. Prioritaskan koridor dengan tumpang tindih minimal.`);
    } else {
      lines.push(`Overlap ${b.overlap_pct}% masih dalam toleransi perencanaan.`);
    }
    if (a.recommendation) {
      lines.push(`Geser seluruh rute ${a.recommendation.distance_meters} m ke ${directionLabel[a.recommendation.direction]} untuk meningkatkan cakupan.`);
    }
    return lines;
  }

  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId) || scenarios[0];
  const selectedLabel = featureLabel(context, selectedFeature);
  const readiness = dataReadiness(context);
  const verifiedSourceCount = context?.sources.filter((source) => source.status === "verified").length || 0;
  const maxSnapEndpointShift = snapPreview
    ? Math.max(snapPreview.endpoints.start.distance_meters, snapPreview.endpoints.end.distance_meters)
    : 0;

  // Derivation of stops for report sub-tab
  const stopsList = analysis ? Array.from({ length: Math.min(6, analysis.baseline.stop_count) }, (_, i) => ({
    name: i === 0 ? "Halte Wates (Awal)" : i === 5 ? "Halte Sentolo (Akhir)" : `Halte Titik ${i + 1}`,
    dist: `KM ${(i * (analysis.baseline.route_length_km / 5)).toFixed(1)}`,
    status: "Terhubung",
  })) : [
    { name: "Halte Wates", dist: "KM 0.0", status: "Aktif" },
    { name: "Halte Nanggulan", dist: "KM 3.8", status: "Terhubung" },
    { name: "Halte Sentolo", dist: "KM 7.2", status: "Terhubung" },
    { name: "Halte Pengasih", dist: "KM 11.4", status: "Terhubung" },
    { name: "Halte YIA Bandara", dist: "KM 18.6", status: "Terminal" },
  ];

  const propertyList = context?.property_go.features.slice(0, 6) || [
    { properties: { label: "Property Go Wates", kategori: "Komersial", jenis: "Sewa" } },
    { properties: { label: "Saga Retail Wates", kategori: "Retail", jenis: "Jual" } },
    { properties: { label: "Grand Residence Sentolo", kategori: "Hunian", jenis: "Jual" } },
    { properties: { label: "Ruko Wates Tengah", kategori: "Komersial", jenis: "Sewa" } },
    { properties: { label: "Sentra Kuliner Pengasih", kategori: "Komersial", jenis: "Sewa" } },
  ];

  return (
    <main className="ws2-root">
      <ToastContainer />

      <header className="ws2-header">
        <div className="ws2-header-left">
          <Link href="/" className="ws2-logo" aria-label="Transight - Kembali ke beranda">
            <Image src="/dashboard/logo-icon.png" alt="" width={28} height={28} className="ws2-logo-icon" />
            <Image src="/dashboard/logo-dark.png" alt="Transight" width={110} height={26} className="ws2-logo-word" />
          </Link>
          <div className="ws2-header-divider" />
          <div className="ws2-breadcrumb">
            <Link href="/" className="ws2-crumb-main">Transight</Link><i>›</i>
            <Link href="/dashboard">Projects</Link><i>›</i>
            <Link href="/dashboard" className="ws2-crumb-project">Pengembangan Feeder YIA 2026</Link><i>›</i>
            <strong className="ws2-crumb-active">Skenario {activeScenario.name}</strong>
          </div>
        </div>
        <div className="ws2-header-actions">
          <span className="save-state"><i /> Unsaved</span>
          <Link href="/#method" className="header-link">Metodologi</Link>
          <button className="header-link" onClick={() => setActiveTab("laporan")}><FileText size={12} /> Report</button>
          <button className="header-link" disabled={!route} onClick={() => setShowExport(true)}><Download size={12} /> Ekspor</button>
          <button className="ws2-save-btn" onClick={() => { saveCurrentToScenario(); addToast("Skenario tersimpan", "success"); }}>
            <Check size={12} /> Simpan
          </button>
          <Link href="/dashboard" className="ws2-exit-btn" title="Keluar dari Workspace" aria-label="Keluar">
            <LogOut size={16} />
          </Link>
        </div>
      </header>

      <nav className="ws2-tabs" aria-label="View workspace">
        {([["peta", "Peta"], ["perbandingan", "Perbandingan"], ["hasil", "Hasil"], ["laporan", "Laporan"]] as const).map(([key, label]) => (
          <button
            key={key}
            className={`ws2-tab${activeTab === key ? " active" : ""}`}
            aria-pressed={activeTab === key}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="ws2-body">
        <aside className="ws2-sidebar">
          {/* Vertical Tabs Descending directly under Logo (Figma Frame 33) */}
          <div className="ws2-sidebar-nav-vertical">
            {activeTab === "laporan" ? (
              <>
                <button
                  type="button"
                  className={`ws2-side-nav-btn-vertical${reportSubTab === "property" ? " active" : ""}`}
                  onClick={() => setReportSubTab("property")}
                >
                  <MapPin size={16} />
                  <span>Property</span>
                </button>
                <button
                  type="button"
                  className={`ws2-side-nav-btn-vertical${reportSubTab === "halte" ? " active" : ""}`}
                  onClick={() => setReportSubTab("halte")}
                >
                  <RouteIcon size={16} />
                  <span>Halte</span>
                </button>
                <button
                  type="button"
                  className={`ws2-side-nav-btn-vertical${reportSubTab === "layer" ? " active" : ""}`}
                  onClick={() => setReportSubTab("layer")}
                >
                  <Layers size={16} />
                  <span>Layer</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`ws2-side-nav-btn-vertical${sidebarMode === "rute" ? " active" : ""}`}
                  onClick={() => setSidebarMode("rute")}
                >
                  <RouteIcon size={16} />
                  <span>Rute</span>
                </button>
                <button
                  type="button"
                  className={`ws2-side-nav-btn-vertical${sidebarMode === "halte" ? " active" : ""}`}
                  onClick={() => setSidebarMode("halte")}
                >
                  <MapPin size={16} />
                  <span>Halte</span>
                </button>
                <button
                  type="button"
                  className={`ws2-side-nav-btn-vertical${sidebarMode === "layer" ? " active" : ""}`}
                  onClick={() => setSidebarMode("layer")}
                >
                  <Layers size={16} />
                  <span>Layer</span>
                </button>
              </>
            )}
          </div>

          <div className="ws2-sidebar-divider" />

          {activeTab === "laporan" ? (
            <div className="panel-block">
              {reportSubTab === "property" && (
                <div className="ws2-report-sidebar-list">
                  <p className="ws2-sidebar-subhead">Daftar Property Terjangkau</p>
                  {propertyList.map((item, i) => {
                    const p = item.properties as Record<string, unknown>;
                    return (
                      <div key={i} className="ws2-sidebar-item">
                        <span className="ws2-item-dot" />
                        <div>
                          <strong>{String(p.label || p.name || `Property ${i+1}`)}</strong>
                          <small>{String(p.kategori || "Komersial")} · {String(p.jenis || "Sewa")}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {reportSubTab === "halte" && (
                <div className="ws2-report-sidebar-list">
                  <p className="ws2-sidebar-subhead">Daftar Halte Koridor</p>
                  {stopsList.map((item, i) => (
                    <div key={i} className="ws2-sidebar-item">
                      <span className="ws2-item-dot halte-dot" />
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.dist} · {item.status}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reportSubTab === "layer" && (
                <div className="panel-block">
                  <p className="panel-kicker">LAYER SPASIAL</p>
                  {([
                    { key: "routes", label: "Rute Eksisting" },
                    { key: "population", label: "Kepadatan Penduduk" },
                    { key: "facilities", label: "Fasilitas Publik" },
                    { key: "property", label: "Property Go" },
                  ] as const).map(({ key, label }) => (
                    <label key={key} className="layer-toggle ws2-layer-row">
                      <span><i className={`swatch ${key}-swatch`} /> {label}</span>
                      <div className="ws2-layer-ctrls">
                        <span className="ws2-kebab">⋮</span>
                        <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} />
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {sidebarMode === "layer" && (
                <>
                  <div className="panel-block">
                    <p className="panel-kicker">LAYER SPASIAL</p>
                    {([
                      { key: "routes", label: "Rute Eksisting" },
                      { key: "population", label: "Kepadatan Penduduk" },
                      { key: "facilities", label: "Fasilitas Publik" },
                      { key: "property", label: "Property Go" },
                    ] as const).map(({ key, label }) => (
                      <label key={key} className="layer-toggle ws2-layer-row">
                        <span><i className={`swatch ${key}-swatch`} /> {label}</span>
                        <div className="ws2-layer-ctrls">
                          <span className="ws2-kebab">⋮</span>
                          <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} />
                        </div>
                      </label>
                    ))}
                    <div className="layer-toggle ws2-layer-static ws2-layer-row">
                      <span><i className="swatch routes-swatch" /> Batas Administrasi</span>
                      <span className="ws2-kebab">⋮</span>
                    </div>
                    <div className="layer-toggle ws2-layer-disabled ws2-layer-row">
                      <span><i className="swatch routes-swatch" /> Daerah Rawan Banjir</span>
                      <div className="ws2-layer-ctrls">
                        <small>Belum tersedia</small>
                        <span className="ws2-kebab">⋮</span>
                      </div>
                    </div>
                  </div>

                  <div className="panel-block">
                    <p className="panel-kicker">LAYER ANALISIS</p>
                    {([
                      { key: "buffer", label: "Buffer layanan (500m)" },
                      { key: "stops", label: "Halte analisis" },
                      { key: "overlap", label: "Segmen overlap" },
                    ] as const).map(({ key, label }) => (
                      <label key={key} className="layer-toggle ws2-layer-row">
                        <span><i className={`swatch ${key}-swatch`} /> {label}</span>
                        <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} />
                      </label>
                    ))}
                  </div>

                  <div className="panel-block ws2-scenario-section">
                    <p className="panel-kicker">GANTI SKENARIO</p>
                    <div className="scenario-tabs ws2-scenario-list">
                      {scenarios.map((s) => (
                        <button
                          key={s.id}
                          className={`scenario-tab ${s.id === activeScenarioId ? "active" : ""}`}
                          aria-pressed={s.id === activeScenarioId}
                          onClick={() => {
                            cancelRequests();
                            switchScenario(s.id);
                          }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                    <div className="ws2-scenario-actions">
                      <button
                        type="button"
                        className="ws2-btn-create-scenario"
                        title="Buat skenario baru"
                        aria-label="Buat skenario baru"
                        onClick={() => createScenario()}
                      >
                        <Plus size={13} /> Buat skenario baru
                      </button>
                      <button
                        type="button"
                        className="ws2-btn-duplicate-scenario"
                        title="Duplikat skenario aktif"
                        aria-label="Duplikat"
                        onClick={() => duplicateScenario()}
                      >
                        <Copy size={13} /> Duplikat
                      </button>
                    </div>
                    <div className="route-name-row">
                      <input
                        className="route-name-input"
                        value={activeScenario.name}
                        onChange={(e) => renameScenario(activeScenarioId, e.target.value)}
                        placeholder="Nama skenario"
                        aria-label="Nama skenario"
                      />
                      <button
                        type="button"
                        className="route-delete-btn"
                        aria-label="Hapus skenario aktif"
                        title="Hapus skenario aktif"
                        disabled={scenarios.length === 1}
                        onClick={() => deleteScenario(activeScenarioId)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {analysis && (
                      <div className="ws2-scenario-score">
                        <div>
                          <strong>Skenario {activeScenario.name}</strong>
                          <small>Wates – YIA</small>
                        </div>
                        <b>Skor {Math.round(analysis.baseline.score)}/100</b>
                      </div>
                    )}
                  </div>
                </>
              )}

              {sidebarMode === "rute" && (
                <div className="panel-block">
                  <p className="panel-kicker">INFORMASI RUTE USULAN</p>
                  <div className="ws2-route-info-card">
                    <div className="ws2-route-info-row">
                      <span>Status</span>
                      <strong className="text-emerald-700">{route ? "Rute Aktif" : "Belum Digambar"}</strong>
                    </div>
                    <div className="ws2-route-info-row">
                      <span>Panjang Koridor</span>
                      <strong>{routeLengthKm.toLocaleString("id-ID")} km</strong>
                    </div>
                    <div className="ws2-route-info-row">
                      <span>Jumlah Titik Arah</span>
                      <strong>{pointCount} titik</strong>
                    </div>
                    <div className="ws2-route-info-row">
                      <span>Jaringan Jalan</span>
                      <strong className="text-teal-700">{snapPreview ? "Preview Jalan" : "OSRM Snapped"}</strong>
                    </div>
                  </div>

                  <p className="ws2-halte-note">
                    Gunakan tombol <b>Ikuti jalan</b> di toolbar peta untuk mencocokkan garis usulan ke jaringan jalan resmi.
                  </p>
                </div>
              )}

              {sidebarMode === "halte" && (
                <div className="panel-block">
                  <p className="panel-kicker">DAFTAR HALTE KORIDOR</p>
                  <div className="ws2-halte-list">
                    {stopsList.map((stop, i) => (
                      <div key={i} className="ws2-sidebar-item">
                        <span className="ws2-item-dot halte-dot" />
                        <div>
                          <strong>{stop.name}</strong>
                          <small>{stop.dist} · {stop.status}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="ws2-halte-note">
                    Halte ditempatkan pada jarak teratur 800 meter di sepanjang koridor rute dengan jangkauan jalan kaki 500 meter.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="panel-block dataset-block">
            <div className="panel-label">DATASET</div>
            <div className="dataset-source">
              <span><strong>Batas Kulon Progo</strong><small>OSM relation 5615252 · ODbL</small></span>
              <Check size={15} />
            </div>
            {importedDatasets.map((dataset) => (
              <div className={`dataset-source imported${dataset.visible ? "" : " is-hidden"}`} key={dataset.id}>
                <span><strong>{dataset.name}</strong><small>Layer GeoJSON lokal</small></span>
                <div className="dataset-actions">
                  <input
                    type="checkbox"
                    checked={dataset.visible}
                    aria-label={`Tampilkan ${dataset.name}`}
                    onChange={() => toggleImportedDataset(dataset.id)}
                  />
                  <button type="button" aria-label={`Hapus ${dataset.name}`} onClick={() => removeImportedDataset(dataset.id)}><X size={13} /></button>
                </div>
              </div>
            ))}
            <input
              ref={fileInput}
              className="dataset-input"
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              onChange={(event) => {
                void importFirstFile(event.target.files);
                event.target.value = "";
              }}
            />
            <button type="button" className="dataset-drop-button" onClick={() => fileInput.current?.click()}>
              <FileUp size={14} /> Pilih atau tarik GeoJSON
            </button>
            <p>Polygon menjadi overlay ({importedDatasets.length}/{MAX_IMPORTED_DATASETS}); satu LineString menjadi rute.</p>
          </div>

          <div className="panel-block data-readiness">
            <div className="panel-label">
              KESIAPAN DATA
              <span className={`readiness-badge ${readiness}`}>{sourceStatusLabel[readiness]}</span>
            </div>
            {context ? (
              <>
                <div className="source-readiness-list">
                  {context.sources.map((source) => (
                    <div key={source.source_key} title={`${source.provider} · ${source.limitation}`}>
                      <span>{source.dataset_name}</span>
                      <b className={source.status}>{sourceStatusLabel[source.status]}</b>
                    </div>
                  ))}
                  <div title="Target populasi per kilometer harus disetujui sebelum rilis publik.">
                    <span>Kalibrasi target skor</span>
                    <b className={context.methodology.target_calibration_status}>
                      {sourceStatusLabel[context.methodology.target_calibration_status]}
                    </b>
                  </div>
                </div>
                <p>{verifiedSourceCount}/{context.sources.length} sumber berstatus terverifikasi.</p>
              </>
            ) : (
              <p>Hubungkan Supabase untuk membaca provenance dan status validasi.</p>
            )}
          </div>
        </aside>

        <section className="ws2-main">
          <div className={`ws2-map-wrap${activeTab === "peta" ? "" : " ws2-hidden"}`}>
            <div className="ws2-map-tools">
              <div className="ws2-tools-row">
                <div className="ws2-tool-group">
                  {(["pan", "draw", "edit"] as const).map((tool) => (
                    <button
                      key={tool}
                      className={`tool-btn${activeTool === tool ? " active-tool" : ""}`}
                      disabled={tool === "edit" && !route}
                      onClick={() => setActiveTool(activeTool === tool ? "pan" : tool)}
                    >
                      {tool === "pan" ? <Hand size={14} /> : <Pencil size={14} />}
                      {toolLabels[tool]}
                    </button>
                  ))}
                </div>

                <div className="ws2-tool-divider" />

                <div className="ws2-tool-group">
                  <button className="tool-btn" onClick={() => undo()} disabled={!canUndo()} title="Undo">
                    <Undo2 size={14} /> Undo
                  </button>
                  <button className="tool-btn" onClick={() => redo()} disabled={!canRedo()} title="Redo">
                    <Redo2 size={14} /> Redo
                  </button>
                  <button className="tool-btn" disabled={!route} onClick={() => changeRoute(null)} title="Hapus rute">
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>

                <div className="ws2-tool-divider" />

                <div className="ws2-tool-group ws2-tool-group-right">
                  <button className="tool-btn snap-road-btn" disabled={!route || loading || snapLoading || Boolean(snapPreview)} onClick={() => void snapToRoad()}>
                    {snapLoading ? <LoaderCircle className="spin" size={14} /> : <RouteIcon size={14} />}
                    {snapLoading ? "Mencari jalan…" : "Ikuti jalan"}
                  </button>
                  <button className="tool-btn primary-btn" disabled={!route || loading || Boolean(snapPreview)} onClick={() => analyze()}>
                    {loading ? <LoaderCircle className="spin" size={14} /> : <Play size={14} fill="currentColor" />}
                    Evaluasi
                  </button>
                  <button className="tool-btn" onClick={loadDemo}>
                    <Play size={14} /> Load Demo Route
                  </button>
                </div>

                <div className="ws2-map-tools-meta">
                  <span className={`readiness-badge ${readiness}`}>{sourceStatusLabel[readiness]}</span>
                  {route && <span className="tool-hint">{pointCount} titik</span>}
                </div>
              </div>

              {activeTool === "draw" && (
                <p className="tool-hint">Klik titik arah, lalu klik dua kali untuk selesai. Rute otomatis dicocokkan ke jaringan jalan.</p>
              )}
              {activeTool === "edit" && (
                <p className="tool-hint">Tarik titik untuk mengubah bentuk. Setelah dilepas, rute otomatis dicocokkan kembali ke jalan.</p>
              )}
              {activeTool === "pan" && route && (
                <p className="tool-hint">Tarik garis untuk memindahkan rute. Setelah dilepas, rute otomatis dicocokkan kembali ke jalan.</p>
              )}
            </div>

            <section
              className={`map-canvas${dragActive ? " is-dragging" : ""}`}
              aria-label="Peta evaluasi transit"
              onDragEnter={(event) => {
                if (event.dataTransfer.types.includes("Files")) setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
              }}
              onDrop={handleDrop}
            >
              <TransitMap
                route={route}
                onRouteChange={handleMapRouteChange}
                context={context}
                onContext={setContext}
                onNotice={setMapNotice}
                analysis={analysis}
                layers={layers}
                selectedFeature={selectedFeature}
                onFeatureSelect={handleFeatureSelect}
                focusRequest={focusRequest}
                importedDatasets={importedDatasets}
                datasetFitRequest={datasetFitRequest}
                snapPreview={snapPreview}
              />
              {/* Floating Scenario Card on Map (Figma Desktop-6) */}
              <div className="ws2-floating-scenario">
                <div
                  className="ws2-floating-scenario-pill"
                  onClick={() => setFloatingScenarioOpen(!floatingScenarioOpen)}
                >
                  <div className="ws2-floating-scenario-left">
                    <span className="ws2-floating-kicker">
                      Ganti Skenario {floatingScenarioOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                    <strong>Skenario {activeScenario.name}</strong>
                    <small>Wates – YIA</small>
                  </div>
                  {analysis && (
                    <div className="ws2-floating-score">
                      <strong>Skor {Math.round(analysis.baseline.score)}/100</strong>
                    </div>
                  )}
                </div>

                {floatingScenarioOpen && (
                  <div className="ws2-floating-scenario-dropdown">
                    {scenarios.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`ws2-floating-scenario-item${s.id === activeScenarioId ? " active" : ""}`}
                        onClick={() => {
                          cancelRequests();
                          switchScenario(s.id);
                          setFloatingScenarioOpen(false);
                        }}
                      >
                        <span>Skenario {s.name}</span>
                        {s.id === activeScenarioId && <Check size={14} className="text-teal-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {dragActive && (
                <div className="map-drop-overlay" aria-hidden="true">
                  <span><FileUp size={24} /></span>
                  <strong>Lepaskan GeoJSON di peta</strong>
                  <small>Maksimal 10 MB</small>
                </div>
              )}
              {snapPreview && (
                <div className="snap-preview-bar" role="region" aria-label="Preview ikuti jalan">
                  <div className="snap-preview-copy">
                    <span>PREVIEW JARINGAN JALAN</span>
                    <strong>
                      {routeLengthKm.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                      <ChevronRight size={14} />
                      {(snapPreview.distance_meters / 1000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                    </strong>
                    {maxSnapEndpointShift > 150 && (
                      <small className="snap-preview-warning">
                        <CircleAlert size={13} /> Endpoint bergeser hingga {Math.round(maxSnapEndpointShift)} m; periksa koneksi rute.
                      </small>
                    )}
                  </div>
                  <div className="snap-preview-actions">
                    <button type="button" onClick={cancelSnapPreview}>Batalkan</button>
                    <button type="button" className="apply" onClick={applySnapPreview}><Check size={14} /> Terapkan</button>
                  </div>
                </div>
              )}
              <div className="map-legend-box">
                <span className="map-legend-title">Legenda</span>
                <div className="map-legend-items">
                  <span><i className={snapPreview ? "legend-preview-original" : "legend-current"} /> {snapPreview ? "Rute saat ini" : "Rute usulan"}</span>
                  {snapPreview && <span><i className="legend-snap-candidate" /> Kandidat jalan</span>}
                  <span><i className="legend-recommended" /> Rekomendasi</span>
                  <span><i className="legend-existing" /> Rute eksisting</span>
                  {analysis && <span><i className="legend-stop" /> Halte analisis</span>}
                  {importedDatasets.some((dataset) => dataset.visible) && <span><i className="legend-imported" /> Dataset impor</span>}
                </div>
              </div>
              {selectedFeature && (
                <div className="feature-inspector">
                  <div>
                    <span>OBJEK TERPILIH</span>
                    <strong>{selectedLabel}</strong>
                  </div>
                  <button type="button" aria-label="Tutup detail objek" onClick={() => setSelectedFeature(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
              {mapNotice && <div className="map-notice"><CircleAlert size={15} /> {mapNotice}</div>}
            </section>
          </div>

          {activeTab === "hasil" && (
            <div className="ws2-panel ws-tab-hasil-content">
              {!analysis && !loading && routeState !== "analyzing" && (
                <div className="empty-result">
                  <div className="empty-icon"><Image src="/dashboard/logo-icon.png" alt="" width={251} height={250} /></div>
                  <p className="panel-kicker">HASIL EVALUASI</p>
                  <h2>Belum ada rute yang dinilai.</h2>
                  <p>Gambar sebuah garis di peta, lalu pilih <b>Evaluasi</b> untuk melihat skor dan alternatif.</p>
                </div>
              )}

              {(loading || routeState === "analyzing") && (
                <div className="result-loading">
                  <LoaderCircle className="spin" size={28} />
                  <h2>Menganalisis konteks rute…</h2>
                  <div className="loading-steps">
                    {["Memvalidasi geometri rute", "Menyusun halte dan catchment", "Menghitung populasi dan POI", "Mendeteksi overlap existing", "Menguji 16 alternatif alignment", "Menyusun hasil evaluasi"].map((step, i) => {
                      const done = i < progressStep;
                      const active = i === progressStep;
                      return (
                        <div key={step} className={`loading-step${done ? " done" : active ? " active" : ""}`}>
                          <span>{done ? <Check size={10} /> : i + 1}</span>
                          {step}
                        </div>
                      );
                    })}
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
                <div className="result-content ws8-layout">
                  <div className="ws8-top-grid">
                    <div className="ws8-score-box">
                      <p className="ws8-box-label">Skor Keseluruhan</p>
                      <div className="ws8-score-hero">
                        <strong className="score-ring-ws"><strong>{Math.round(analysis.baseline.score)}</strong></strong>
                        <span>/100</span>
                      </div>
                      <span className="ws8-badge-status">{scoreLabel(analysis.baseline.score)}</span>
                      <p className="ws8-score-desc">
                        Evaluasi komposit aksesibilitas koridor Wates – YIA.
                      </p>
                      {readiness !== "verified" && (
                        <p className={`result-readiness ${readiness}`}>Data {sourceStatusLabel[readiness].toLowerCase()} · belum untuk keputusan publik</p>
                      )}
                    </div>

                    <div className="ws8-preview-box">
                      <Image
                        src="/workspace/preview-map-thumb.png"
                        alt="Preview map rute dan buffer"
                        width={392}
                        height={326}
                        className="ws8-thumb-img"
                      />
                    </div>
                  </div>

                  <div className="ws8-ai-card">
                    <div className="ws8-ai-head">
                      <Sparkles size={20} className="text-teal-600" />
                      <h3>AI Planning Insight</h3>
                    </div>
                    {insightLoading && <p className="ai-loading"><LoaderCircle className="spin" size={16} /> Menyusun insight terverifikasi…</p>}
                    {insight ? (
                      <div className="ws8-ai-body">
                        {insight.summary.split(". ").filter(Boolean).map((sentence, i) => (
                          <p key={i}>{sentence}.</p>
                        ))}
                        {insight.actions.length > 0 && (
                          <ul className="ws8-ai-bullets">
                            {insight.actions.map((action) => <li key={action}>{action}</li>)}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="ws8-ai-body">
                        {aiParagraphs(analysis).map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ws8-metrics-4grid">
                    <div className="ws8-metric-card metric-cell">
                      <div className="ws8-metric-icon"><Users size={22} /></div>
                      <div>
                        <span className="ws8-metric-label metric-label">Populasi Terjangkau</span>
                        <strong className="ws8-metric-val metric-value">{analysis.baseline.population_covered.toLocaleString("id-ID")} jiwa</strong>
                      </div>
                    </div>
                    <div className="ws8-metric-card metric-cell">
                      <div className="ws8-metric-icon"><Building2 size={22} /></div>
                      <div>
                        <span className="ws8-metric-label metric-label">Fasilitas Terjangkau</span>
                        <strong className="ws8-metric-val metric-value">{analysis.baseline.facility_count} unit</strong>
                      </div>
                    </div>
                    <div className="ws8-metric-card metric-cell">
                      <div className="ws8-metric-icon"><RouteIcon size={22} /></div>
                      <div>
                        <span className="ws8-metric-label metric-label">Panjang Rute</span>
                        <strong className="ws8-metric-val metric-value">{analysis.baseline.route_length_km.toLocaleString("id-ID")} km</strong>
                      </div>
                    </div>
                    <div className="ws8-metric-card metric-cell">
                      <div className="ws8-metric-icon"><Clock size={22} /></div>
                      <div>
                        <span className="ws8-metric-label metric-label">Estimasi Waktu</span>
                        <strong className="ws8-metric-val metric-value">{Math.max(12, Math.round(analysis.baseline.route_length_km * 2.3))} menit</strong>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Metrics & Breakdowns */}
                  <div className="ws8-submetrics-row">
                    <div className="metric-cell submetric-item">
                      <span className="metric-label">PROPERTY</span>
                      <b className="metric-value">{analysis.baseline.property_go_count}</b>
                    </div>
                    <div className="metric-cell submetric-item">
                      <span className="metric-label">OVERLAP</span>
                      <b className="metric-value">{analysis.baseline.overlap_pct}%</b>
                      {analysis.baseline.overlap_conflict && (
                        <span className="conflict-badge">
                          Konflik &gt;{analysis.baseline.formula.overlap_conflict_threshold_pct}%
                        </span>
                      )}
                    </div>
                    <div className="metric-cell submetric-item">
                      <span className="metric-label">POPULASI/KM</span>
                      <b className="metric-value">
                        {Math.round(analysis.baseline.population_per_km).toLocaleString("id-ID")}
                      </b>
                    </div>
                  </div>

                  {analysis.baseline.facilities_by_type.length > 0 && (
                    <div className="breakdown-block">
                      <p className="panel-kicker">FASILITAS TERJANGKAU</p>
                      <div className="facility-chips">
                        {analysis.baseline.facilities_by_type.map((item) => (
                          <span key={item.kategori} className="facility-chip">
                            {item.kategori.replace("_", " ")} <b>{item.count}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.baseline.population_by_area.length > 0 && (
                    <div className="breakdown-block">
                      <p className="panel-kicker">SKOR PER KECAMATAN</p>
                      <ul className="area-list">
                        {analysis.baseline.population_by_area.map((area) => (
                          <li key={area.admin_name}>
                            <span>
                              <strong>{area.admin_name}</strong>
                              <small>{area.coverage_pct}% penduduk · {area.facility_count} fasilitas</small>
                            </span>
                            <b>{Math.round(area.score)}/100</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.recommendation && (
                    <section className="recommendation-card">
                      <p className="panel-kicker">ALTERNATIF TERBAIK</p>
                      <h3>Geser {analysis.recommendation.distance_meters} m ke {directionLabel[analysis.recommendation.direction]}</h3>
                      <div className="delta-row">
                        <span>Skor <b>+{analysis.recommendation.score_delta}</b></span>
                        <span>Populasi/km <b>+{analysis.recommendation.population_per_km_delta.toLocaleString("id-ID")}</b></span>
                        <span>Fasilitas <b>{analysis.recommendation.facility_delta >= 0 ? "+" : ""}{analysis.recommendation.facility_delta}</b></span>
                      </div>
                      <p className="recommendation-note">Estimasi awal; hasil dihitung ulang setelah rute disesuaikan ke jaringan jalan.</p>
                      <button className="apply-button" disabled={snapLoading || Boolean(snapPreview)} onClick={applyRecommendation}>
                        {snapLoading ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                        {snapLoading ? "Menyesuaikan ke jalan…" : "Terapkan Rekomendasi"}
                      </button>
                    </section>
                  )}

                  <div className="action-row">
                    <button className="secondary-action" onClick={() => setActiveTab("perbandingan")} disabled={!analysis.recommendation}>
                      <GitCompare size={14} /> Bandingkan Rute
                    </button>
                    <button className="secondary-action" onClick={() => setShowExport(true)}><Download size={14} /> Ekspor Report</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "perbandingan" && (
            <div className="ws2-panel ws-tab-perbandingan-content">
              {analysis ? (
                <div className="ws7-compare-wrap">
                  <div className="ws7-cards-grid">
                    {/* Skenario A (Baseline) */}
                    <article className="ws7-compare-card">
                      <div className="ws7-card-head">
                        <div>
                          <p className="ws7-card-kicker">Skenario A</p>
                          <h3>{activeScenario.name}</h3>
                        </div>
                        <span className="ws7-score-pill">Skor {Math.round(analysis.baseline.score)}/100</span>
                      </div>
                      <div className="ws7-score-section">
                        <span className="ws7-score-label">Skor Keseluruhan</span>
                        <div className="ws7-score-row">
                          <strong className="ws7-score-number">{Math.round(analysis.baseline.score)}/100</strong>
                          <span className="ws7-status-badge">{scoreLabel(analysis.baseline.score)}</span>
                        </div>
                      </div>
                      <div className="ws7-ai-box">
                        <h4>AI Insight</h4>
                        <p>Rute ini memiliki akses yang sangat baik terhadap kepadatan penduduk di Wates dan sekitarnya. Evaluasi komparasi menunjukkan potensi perbaikan pada segmen berdensitas tinggi.</p>
                      </div>
                    </article>

                    {/* Skenario B / Rekomendasi */}
                    <article className="ws7-compare-card ws7-card-alt">
                      <div className="ws7-card-head">
                        <div>
                          <p className="ws7-card-kicker">{analysis.recommendation ? "Rekomendasi Optimal" : "Skenario Alternatif"}</p>
                          <h3>{analysis.recommendation ? `Geser ${analysis.recommendation.distance_meters} m ke ${directionLabel[analysis.recommendation.direction]}` : "Belum ada alternatif"}</h3>
                        </div>
                        <span className="ws7-score-pill">Skor {analysis.recommendation ? Math.round(analysis.recommendation.result.score) : Math.round(analysis.baseline.score)}/100</span>
                      </div>
                      <div className="ws7-score-section">
                        <span className="ws7-score-label">Skor Keseluruhan</span>
                        <div className="ws7-score-row">
                          <strong className="ws7-score-number">{analysis.recommendation ? Math.round(analysis.recommendation.result.score) : Math.round(analysis.baseline.score)}/100</strong>
                          <span className="ws7-status-badge">{scoreLabel(analysis.recommendation ? analysis.recommendation.result.score : analysis.baseline.score)}</span>
                        </div>
                      </div>
                      <div className="ws7-ai-box">
                        <h4>AI Insight</h4>
                        <p>{analysis.recommendation ? `Pergeseran koridor sebesar ${analysis.recommendation.distance_meters} m ke arah ${directionLabel[analysis.recommendation.direction]} meningkatkan skor sebesar +${analysis.recommendation.score_delta} poin.` : "Pilih alternatif untuk melihat perbandingan skor dan efisiensi rute."}</p>
                      </div>
                    </article>
                  </div>

                  {analysis.recommendation && (
                    <section className="comparison-section mt-8">
                      <p className="panel-kicker">TABEL PERBANDINGAN METRIK</p>
                      <h3>Skenario A vs Rekomendasi</h3>
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Metrik</th>
                            <th>Skenario A</th>
                            <th>Rekomendasi</th>
                            <th>Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Skor", base: analysis.baseline.score, rec: analysis.recommendation.result.score, unit: "", fmt: (v: number) => Math.round(v).toString() },
                            { label: "Populasi", base: analysis.baseline.population_covered, rec: analysis.recommendation.result.population_covered, unit: "jiwa", fmt: (v: number) => v.toLocaleString("id-ID") },
                            { label: "Overlap", base: analysis.baseline.overlap_pct, rec: analysis.recommendation.result.overlap_pct, unit: "%", fmt: (v: number) => `${v}%` },
                            { label: "Panjang", base: analysis.baseline.route_length_km, rec: analysis.recommendation.result.route_length_km, unit: "km", fmt: (v: number) => `${v.toLocaleString("id-ID")} km` },
                            { label: "Fasilitas", base: analysis.baseline.facility_count, rec: analysis.recommendation.result.facility_count, unit: "", fmt: (v: number) => v.toLocaleString("id-ID") },
                          ].map(({ label, base, rec, unit, fmt }) => {
                            const delta = rec - base;
                            const improvement = label === "Overlap" ? delta <= 0 : delta >= 0;
                            return (
                              <tr key={label}>
                                <td>{label}</td>
                                <td>{fmt(base)}</td>
                                <td>{fmt(rec)}</td>
                                <td className={improvement ? "delta-pos" : "delta-neg"}>
                                  {delta > 0 ? "+" : ""}{delta.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{unit ? ` ${unit}` : ""}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                  )}
                </div>
              ) : (
                <div className="empty-result">
                  <div className="empty-icon"><Image src="/dashboard/logo-icon.png" alt="" width={251} height={250} /></div>
                  <p className="panel-kicker">PERBANDINGAN RUTE</p>
                  <h2>Belum ada perbandingan.</h2>
                  <p>Evaluasi rute terlebih dahulu untuk membandingkan skenario dengan rekomendasi.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "laporan" && (
            <div className="ws2-panel ws-tab-laporan-content">
              {analysis ? (
                <div className="ws2-report">
                  <div className="result-heading">
                    <div>
                      <p className="panel-kicker">LAPORAN EVALUASI TRANSIT</p>
                      <h2>Pengembangan Feeder YIA 2026</h2>
                      <p className="result-method">Skenario {activeScenario.name} · Wates – YIA</p>
                    </div>
                    <span className="score-status"><i /> {scoreLabel(analysis.baseline.score)}</span>
                  </div>

                  <div className="ws2-report-summary">
                    <span><b>{Math.round(analysis.baseline.score)}/100</b> skor keseluruhan</span>
                    <span><b>{analysis.baseline.route_length_km.toLocaleString("id-ID")} km</b> panjang rute</span>
                    <span><b>{analysis.baseline.population_covered.toLocaleString("id-ID")}</b> populasi terjangkau</span>
                    <span><b>{analysis.baseline.facility_count}</b> fasilitas publik</span>
                  </div>

                  {/* Subview Data List: Property vs Halte */}
                  {reportSubTab === "property" ? (
                    <section className="ws2-report-section">
                      <p className="panel-kicker">DATA PROPERTY DALAM JANGKAUAN (DESKTOP - 9)</p>
                      <div className="ws9-property-grid">
                        {propertyList.map((item, i) => {
                          const p = item.properties as Record<string, unknown>;
                          return (
                            <div key={i} className="ws9-property-card">
                              <div className="ws9-prop-icon"><MapPin size={18} /></div>
                              <div>
                                <strong>{String(p.label || p.name || `Property ${i+1}`)}</strong>
                                <p>{String(p.kategori || "Komersial")} · {String(p.jenis || "Sewa")}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : (
                    <section className="ws2-report-section">
                      <p className="panel-kicker">DATA TITIK HALTE KORIDOR (DESKTOP - 10)</p>
                      <div className="ws10-halte-grid">
                        {stopsList.map((item, i) => (
                          <div key={i} className="ws10-halte-card">
                            <div className="ws10-halte-icon"><RouteIcon size={18} /></div>
                            <div>
                              <strong>{item.name}</strong>
                              <p>{item.dist} · Status: {item.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {analysis.baseline.facilities_by_type.length > 0 && (
                    <section className="ws2-report-section">
                      <p className="panel-kicker">FASILITAS TERJANGKAU</p>
                      <div className="facility-chips">
                        {analysis.baseline.facilities_by_type.map((item) => (
                          <span key={item.kategori} className="facility-chip">
                            {item.kategori.replace("_", " ")} <b>{item.count}</b>
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {analysis.baseline.population_by_area.length > 0 && (
                    <section className="ws2-report-section">
                      <p className="panel-kicker">CAKUPAN PER WILAYAH KECAMATAN</p>
                      <ul className="area-list">
                        {analysis.baseline.population_by_area.map((area) => (
                          <li key={area.admin_name}>
                            <span>
                              <strong>{area.admin_name}</strong>
                              <small>{area.coverage_pct}% penduduk · {area.facility_count} fasilitas</small>
                            </span>
                            <b>{Math.round(area.score)}/100</b>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="action-row mt-6">
                    <button className="secondary-action" onClick={() => setShowExport(true)}><Download size={14} /> Ekspor Report Lengkap</button>
                  </div>
                </div>
              ) : (
                <div className="empty-result">
                  <div className="empty-icon"><Image src="/dashboard/logo-icon.png" alt="" width={251} height={250} /></div>
                  <p className="panel-kicker">LAPORAN</p>
                  <h2>Belum ada laporan evaluasi.</h2>
                  <p>Evaluasi rute terlebih dahulu untuk menyusun laporan analisis terstruktur.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="workspace-status">
        <span>
          <i className={readiness === "verified" ? "online" : context ? "warning" : ""} />
          {context
            ? `Basemap siap · ${sourceStatusLabel[readiness]}`
            : "Basemap Kulon Progo siap · data analisis belum terhubung"}
        </span>
        <span className="workspace-status-details">
          {activeTool !== "pan" && (
            <span className="tool-indicator">{toolLabels[activeTool]}</span>
          )}
          {route && (
            <>
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
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="export-title">Ekspor hasil</h3>
            <p>Unduh geometri rute atau hasil evaluasi sebagai data yang dapat digunakan kembali.</p>
            <div className="modal-options">
              <button
                type="button"
                className="modal-option"
                onClick={() => {
                  if (!route) return;
                  download(`${fileName(activeScenario.name)}.geojson`, {
                    type: "Feature",
                    geometry: route,
                    properties: { name: activeScenario.name, crs: "EPSG:4326" },
                  });
                  addToast("GeoJSON diunduh", "success");
                  setShowExport(false);
                }}
              >
                <Download size={20} />
                <div>GeoJSON rute<small>Geometri LineString untuk GIS</small></div>
              </button>
              <button
                type="button"
                className="modal-option"
                disabled={!analysis}
                onClick={() => {
                  if (!route || !analysis) return;
                  download(`${fileName(activeScenario.name)}-hasil.json`, {
                    name: activeScenario.name,
                    route,
                    analysis,
                    insight,
                  });
                  addToast("Hasil analisis diunduh", "success");
                  setShowExport(false);
                }}
              >
                <FileText size={20} />
                <div>Hasil JSON<small>Metrik, rekomendasi, dan insight</small></div>
              </button>
            </div>
            <button className="modal-close" onClick={() => setShowExport(false)}>Tutup</button>
          </div>
        </div>
      )}
    </main>
  );
}
