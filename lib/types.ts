export type Position = [number, number];
export type RouteChangeSource = "draw" | "edit" | "drag";

export type LineString = {
  type: "LineString";
  coordinates: Position[];
};

export type Geometry =
  | LineString
  | { type: "MultiLineString"; coordinates: Position[][] }
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

export type MapGeoJSON = Feature | FeatureCollection;

export type ImportedDataset = {
  id: string;
  name: string;
  data: MapGeoJSON;
  visible: boolean;
};

export type SnapEndpoint = {
  input: Position;
  snapped: Position;
  distance_meters: number;
};

export type SnapPreview = {
  route: LineString;
  distance_meters: number;
  duration_seconds: number;
  provider: "osrm";
  endpoints: { start: SnapEndpoint; end: SnapEndpoint };
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

export type ExistingRouteProperties = {
  id: string;
  name: string;
  route_type: string;
};

export type PopulationProperties = {
  id: string;
  density_band: string;
};

export type PublicPointProperties = {
  id: string;
  kategori: string;
  label: string;
};

export type MapFeatureKind = "existing_route" | "population" | "property_go" | "public_facility";

export type SelectedFeature = {
  kind: MapFeatureKind;
  id: string;
};

export type SourceStatus = "demo" | "provisional" | "verified" | "unavailable";

export type SourceMetadata = {
  source_key: string;
  dataset_name: string;
  provider: string;
  license: string;
  update_date: string | null;
  status: SourceStatus;
  limitation: string;
};

export type MethodologyMetadata = {
  buffer_meters: number;
  overlap_tolerance_meters: number;
  population_weight: number;
  overlap_weight: number;
  population_assumption: string;
  target_calibration_status: SourceStatus;
};

export type MapContext = {
  study_area: Feature<{ name: string }>;
  existing_routes: FeatureCollection<ExistingRouteProperties>;
  population: FeatureCollection<PopulationProperties>;
  property_go: FeatureCollection<PublicPointProperties>;
  public_facilities: FeatureCollection<PublicPointProperties>;
  sources: SourceMetadata[];
  methodology: MethodologyMetadata;
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

function isPosition(value: unknown): value is Position {
  return Array.isArray(value)
    && value.length === 2
    && value.every(Number.isFinite)
    && value[0] >= -180 && value[0] <= 180
    && value[1] >= -90 && value[1] <= 90;
}

function isLine(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length >= 2 && value.every(isPosition);
}

function isGeometry(value: unknown): value is Geometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: string; coordinates?: unknown };
  if (geometry.type === "Point") return isPosition(geometry.coordinates);
  if (geometry.type === "LineString") return isLine(geometry.coordinates);
  if (geometry.type === "MultiLineString") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(isLine);
  }
  if (geometry.type === "Polygon") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0
      && geometry.coordinates.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition));
  }
  if (geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0
      && geometry.coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0
        && polygon.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition)));
  }
  return false;
}

function normalizeFeature(value: unknown): Feature | null {
  if (!value || typeof value !== "object") return null;
  const feature = value as { type?: string; geometry?: unknown; properties?: unknown };
  if (feature.type !== "Feature" || !isGeometry(feature.geometry)) return null;
  if (feature.properties !== null && (typeof feature.properties !== "object" || Array.isArray(feature.properties))) return null;
  return { type: "Feature", geometry: feature.geometry, properties: (feature.properties || {}) as Record<string, unknown> };
}

export function normalizeMapGeoJSON(value: unknown): MapGeoJSON | null {
  const geometry = isGeometry(value) ? value : null;
  if (geometry) return { type: "Feature", geometry, properties: {} };

  const feature = normalizeFeature(value);
  if (feature) return feature;

  if (!value || typeof value !== "object") return null;
  const collection = value as { type?: string; features?: unknown };
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)
    || collection.features.length === 0 || collection.features.length > 5000) return null;
  const features = collection.features.map(normalizeFeature);
  if (features.some((item) => !item)) return null;
  return { type: "FeatureCollection", features: features as Feature[] };
}
