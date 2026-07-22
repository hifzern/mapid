import { create } from "zustand";
import type { AnalysisResult, Insight, LineString, MapContext } from "@/lib/types";

export type Tool = "select" | "pan" | "draw" | "edit";
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

export type AppSettings = {
  bufferRadius: number;
  priority: "balanced" | "coverage" | "overlap" | "residential";
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
  layers: { routes: boolean; population: boolean; property: boolean; facilities: boolean; buffer: boolean };
  scenarios: Scenario[];
  activeScenarioId: string;
  toasts: Toast[];
  settings: AppSettings;
  pointCount: number;
  routeLengthKm: number;
  routeName: string;
progressStep: number;

  setActiveTool: (tool: Tool) => void;
  setRouteState: (state: RouteState) => void;
  setRouteName: (name: string) => void;
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
  toggleLayer: (layer: keyof Store["layers"]) => void;
  setLayers: (layers: Store["layers"]) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  updateMetrics: (route: LineString) => void;

  createScenario: (name?: string) => void;
  switchScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  duplicateScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  saveCurrentToScenario: () => void;

  resetWorkspace: () => void;
};

const generateId = () => Math.random().toString(36).slice(2, 8);

function createScenario(name = "Rute Simulasi A"): Scenario {
  return { id: generateId(), name, route: null, analysis: null, insight: null };
}

const defaultScenarios: Scenario[] = [createScenario()];

export const useStore = create<Store>((set, get) => ({
  routeState: "idle",
  activeTool: "select",
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
  layers: { routes: true, population: true, property: true, facilities: true, buffer: true },
  scenarios: defaultScenarios,
  activeScenarioId: defaultScenarios[0].id,
  toasts: [],
  settings: { bufferRadius: 500, priority: "balanced" },
  pointCount: 0,
  routeLengthKm: 0,
  routeName: "Rute Simulasi",
progressStep: 0,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setRouteState: (state) => set({ routeState: state }),
  setRouteName: (name) => set({ routeName: name }),

  setRoute: (route) => {
    set({ route, routeState: route ? "ready" : "idle", analysis: null, insight: null, error: "" });
    if (route) get().updateMetrics(route);
  },

  pushRouteHistory: (route) => {
    const { routeHistory, historyIndex } = get();
    const trimmed = routeHistory.slice(0, historyIndex + 1);
    trimmed.push(route);
    if (trimmed.length > 50) trimmed.shift();
    set({ routeHistory: trimmed, historyIndex: trimmed.length - 1, route, routeState: route ? "ready" : "idle", analysis: null, insight: null, error: "" });
    if (route) get().updateMetrics(route);
  },

  undo: () => {
    const { historyIndex, routeHistory } = get();
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const route = routeHistory[newIdx];
      set({ historyIndex: newIdx, route, routeState: route ? "ready" : "idle", analysis: null, insight: null, error: "" });
      if (route) get().updateMetrics(route);
    }
  },

  redo: () => {
    const { historyIndex, routeHistory } = get();
    if (historyIndex < routeHistory.length - 1) {
      const newIdx = historyIndex + 1;
      const route = routeHistory[newIdx];
      set({ historyIndex: newIdx, route, routeState: route ? "ready" : "idle", analysis: null, insight: null, error: "" });
      if (route) get().updateMetrics(route);
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
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  setLayers: (layers) => set({ layers }),
  setSettings: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),

  addToast: (message, type = "info") => {
    const id = generateId();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  updateMetrics: (route) => {
    if (!route) return { pointCount: 0, routeLengthKm: 0 };
    const coords = route.coordinates;
    let lengthKm = 0;
    for (let i = 1; i < coords.length; i++) {
      const [x1, y1] = coords[i - 1];
      const [x2, y2] = coords[i];
      const dx = (x2 - x1) * Math.PI / 180 * 6371 * Math.cos((y1 + y2) / 2 * Math.PI / 180);
      const dy = (y2 - y1) * Math.PI / 180 * 6371;
      lengthKm += Math.sqrt(dx * dx + dy * dy);
    }
    set({ pointCount: coords.length, routeLengthKm: Math.round(lengthKm * 100) / 100 });
  },

  createScenario: (name) => {
    const s = createScenario(name);
    set((state) => ({ scenarios: [...state.scenarios, s], activeScenarioId: s.id }));
    get().addToast(`Scenario "${s.name}" dibuat`, "success");
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
      error: "",
      routeState: next.route ? "ready" : "idle",
    }));
    if (next.route) get().updateMetrics(next.route);
  },

  renameScenario: (id, name) => {
    set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, name } : sc)) }));
  },

  duplicateScenario: (id) => {
    const { scenarios } = get();
    const original = scenarios.find((s) => s.id === id);
    if (!original) return;
    const dup: Scenario = {
      ...original,
      id: generateId(),
      name: `${original.name} (copy)`,
    };
    set((s) => ({ scenarios: [...s.scenarios, dup], activeScenarioId: dup.id }));
    get().addToast(`Scenario "${dup.name}" dibuat`, "success");
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
    });
    if (next.route) get().updateMetrics(next.route);
    get().addToast("Scenario dihapus", "info");
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
      activeTool: "select",
      route: null,
      routeHistory: [null],
      historyIndex: 0,
      analysis: null,
      insight: null,
      error: "",
      mapNotice: "",
      loading: false,
      insightLoading: false,
      scenarios: [fresh],
      activeScenarioId: fresh.id,
      pointCount: 0,
      routeLengthKm: 0,
    });
  },
}));
