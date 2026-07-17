export type Position = [number, number];

export type LineString = {
  type: "LineString";
  coordinates: Position[];
};

export type Geometry =
  | LineString
  | { type: "Point"; coordinates: Position }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

export type Feature<P = Record<string, unknown>> = {
  type: "Feature";
  geometry: Geometry;
  properties: P;
};

export type FeatureCollection<P = Record<string, unknown>> = {
  type: "FeatureCollection";
  features: Feature<P>[];
};

export type RouteScore = {
  score: number;
  route_length_km: number;
  population_covered: number;
  population_per_km: number;
  population_per_km_target: number;
  population_score: number;
  overlap_pct: number;
  overlap_score: number;
  property_go_count: number;
  buffer_geojson: Geometry;
  formula: {
    buffer_meters: number;
    overlap_tolerance_meters: number;
    population_weight: number;
    overlap_weight: number;
    population_assumption: string;
  };
};

export type Recommendation = {
  direction: "north" | "south" | "east" | "west";
  distance_meters: number;
  route_geojson: LineString;
  score_delta: number;
  population_delta: number;
  population_per_km_delta: number;
  result: RouteScore;
};

export type AnalysisResult = {
  baseline: RouteScore;
  recommendation: Recommendation | null;
};

export type MapContext = {
  study_area: Feature<{ name: string }>;
  existing_routes: FeatureCollection<{ name: string; route_type: string }>;
  population: FeatureCollection<{ density_band: string }>;
  property_go: FeatureCollection<{ kategori: string }>;
  public_facilities: FeatureCollection<{ kategori: string }>;
  truncated: {
    existing_routes: boolean;
    population: boolean;
    property_go: boolean;
    public_facilities: boolean;
  };
};

export type Insight = {
  summary: string;
  actions: string[];
  source: "ai" | "template";
};

export function isLineString(value: unknown): value is LineString {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<LineString>;
  return route.type === "LineString"
    && Array.isArray(route.coordinates)
    && route.coordinates.length >= 2
    && route.coordinates.length <= 2000
    && route.coordinates.every(
      (point) => Array.isArray(point)
        && point.length === 2
        && point.every(Number.isFinite),
    );
}
