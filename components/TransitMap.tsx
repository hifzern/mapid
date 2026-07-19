"use client";

import L from "leaflet";
import "leaflet-draw";
import { useEffect, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type {
  AnalysisResult,
  Feature,
  LineString,
  MapContext,
  MapFeatureKind,
  SelectedFeature,
} from "@/lib/types";

type LayerVisibility = {
  routes: boolean;
  population: boolean;
  property: boolean;
  facilities: boolean;
  buffer: boolean;
};

type FocusRequest = SelectedFeature & { nonce: number };

type Props = {
  route: LineString | null;
  onRouteChange: (route: LineString | null) => void;
  context: MapContext | null;
  onContext: (context: MapContext) => void;
  onNotice: (notice: string) => void;
  analysis: AnalysisResult | null;
  layers: LayerVisibility;
  selectedFeature: SelectedFeature | null;
  onFeatureSelect: (feature: SelectedFeature) => void;
  focusRequest: FocusRequest | null;
};

const densityColors: Record<string, string> = {
  very_low: "#ccfbf1",
  low: "#99f6e4",
  medium: "#5eead4",
  high: "#2dd4bf",
  very_high: "#0f766e",
};

const densityLabels: Record<string, string> = {
  very_low: "Sangat rendah",
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  very_high: "Sangat tinggi",
};

function DrawingControl({ route, onRouteChange }: Pick<Props, "route" | "onRouteChange">) {
  const map = useMap();
  const group = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const featureGroup = new L.FeatureGroup().addTo(map);
    group.current = featureGroup;
    const control = new L.Control.Draw({
      position: "topright",
      draw: {
        polyline: { shapeOptions: { color: "#2563eb", weight: 5 } },
        polygon: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup, remove: true },
    });
    map.addControl(control);

    const emitRoute = () => {
      const layer = featureGroup.getLayers()[0] as L.Polyline | undefined;
      if (!layer) return onRouteChange(null);
      const geometry = layer.toGeoJSON().geometry;
      if (geometry.type === "LineString") onRouteChange(geometry as LineString);
    };
    const created: L.LeafletEventHandlerFn = (event) => {
      const drawEvent = event as L.DrawEvents.Created;
      featureGroup.clearLayers();
      featureGroup.addLayer(drawEvent.layer);
      emitRoute();
    };
    map.on(L.Draw.Event.CREATED, created);
    map.on(L.Draw.Event.EDITED, emitRoute);
    map.on(L.Draw.Event.DELETED, emitRoute);

    return () => {
      map.off(L.Draw.Event.CREATED, created);
      map.off(L.Draw.Event.EDITED, emitRoute);
      map.off(L.Draw.Event.DELETED, emitRoute);
      map.removeControl(control);
      map.removeLayer(featureGroup);
    };
  }, [map, onRouteChange]);

  useEffect(() => {
    const featureGroup = group.current;
    if (!featureGroup) return;
    const existing = featureGroup.getLayers()[0] as L.Polyline | undefined;
    const current = existing?.toGeoJSON().geometry;
    if (route && current?.type === "LineString"
      && JSON.stringify(current.coordinates) === JSON.stringify(route.coordinates)) return;
    featureGroup.clearLayers();
    if (route) featureGroup.addLayer(L.geoJSON(route, { style: { color: "#2563eb", weight: 5 } }));
  }, [route]);

  return null;
}

function MapToolbar({ route, context }: Pick<Props, "route" | "context">) {
  const map = useMap();

  function fit() {
    const geometry = route || context?.study_area;
    if (!geometry) return;
    const bounds = L.geoJSON(geometry as never).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }

  return (
    <div className="map-toolbar leaflet-control" role="group" aria-label="Kontrol tampilan peta">
      <button type="button" title="Perbesar" aria-label="Perbesar" onClick={() => map.zoomIn()}>+</button>
      <button type="button" title="Perkecil" aria-label="Perkecil" onClick={() => map.zoomOut()}>−</button>
      <button type="button" title="Sesuaikan tampilan" aria-label="Sesuaikan tampilan" onClick={fit} disabled={!route && !context}>Fit</button>
    </div>
  );
}

