import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isLineString, type AnalysisResult, type ImportedDataset, type Insight, type LineString, type MapContext, type SnapPreview } from "@/lib/types";

export type Tool = "pan" | "draw" | "edit";
export type RouteState = "idle" | "drawing" | "ready" | "analyzing" | "analyzed" | "editing";

export type Scenario = {
  id: string;
  name: string;
  route: LineString | null;
  analysis: AnalysisResult | null;
  insight: Insight | null;
};

export type Toast = {
  id: string;
  message: string;
  type: "info" | "success" | "error";
};

export type Store = {
  routeState: RouteState;
  activeTool: Tool;
  route: LineString | null;
  routeHistory: (LineString | null)[];
  historyIndex: number;
  context: MapContext | null;
  analysis: AnalysisResult | null;
  insight: Insight | null;
  error: string;
  mapNotice: string;
  loading: boolean;
  insightLoading: boolean;
  layers: { routes: boolean; population: boolean; property: boolean; facilities: boolean; buffer: boolean; stops: boolean; overlap: boolean };
  scenarios: Scenario[];
  activeScenarioId: string;
  toasts: Toast[];
  pointCount: number;
  routeLengthKm: number;
  progressStep: number;
  importedDatasets: ImportedDataset[];
  snapLoading: boolean;
  snapPreview: SnapPreview | null;

  setActiveTool: (tool: Tool) => void;
  setRouteState: (state: RouteState) => void;
  setRoute: (route: LineString | null) => void;
  pushRouteHistory: (route: LineString | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setContext: (context: MapContext) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  setInsight: (insight: Insight | null) => void;
  setError: (error: string) => void;
  setMapNotice: (notice: string) => void;
  setLoading: (loading: boolean) => void;
  setInsightLoading: (loading: boolean) => void;
  setSnapLoading: (loading: boolean) => void;
  setSnapPreview: (preview: SnapPreview | null) => void;
  toggleLayer: (layer: keyof Store["layers"]) => void;
  setLayers: (layers: Store["layers"]) => void;
  addImportedDataset: (dataset: ImportedDataset) => boolean;
  toggleImportedDataset: (id: string) => void;
  removeImportedDataset: (id: string) => void;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  updateMetrics: (route: LineString) => void;

  createScenario: (name?: string) => void;
  switchScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
  saveCurrentToScenario: () => void;

  resetWorkspace: () => void;
};

export const MAX_IMPORTED_DATASETS = 5;

const generateId = () => Math.random().toString(36).slice(2, 8);

function createScenario(name = "Rute Simulasi A"): Scenario {
  return { id: generateId(), name, route: null, analysis: null, insight: null };
}

const defaultScenarios: Scenario[] = [createScenario()];
const defaultLayers: Store["layers"] = {
  routes: true,
  population: true,
  property: true,
  facilities: true,
  buffer: true,
  stops: true,
  overlap: true,
};

function routeMetrics(route: LineString | null) {
  if (!route) return { pointCount: 0, routeLengthKm: 0 };
  let lengthKm = 0;
  for (let i = 1; i < route.coordinates.length; i++) {
    const [x1, y1] = route.coordinates[i - 1];
    const [x2, y2] = route.coordinates[i];
    const dx = (x2 - x1) * Math.PI / 180 * 6371 * Math.cos((y1 + y2) / 2 * Math.PI / 180);
    const dy = (y2 - y1) * Math.PI / 180 * 6371;
    lengthKm += Math.sqrt(dx * dx + dy * dy);
  }
  return { pointCount: route.coordinates.length, routeLengthKm: Math.round(lengthKm * 100) / 100 };
}

function isPersistedScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const scenario = value as Partial<Scenario>;
  return typeof scenario.id === "string"
    && typeof scenario.name === "string"
    && (scenario.route === null || isLineString(scenario.route));
}

function persistedLayers(value: unknown): Store["layers"] | null {
  if (!value || typeof value !== "object") return null;
  const layers = value as Partial<Store["layers"]>;
  return Object.keys(defaultLayers).every((key) => typeof layers[key as keyof Store["layers"]] === "boolean")
    ? layers as Store["layers"]
    : null;
}

