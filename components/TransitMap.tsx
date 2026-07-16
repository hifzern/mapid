"use client";

import L from "leaflet";
import "leaflet-draw";
import { useEffect, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { AnalysisResult, LineString, MapContext } from "@/lib/types";

type Props = {
  route: LineString | null;
  onRouteChange: (route: LineString | null) => void;
  context: MapContext | null;
  onContext: (context: MapContext) => void;
  onNotice: (notice: string) => void;
  analysis: AnalysisResult | null;
  layers: { routes: boolean; population: boolean; property: boolean; buffer: boolean };
};

const densityColors: Record<string, string> = {
  very_low: "#ccfbf1",
  low: "#99f6e4",
  medium: "#5eead4",
  high: "#2dd4bf",
  very_high: "#0f766e",
};

function DrawingControl({ route, onRouteChange }: Pick<Props, "route" | "onRouteChange">) {
  const map = useMap();
  const group = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const featureGroup = new L.FeatureGroup().addTo(map);
    group.current = featureGroup;
    const control = new L.Control.Draw({
      position: "topleft",
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
        onNotice(truncated ? "Sebagian layer dibatasi. Perbesar peta untuk detail." : "");
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

export default function TransitMap(props: Props) {
  const tileUrl = process.env.NEXT_PUBLIC_MAPID_TILE_URL;
  return (
    <MapContainer center={[-2.5, 118]} zoom={5} minZoom={4} className="leaflet-map" zoomControl>
      {tileUrl && (
        <TileLayer
          url={tileUrl}
          attribution={process.env.NEXT_PUBLIC_MAPID_ATTRIBUTION || "MAPID MAPS"}
        />
      )}
      <ContextLoader onContext={props.onContext} onNotice={props.onNotice} />
      <DrawingControl route={props.route} onRouteChange={props.onRouteChange} />

      {props.context && (
        <GeoJSON
          key="study-area"
          data={props.context.study_area as never}
          style={{ color: "#0f766e", weight: 1.5, dashArray: "6 6", fillOpacity: 0 }}
        />
      )}

      {props.context && props.layers.population && (
        <GeoJSON
          key={`population-${props.context.population.features.length}`}
          data={props.context.population as never}
          style={(feature) => ({
            color: "#0f766e",
            weight: 0.5,
            fillColor: densityColors[feature?.properties?.density_band] || "#99f6e4",
            fillOpacity: 0.34,
          })}
        />
      )}
      {props.context && props.layers.routes && (
        <GeoJSON
          key={`routes-${props.context.existing_routes.features.length}`}
          data={props.context.existing_routes as never}
          style={{ color: "#64748b", weight: 3, opacity: 0.75 }}
        />
      )}
      {props.context && props.layers.property && (
        <GeoJSON
          key={`property-${props.context.property_go.features.length}`}
          data={props.context.property_go as never}
          pointToLayer={(_, latlng) => L.circleMarker(latlng, {
            radius: 5,
            color: "#fff",
            weight: 2,
            fillColor: "#f59e0b",
            fillOpacity: 1,
          })}
        />
      )}
      {props.analysis && props.layers.buffer && (
        <GeoJSON
          key={`buffer-${props.analysis.baseline.score}`}
          data={props.analysis.baseline.buffer_geojson as never}
          style={{ color: "#0f766e", weight: 1.5, fillColor: "#14b8a6", fillOpacity: 0.14 }}
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