function ContextLoader({ onContext, onNotice }: Pick<Props, "onContext" | "onNotice">) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
      try {
        const response = await fetch(`/api/map-context?bbox=${bbox}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Layer peta gagal dimuat.");
        onContext(result);
        const truncated = Object.values(result.truncated as Record<string, boolean>).some(Boolean);
        onNotice(truncated ? "Sebagian data pada viewport dibatasi hingga 5.000 objek per layer." : "");
        if (!fitted.current && result.study_area?.geometry) {
          map.fitBounds(L.geoJSON(result.study_area).getBounds(), { padding: [28, 28] });
          fitted.current = true;
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") onNotice((error as Error).message);
      }
    };
    void load();
    map.on("moveend", load);
    return () => {
      controller?.abort();
      map.off("moveend", load);
    };
  }, [map, onContext, onNotice]);

  return null;
}

function findFeature(context: MapContext, selected: SelectedFeature): Feature | undefined {
  const collections = {
    existing_route: context.existing_routes,
    population: context.population,
    property_go: context.property_go,
    public_facility: context.public_facilities,
  };
  return collections[selected.kind].features.find((feature) => feature.properties.id === selected.id) as Feature | undefined;
}

function MapFocus({ context, focusRequest }: Pick<Props, "context" | "focusRequest">) {
  const map = useMap();

  useEffect(() => {
    if (!context || !focusRequest) return;
    const feature = findFeature(context, focusRequest);
    if (!feature) return;
    if (feature.geometry.type === "Point") {
      map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], Math.max(map.getZoom(), 16));
      return;
    }
    const bounds = L.geoJSON(feature as never).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16 });
  }, [context, focusRequest, map]);

  return null;
}

function featureEvents(
  kind: MapFeatureKind,
  onFeatureSelect: Props["onFeatureSelect"],
  tooltip: (feature: Feature) => string,
) {
  return (rawFeature: GeoJSON.Feature, layer: L.Layer) => {
    const feature = rawFeature as unknown as Feature<{ id: string }>;
    layer.bindTooltip(tooltip(feature), { sticky: true, direction: "top" });
    layer.on("click", () => onFeatureSelect({ kind, id: feature.properties.id }));
  };
}

export default function TransitMap(props: Props) {
  const tileUrl = process.env.NEXT_PUBLIC_MAPID_TILE_URL;
  const selected = (kind: MapFeatureKind, id: string) => (
    props.selectedFeature?.kind === kind && props.selectedFeature.id === id
  );
  const selectionKey = props.selectedFeature ? `${props.selectedFeature.kind}-${props.selectedFeature.id}` : "none";

  return (
    <MapContainer center={[-2.5, 118]} zoom={5} minZoom={4} className="leaflet-map" zoomControl={false}>
      {tileUrl && (
        <TileLayer
          url={tileUrl}
          attribution={process.env.NEXT_PUBLIC_MAPID_ATTRIBUTION || "MAPID MAPS"}
        />
      )}
      <ContextLoader onContext={props.onContext} onNotice={props.onNotice} />
      <MapToolbar route={props.route} context={props.context} />
      <MapFocus context={props.context} focusRequest={props.focusRequest} />
      <DrawingControl route={props.route} onRouteChange={props.onRouteChange} />

      {props.context && (
        <GeoJSON
          key="study-area"
          data={props.context.study_area as never}
          style={{ color: "#14b8a6", weight: 2, dashArray: "7 6", fillOpacity: 0 }}
        />
      )}

      {props.context && props.layers.population && (
        <GeoJSON
          key={`population-${props.context.population.features.map((feature) => feature.properties.id).join("-")}-${selectionKey}`}
          data={props.context.population as never}
          style={(feature) => {
            const properties = feature?.properties as { id?: string; density_band?: string } | undefined;
            const isSelected = Boolean(properties?.id && selected("population", properties.id));
            return {
              color: isSelected ? "#0f172a" : "#0f766e",
              weight: isSelected ? 3.5 : 0.7,
              dashArray: isSelected ? "7 4" : undefined,
              fillColor: densityColors[properties?.density_band || ""] || "#99f6e4",
              fillOpacity: isSelected ? 0.62 : 0.34,
            };
          }}
          onEachFeature={featureEvents(
            "population",
            props.onFeatureSelect,
            (feature) => `Kepadatan ${densityLabels[String(feature.properties.density_band)] || feature.properties.density_band}`,
          )}
        />
      )}
      {props.context && props.layers.routes && (
        <GeoJSON
          key={`routes-${props.context.existing_routes.features.map((feature) => feature.properties.id).join("-")}-${selectionKey}`}
          data={props.context.existing_routes as never}
          style={(feature) => {
            const id = String(feature?.properties?.id || "");
            const isSelected = selected("existing_route", id);
            return {
              color: isSelected ? "#0f172a" : "#64748b",
              weight: isSelected ? 7 : 3,
              opacity: isSelected ? 1 : 0.75,
              dashArray: isSelected ? "10 4" : undefined,
            };
          }}
          onEachFeature={featureEvents(
            "existing_route",
            props.onFeatureSelect,
            (feature) => `${feature.properties.name} · ${feature.properties.route_type}`,
          )}
        />
      )}
      {props.context && props.layers.property && (
        <GeoJSON
          key={`property-${props.context.property_go.features.map((feature) => feature.properties.id).join("-")}-${selectionKey}`}
          data={props.context.property_go as never}
          pointToLayer={(feature, latlng) => {
            const isSelected = selected("property_go", String(feature.properties?.id || ""));
            return L.circleMarker(latlng, {
              radius: isSelected ? 9 : 5,
              color: isSelected ? "#0f172a" : "#fff",
              weight: isSelected ? 4 : 2,
              dashArray: isSelected ? "3 2" : undefined,
              fillColor: "#f59e0b",
              fillOpacity: 1,
            });
          }}
          onEachFeature={featureEvents(
            "property_go",
            props.onFeatureSelect,
            (feature) => `${feature.properties.label} · ${feature.properties.kategori}`,
          )}
        />
      )}
      {props.context && props.layers.facilities && (
        <GeoJSON
          key={`facilities-${props.context.public_facilities.features.map((feature) => feature.properties.id).join("-")}-${selectionKey}`}
          data={props.context.public_facilities as never}
          pointToLayer={(feature, latlng) => {
            const isSelected = selected("public_facility", String(feature.properties?.id || ""));
            return L.circleMarker(latlng, {
              radius: isSelected ? 10 : 6,
              color: isSelected ? "#0f172a" : "#fff",
              weight: isSelected ? 4 : 2,
              dashArray: isSelected ? "3 2" : undefined,
              fillColor: "#ef4444",
              fillOpacity: 1,
            });
          }}
          onEachFeature={featureEvents(
            "public_facility",
            props.onFeatureSelect,
            (feature) => `${feature.properties.label} · ${feature.properties.kategori}`,
          )}
        />
      )}
      {props.analysis && props.layers.buffer && (
        <GeoJSON
          key={`buffer-${props.analysis.baseline.score}`}
          data={props.analysis.baseline.buffer_geojson as never}
          style={{ color: "#14b8a6", weight: 1.5, fillColor: "#14b8a6", fillOpacity: 0.14 }}
        />
      )}
      {props.analysis?.recommendation && (
        <GeoJSON
          key={`recommendation-${props.analysis.recommendation.distance_meters}`}
          data={props.analysis.recommendation.route_geojson as never}
          style={{ color: "#14b8a6", weight: 5, dashArray: "9 8" }}
        />
      )}
      {!tileUrl && <div className="missing-basemap">Tambahkan URL tile MAPID MAPS di <code>.env</code></div>}
    </MapContainer>
  );
}