export const useStore = create<Store>()(persist((set, get) => ({
  routeState: "idle",
  activeTool: "pan",
  route: null,
  routeHistory: [null],
  historyIndex: 0,
  context: null,
  analysis: null,
  insight: null,
  error: "",
  mapNotice: "",
  loading: false,
  insightLoading: false,
  layers: defaultLayers,
  scenarios: defaultScenarios,
  activeScenarioId: defaultScenarios[0].id,
  toasts: [],
  pointCount: 0,
  routeLengthKm: 0,
  progressStep: 0,
  importedDatasets: [],
  snapLoading: false,
  snapPreview: null,

  setActiveTool: (tool) => set({ activeTool: tool, ...(tool === "pan" ? {} : { snapPreview: null }) }),
  setRouteState: (state) => set({ routeState: state }),

  setRoute: (route) => {
    set({
      route,
      routeState: route ? "ready" : "idle",
      analysis: null,
      insight: null,
      error: "",
      snapPreview: null,
      ...routeMetrics(route),
    });
  },

  pushRouteHistory: (route) => {
    const { routeHistory, historyIndex } = get();
    const trimmed = routeHistory.slice(0, historyIndex + 1);
    trimmed.push(route);
    if (trimmed.length > 50) trimmed.shift();
    set({
      routeHistory: trimmed,
      historyIndex: trimmed.length - 1,
      route,
      routeState: route ? "ready" : "idle",
      analysis: null,
      insight: null,
      error: "",
      snapPreview: null,
      ...routeMetrics(route),
    });
  },

  undo: () => {
    const { historyIndex, routeHistory } = get();
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const route = routeHistory[newIdx];
      set({ historyIndex: newIdx, route, routeState: route ? "ready" : "idle", analysis: null, insight: null, error: "", snapPreview: null, ...routeMetrics(route) });
    }
  },

  redo: () => {
    const { historyIndex, routeHistory } = get();
    if (historyIndex < routeHistory.length - 1) {
      const newIdx = historyIndex + 1;
      const route = routeHistory[newIdx];
      set({ historyIndex: newIdx, route, routeState: route ? "ready" : "idle", analysis: null, insight: null, error: "", snapPreview: null, ...routeMetrics(route) });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().routeHistory.length - 1,

  setContext: (context) => set({ context }),
  setAnalysis: (analysis) => set({ analysis }),
  setInsight: (insight) => set({ insight }),
  setError: (error) => set({ error }),
  setMapNotice: (notice) => set({ mapNotice: notice }),
  setLoading: (loading) => set({ loading }),
  setInsightLoading: (loading) => set({ insightLoading: loading }),
  setSnapLoading: (snapLoading) => set({ snapLoading }),
  setSnapPreview: (snapPreview) => set({ snapPreview }),
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  setLayers: (layers) => set({ layers }),
  addImportedDataset: (dataset) => {
    if (get().importedDatasets.length >= MAX_IMPORTED_DATASETS) {
      get().addToast(`Maksimal ${MAX_IMPORTED_DATASETS} layer GeoJSON lokal.`, "error");
      return false;
    }
    set((state) => ({ importedDatasets: [...state.importedDatasets, dataset] }));
    return true;
  },
  toggleImportedDataset: (id) => set((state) => ({
    importedDatasets: state.importedDatasets.map((dataset) => (
      dataset.id === id ? { ...dataset, visible: !dataset.visible } : dataset
    )),
  })),
  removeImportedDataset: (id) => set((state) => ({
    importedDatasets: state.importedDatasets.filter((dataset) => dataset.id !== id),
  })),

  addToast: (message, type = "info") => {
    const id = generateId();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  updateMetrics: (route) => {
    set(routeMetrics(route));
  },

  createScenario: (name) => {
    const { scenarios, activeScenarioId, route, analysis, insight } = get();
    const scenario = createScenario(name || `Rute Simulasi ${String.fromCharCode(65 + scenarios.length)}`);
    set({
      scenarios: [
        ...scenarios.map((item) => item.id === activeScenarioId ? { ...item, route, analysis, insight } : item),
        scenario,
      ],
      activeScenarioId: scenario.id,
      route: null,
      routeHistory: [null],
      historyIndex: 0,
      analysis: null,
      insight: null,
      error: "",
      routeState: "idle",
      activeTool: "pan",
      snapPreview: null,
      ...routeMetrics(null),
    });
    get().addToast(`Skenario "${scenario.name}" dibuat`, "success");
  },

  switchScenario: (id) => {
    const { scenarios, activeScenarioId, route, analysis, insight } = get();
    if (id === activeScenarioId) return;
    const next = scenarios.find((s) => s.id === id);
    if (!next) return;

    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === activeScenarioId ? { ...sc, route, analysis, insight } : sc
      ),
      route: next.route,
      analysis: next.analysis,
      insight: next.insight,
      activeScenarioId: id,
      routeHistory: [next.route],
      historyIndex: 0,
      error: "",
      routeState: next.route ? "ready" : "idle",
      activeTool: "pan",
      snapPreview: null,
      ...routeMetrics(next.route),
    }));
  },

  renameScenario: (id, name) => {
    set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, name } : sc)) }));
  },

  deleteScenario: (id) => {
    const { scenarios, activeScenarioId } = get();
    if (scenarios.length <= 1) {
      get().addToast("Minimal satu scenario harus ada", "error");
      return;
    }
    const filtered = scenarios.filter((s) => s.id !== id);
    let newActive = activeScenarioId;
    if (id === activeScenarioId) {
      newActive = filtered[0].id;
    }
    const next = filtered.find((s) => s.id === newActive) || filtered[0];
    set({
      scenarios: filtered,
      activeScenarioId: newActive,
      route: next.route,
      analysis: next.analysis,
      insight: next.insight,
      routeState: next.route ? "ready" : "idle",
      routeHistory: [next.route],
      historyIndex: 0,
      activeTool: "pan",
      snapPreview: null,
      ...routeMetrics(next.route),
    });
    get().addToast("Skenario dihapus", "info");
  },

  saveCurrentToScenario: () => {
    const { activeScenarioId, route, analysis, insight } = get();
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === activeScenarioId ? { ...sc, route, analysis, insight } : sc
      ),
    }));
  },

  resetWorkspace: () => {
    const fresh = createScenario();
    set({
      routeState: "idle",
      activeTool: "pan",
      route: null,
      routeHistory: [null],
      historyIndex: 0,
      analysis: null,
      insight: null,
      error: "",
      mapNotice: "",
      loading: false,
      insightLoading: false,
      snapLoading: false,
      snapPreview: null,
      scenarios: [fresh],
      activeScenarioId: fresh.id,
      importedDatasets: [],
      ...routeMetrics(null),
    });
  },
}), {
  name: "transight-workspace",
  version: 1,
  partialize: (state) => ({
    layers: state.layers,
    activeScenarioId: state.activeScenarioId,
    scenarios: state.scenarios.map((scenario) => ({
      ...scenario,
      route: scenario.id === state.activeScenarioId ? state.route : scenario.route,
      analysis: null,
      insight: null,
    })),
  }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<Store>;
    const scenarios = Array.isArray(saved.scenarios)
      ? saved.scenarios.filter(isPersistedScenario).map((scenario) => ({ ...scenario, analysis: null, insight: null }))
      : [];
    if (!scenarios.length) return current;
    const activeScenarioId = scenarios.some((scenario) => scenario.id === saved.activeScenarioId)
      ? saved.activeScenarioId as string
      : scenarios[0].id;
    const route = scenarios.find((scenario) => scenario.id === activeScenarioId)?.route || null;
    return {
      ...current,
      layers: persistedLayers(saved.layers) || current.layers,
      scenarios,
      activeScenarioId,
      route,
      routeHistory: [route],
      historyIndex: 0,
      routeState: route ? "ready" : "idle",
      ...routeMetrics(route),
    };
  },
}));
