"use client";

import L from "leaflet";
import "leaflet-draw";
import { memo, useCallback, useEffect, useRef } from "react";
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from "react-leaflet";
import type {
  AnalysisResult,
  Feature,
  ImportedDataset,
  LineString,
  MapContext,
  MapFeatureKind,
  RouteChangeSource,
  SelectedFeature,
  SnapPreview,
} from "@/lib/types";
import { normalizeMapGeoJSON } from "@/lib/types";
import { useStore } from "@/lib/workspace-store";

// leaflet-draw 1.0.4 still calls Leaflet's deprecated compatibility alias.
(L.Polyline as typeof L.Polyline & { _flat: typeof L.LineUtil.isFlat })._flat = L.LineUtil.isFlat;

type LayerVisibility = {
  routes: boolean;
  population: boolean;
  property: boolean;
  facilities: boolean;
  buffer: boolean;
  stops: boolean;
  overlap: boolean;
};

type FocusRequest = SelectedFeature & { nonce: number };
type DatasetFitRequest = { id: string; nonce: number };

type Props = {
  route: LineString | null;
  onRouteChange: (route: LineString | null, source?: RouteChangeSource) => void;
  context: MapContext | null;
  onContext: (context: MapContext) => void;
  onNotice: (notice: string) => void;
  analysis: AnalysisResult | null;
  layers: LayerVisibility;
  selectedFeature: SelectedFeature | null;
  onFeatureSelect: (feature: SelectedFeature) => void;
  focusRequest: FocusRequest | null;
  importedDatasets: ImportedDataset[];
  datasetFitRequest: DatasetFitRequest | null;
  snapPreview: SnapPreview | null;
};

const localBoundarySource: MapContext["sources"][number] = {
  source_key: "study_area",
  dataset_name: "Batas Kabupaten Kulon Progo",
  provider: "OpenStreetMap contributors",
  license: "ODbL 1.0",
  update_date: "2026-07-27",
  status: "provisional",
  limitation: "Batas administratif OSM belum diverifikasi terhadap dokumen pemerintah daerah.",
};

function withLocalBoundary(context: MapContext, studyArea: MapContext["study_area"]): MapContext {
  return {
    ...context,
    study_area: studyArea,
    sources: [localBoundarySource, ...context.sources.filter((source) => source.source_key !== "study_area")],
  };
}

function localBoundaryContext(studyArea: MapContext["study_area"]): MapContext {
  return {
    study_area: studyArea,
    existing_routes: { type: "FeatureCollection", features: [] },
    population: { type: "FeatureCollection", features: [] },
    property_go: { type: "FeatureCollection", features: [] },
    public_facilities: { type: "FeatureCollection", features: [] },
    sources: [localBoundarySource],
    methodology: {
      buffer_meters: 500,
      walking_minutes: 10,
      stop_spacing_meters: 800,
      max_analysis_stops: 30,
      overlap_tolerance_meters: 100,
      overlap_conflict_threshold_pct: 30,
      facility_count_target: 10,
      area_population_coverage_target_pct: 50,
      area_facility_count_target: 3,
      population_weight: 0.5,
      facility_weight: 0.25,
      overlap_weight: 0.25,
      population_assumption: "uniform_within_polygon",
      target_calibration_status: "provisional",
    },
    truncated: { existing_routes: false, population: false, property_go: false, public_facilities: false },
  };
}

let boundaryRequest: Promise<MapContext["study_area"] | null> | null = null;

function loadLocalBoundary() {
  boundaryRequest ||= fetch("/data/kulon-progo-boundary.geojson")
    .then(async (response) => {
      if (!response.ok) return null;
      const data = normalizeMapGeoJSON(await response.json());
      return data?.type === "Feature" && (data.geometry.type === "Polygon" || data.geometry.type === "MultiPolygon")
        ? data as MapContext["study_area"]
        : null;
    })
    .catch(() => null);
  return boundaryRequest;
}

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

function DrawingControl({ route, onRouteChange, snapPreview }: Pick<Props, "route" | "onRouteChange" | "snapPreview">) {
  const map = useMap();
  const group = useRef<L.FeatureGroup | null>(null);
  const drawHandler = useRef<L.Draw.Polyline | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const setRouteState = useStore((s) => s.setRouteState);

  const bindRouteLayer = useCallback((layer: L.Polyline) => {
    const emitRoute = (source: RouteChangeSource) => {
      const geometry = layer.toGeoJSON().geometry;
      if (geometry.type === "LineString") onRouteChange(geometry as LineString, source);
    };
    const emitEditedRoute = () => emitRoute("edit");
    const element = layer.getElement() as SVGPathElement | null;
    const beginDrag = (event: PointerEvent) => {
      const state = useStore.getState();
      if (event.button !== 0 || state.activeTool !== "pan" || state.snapPreview) return;
      event.preventDefault();
      event.stopPropagation();
      dragCleanup.current?.();

      const start = map.mouseEventToLatLng(event);
      const startPoint = L.point(event.clientX, event.clientY);
      const threshold = event.pointerType === "touch" ? 10 : event.pointerType === "pen" ? 6 : 4;
      const original = (layer.getLatLngs() as L.LatLng[]).map((point) => L.latLng(point.lat, point.lng));
      const mapWasDraggable = map.dragging.enabled();
      let moved = false;
      let finished = false;

      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return;
        if (!moved && L.point(moveEvent.clientX, moveEvent.clientY).distanceTo(startPoint) < threshold) return;
        moved = true;
        const current = map.mouseEventToLatLng(moveEvent);
        const latitudeDelta = current.lat - start.lat;
        const longitudeDelta = current.lng - start.lng;
        layer.setLatLngs(original.map((point) => [
          point.lat + latitudeDelta,
          point.lng + longitudeDelta,
        ]));
      };
      const finish = (commit: boolean) => {
        if (finished) return;
        finished = true;
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finishDrag);
        document.removeEventListener("pointercancel", cancelDrag);
        document.removeEventListener("keydown", cancelWithEscape);
        if (element?.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
        if (mapWasDraggable) map.dragging.enable();
        element?.classList.remove("route-dragging");
        dragCleanup.current = null;
        if (commit && moved) emitRoute("drag");
        if (!commit && moved) layer.setLatLngs(original);
      };
      const finishDrag = (finishEvent: PointerEvent) => {
        if (finishEvent.pointerId === event.pointerId) finish(true);
      };
      const cancelDrag = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId === event.pointerId) finish(false);
      };
      const cancelWithEscape = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== "Escape") return;
        keyEvent.preventDefault();
        finish(false);
      };

      if (mapWasDraggable) map.dragging.disable();
      element?.classList.add("route-dragging");
      try {
        element?.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic pointer events used by tests do not own a native capture target.
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", finishDrag);
      document.addEventListener("pointercancel", cancelDrag);
      document.addEventListener("keydown", cancelWithEscape);
      dragCleanup.current = () => finish(false);
    };

    layer.on("edit", emitEditedRoute);
    element?.addEventListener("pointerdown", beginDrag);
    layer.once("remove", () => {
      layer.off("edit", emitEditedRoute);
      element?.removeEventListener("pointerdown", beginDrag);
    });
    const state = useStore.getState();
    element?.classList.toggle("route-draggable", state.activeTool === "pan" && !state.snapPreview);
  }, [map, onRouteChange]);

  useEffect(() => {
    const routePane = map.getPane("proposedRoute") || map.createPane("proposedRoute");
    routePane.style.zIndex = "550";
    const featureGroup = new L.FeatureGroup().addTo(map);
    group.current = featureGroup;

    const created: L.LeafletEventHandlerFn = (event) => {
      const drawEvent = event as L.DrawEvents.Created;
      const layer = drawEvent.layer as L.Polyline;
      layer.options.pane = "proposedRoute";
      featureGroup.clearLayers();
      featureGroup.addLayer(layer);
      bindRouteLayer(layer);
      const geometry = layer.toGeoJSON().geometry;
      if (geometry.type === "LineString") onRouteChange(geometry as LineString, "draw");
      setActiveTool("pan");
    };
    map.on(L.Draw.Event.CREATED, created);

    return () => {
      dragCleanup.current?.();
      drawHandler.current?.disable();
      map.off(L.Draw.Event.CREATED, created);
      map.removeLayer(featureGroup);
    };
  }, [bindRouteLayer, map, onRouteChange, setActiveTool]);

  useEffect(() => {
    const featureGroup = group.current;
    if (!featureGroup) return;
    drawHandler.current?.disable();
    drawHandler.current = null;

    featureGroup.eachLayer((layer) => {
      const poly = layer as L.Polyline & { editing?: { disable: () => void; enable: () => void } };
      if (poly.editing) poly.editing.disable();
      poly.setStyle({
        weight: 5,
        opacity: snapPreview ? 0.38 : 1,
        dashArray: snapPreview ? "7 7" : "",
      });
      poly.getElement()?.classList.toggle("route-draggable", activeTool === "pan" && !snapPreview);
      poly.getElement()?.classList.toggle("route-snap-original", Boolean(snapPreview));
      poly.getElement()?.classList.remove("route-dragging");
    });

    if (activeTool === "draw") {
      setRouteState("drawing");
      const handler = new L.Draw.Polyline(map as L.DrawMap, {
        shapeOptions: { color: "#255fdb", weight: 5 },
      });
      drawHandler.current = handler;
      const finishOnDoubleClick = () => {
        const finishable = handler as L.Draw.Polyline & {
          finishShape?: () => void;
          _finishShape?: () => void;
        };
        if (typeof finishable.finishShape === "function") finishable.finishShape();
        else if (typeof finishable._finishShape === "function") finishable._finishShape();
        else finishable.completeShape();
      };
      map.on("dblclick", finishOnDoubleClick);
      handler.enable();
      return () => {
        map.off("dblclick", finishOnDoubleClick);
        drawHandler.current?.disable();
      };
    }

    if (activeTool === "edit") {
      featureGroup.eachLayer((layer) => {
        const poly = layer as L.Polyline & { editing?: { disable: () => void; enable: () => void } };
        if (poly.editing) poly.editing.enable();
        poly.setStyle({ weight: 7 });
      });
      setRouteState(route ? "editing" : "idle");
      return;
    }

    setRouteState(route ? "ready" : "idle");
  }, [activeTool, map, route, setRouteState, snapPreview]);

  useEffect(() => {
    const featureGroup = group.current;
    if (!featureGroup) return;
    const existing = featureGroup.getLayers()[0] as L.Polyline | undefined;
    const current = existing?.toGeoJSON().geometry;
    if (route && current?.type === "LineString"
      && JSON.stringify(current.coordinates) === JSON.stringify(route.coordinates)) return;
    featureGroup.clearLayers();
    if (route) {
      const layer = L.polyline(
        route.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
        { className: "proposed-route", color: "#255fdb", pane: "proposedRoute", weight: 5 },
      );
      featureGroup.addLayer(layer);
      bindRouteLayer(layer);
      const editing = (layer as L.Polyline & { editing?: { enable: () => void } }).editing;
      if (useStore.getState().activeTool === "edit") {
        editing?.enable();
        layer.setStyle({ weight: 7 });
        setRouteState("editing");
      } else {
        setRouteState("ready");
      }
    }
  }, [bindRouteLayer, route, setRouteState]);

  return null;
}

function MapToolbar({ route, context, importedDatasets }: Pick<Props, "route" | "context" | "importedDatasets">) {
  const map = useMap();
  const visibleDatasets = importedDatasets.filter((dataset) => dataset.visible);

  function fit() {
    const geometries = visibleDatasets.length
      ? visibleDatasets.map((dataset) => dataset.data)
      : [route || context?.study_area].filter(Boolean);
    const bounds = L.latLngBounds([]);
    geometries.forEach((geometry) => bounds.extend(L.geoJSON(geometry as never).getBounds()));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }

  return (
    <div className="map-toolbar leaflet-control" role="group" aria-label="Kontrol tampilan peta">
      <button type="button" title="Perbesar" aria-label="Perbesar" onClick={() => map.zoomIn()}>+</button>
      <button type="button" title="Perkecil" aria-label="Perkecil" onClick={() => map.zoomOut()}>−</button>
      <button type="button" title="Sesuaikan tampilan" aria-label="Sesuaikan tampilan" onClick={fit} disabled={!route && !context && !visibleDatasets.length}>Fit</button>
    </div>
  );
}

function ContextLoader({ onContext, onNotice }: Pick<Props, "onContext" | "onNotice">) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let loadedBounds: L.LatLngBounds | null = null;
    let cachedNotice = "";
    let hasContext = false;
    let stopped = false;
    const load = async () => {
      const viewport = map.getBounds();
      if (loadedBounds?.contains(viewport)) {
        onNotice(cachedNotice);
        return;
      }
      if (viewport.getEast() - viewport.getWest() > 5 || viewport.getNorth() - viewport.getSouth() > 5) {
        controller?.abort();
        onNotice("Perbesar peta untuk memuat layer analisis pada viewport ini.");
        return;
      }

      const padded = viewport.pad(0.2);
      const requestBounds = padded.getEast() - padded.getWest() <= 5 && padded.getNorth() - padded.getSouth() <= 5
        ? padded
        : viewport;
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      const bbox = [requestBounds.getWest(), requestBounds.getSouth(), requestBounds.getEast(), requestBounds.getNorth()]
        .map((value) => value.toFixed(5))
        .join(",");
      const localBoundary = await loadLocalBoundary();
      try {
        const response = await fetch(`/api/map-context?bbox=${bbox}`, { signal: requestController.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Layer peta gagal dimuat.");
        if (stopped) return;
        const context = localBoundary ? withLocalBoundary(result, localBoundary) : result;
        loadedBounds = requestBounds;
        hasContext = true;
        onContext(context);
        const truncated = Object.values(context.truncated as Record<string, boolean>).some(Boolean);
        cachedNotice = truncated ? "Sebagian data pada viewport dibatasi hingga 5.000 objek per layer." : "";
        onNotice(cachedNotice);
        if (!fitted.current && context.study_area?.geometry) {
          fitted.current = true;
          if (!useStore.getState().route) {
            map.fitBounds(L.geoJSON(context.study_area).getBounds(), { padding: [28, 28] });
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError" || stopped) return;
        if (localBoundary && !hasContext) {
          loadedBounds = requestBounds;
          hasContext = true;
          cachedNotice = `${(error as Error).message} Batas Kulon Progo lokal tetap aktif.`;
          onContext(localBoundaryContext(localBoundary));
          onNotice(cachedNotice);
          if (!fitted.current) {
            fitted.current = true;
            if (!useStore.getState().route) {
              map.fitBounds(L.geoJSON(localBoundary).getBounds(), { padding: [28, 28] });
            }
          }
          return;
        }
        cachedNotice = `${(error as Error).message}${hasContext ? " Data sebelumnya tetap aktif." : ""}`;
        onNotice(cachedNotice);
      }
    };
    const scheduleLoad = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 250);
    };
    void load();
    map.on("moveend", scheduleLoad);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      map.off("moveend", scheduleLoad);
    };
  }, [map, onContext, onNotice]);

  return null;
}

function ImportedDatasetFit({ importedDatasets, datasetFitRequest }: Pick<Props, "importedDatasets" | "datasetFitRequest">) {
  const map = useMap();
  const fittedNonce = useRef<number | null>(null);

  useEffect(() => {
    if (!datasetFitRequest || fittedNonce.current === datasetFitRequest.nonce) return;
    const dataset = importedDatasets.find((item) => item.id === datasetFitRequest?.id);
    if (!dataset) return;
    fittedNonce.current = datasetFitRequest.nonce;
    const bounds = L.geoJSON(dataset.data as never).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 16 });
  }, [datasetFitRequest, importedDatasets, map]);

  return null;
}

function findFeature(context: MapContext, selected: SelectedFeature): Feature | undefined {
  const collections: Record<string, { features: Feature[] }> = {
    existing_route: context.existing_routes,
    population: context.population,
    property_go: context.property_go,
    public_facility: context.public_facilities,
  };
  return collections[selected.kind]?.features.find((feature) => feature.properties.id === selected.id) as Feature | undefined;
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
) {
  return (rawFeature: GeoJSON.Feature, layer: L.Layer) => {
    const feature = rawFeature as unknown as Feature<{ id: string }>;
    layer.bindTooltip(featureTooltip(kind, feature), { sticky: true, direction: "top" });
    layer.on("click", () => {
      layer.closeTooltip();
      onFeatureSelect({ kind, id: feature.properties.id });
    });
  };
}

function featureTooltip(kind: MapFeatureKind, feature: Feature) {
  if (kind === "population") {
    return `Kepadatan ${densityLabels[String(feature.properties.density_band)] || feature.properties.density_band}`;
  }
  if (kind === "existing_route") return `${feature.properties.name} · ${feature.properties.route_type}`;
  return `${feature.properties.label} · ${feature.properties.kategori}`;
}

function SelectedFeatureLayer({ context, selectedFeature, layers }: Pick<Props, "context" | "selectedFeature" | "layers">) {
  if (!context || !selectedFeature) return null;
  const visible = {
    existing_route: layers.routes,
    population: layers.population,
    property_go: layers.property,
    public_facility: layers.facilities,
  }[selectedFeature.kind];
  const feature = visible ? findFeature(context, selectedFeature) : undefined;
  if (!feature) return null;

  return (
    <GeoJSON
      key={`${selectedFeature.kind}-${selectedFeature.id}`}
      data={feature as never}
      style={() => {
        if (feature.geometry.type === "Point") return {};
        if (selectedFeature.kind === "population") {
          return {
            className: "map-feature map-feature-population map-feature-selected",
            color: "#0f172a",
            weight: 3.5,
            dashArray: "7 4",
            fillColor: densityColors[String(feature.properties.density_band)] || "#99f6e4",
            fillOpacity: 0.62,
          };
        }
        return {
          className: "map-feature map-feature-existing-route map-feature-selected",
          color: "#0f172a",
          weight: 7,
          opacity: 1,
          dashArray: "10 4",
        };
      }}
      pointToLayer={(_, latlng) => L.circleMarker(latlng, {
        className: `map-feature map-feature-${selectedFeature.kind === "property_go" ? "property-go" : "public-facility"} map-feature-selected`,
        radius: selectedFeature.kind === "property_go" ? 9 : 10,
        color: "#0f172a",
        weight: 4,
        dashArray: "3 2",
        fillColor: selectedFeature.kind === "property_go" ? "#f59e0b" : "#ef4444",
        fillOpacity: 1,
      })}
      onEachFeature={(_, layer) => layer.bindTooltip(featureTooltip(selectedFeature.kind, feature), {
        className: "map-feature-selected-tooltip",
        permanent: true,
        direction: "top",
      })}
    />
  );
}

function TransitMap(props: Props) {
  const tileUrl = process.env.NEXT_PUBLIC_MAPID_TILE_URL
    || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttribution = process.env.NEXT_PUBLIC_MAPID_TILE_URL
    ? process.env.NEXT_PUBLIC_MAPID_ATTRIBUTION || "MAPID MAPS"
    : "&copy; OpenStreetMap contributors";

  return (
    <MapContainer center={[-7.82, 110.16]} zoom={11} minZoom={4} maxZoom={19} className="leaflet-map" zoomControl={false}>
      <TileLayer url={tileUrl} attribution={tileAttribution} />
      <ContextLoader onContext={props.onContext} onNotice={props.onNotice} />
      <MapToolbar route={props.route} context={props.context} importedDatasets={props.importedDatasets} />
      <MapFocus context={props.context} focusRequest={props.focusRequest} />
      <ImportedDatasetFit importedDatasets={props.importedDatasets} datasetFitRequest={props.datasetFitRequest} />
      <DrawingControl route={props.route} onRouteChange={props.onRouteChange} snapPreview={props.snapPreview} />

      {props.snapPreview && (
        <Pane name="snapPreviewRoute" style={{ zIndex: 560, pointerEvents: "none" }}>
          <GeoJSON
            key={JSON.stringify(props.snapPreview.route.coordinates)}
            data={props.snapPreview.route as never}
            style={{
              className: "route-snap-candidate",
              color: "#0b6b57",
              weight: 7,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </Pane>
      )}

      {props.context && (
        <GeoJSON
          key="study-area"
          data={props.context.study_area as never}
          style={{ color: "#14b8a6", weight: 2, dashArray: "7 6", fillOpacity: 0 }}
        />
      )}

      {props.context && props.layers.population && (
        <GeoJSON
          key={`population-${props.context.population.features.map((feature) => feature.properties.id).join("-")}`}
          data={props.context.population as never}
          style={(feature) => {
            const properties = feature?.properties as { id?: string; density_band?: string } | undefined;
            return {
              className: "map-feature map-feature-population",
              color: "#0f766e",
              weight: 0.7,
              fillColor: densityColors[properties?.density_band || ""] || "#99f6e4",
              fillOpacity: 0.34,
            };
          }}
          onEachFeature={featureEvents("population", props.onFeatureSelect)}
        />
      )}
      {props.context && props.layers.routes && (
        <GeoJSON
          key={`routes-${props.context.existing_routes.features.map((feature) => feature.properties.id).join("-")}`}
          data={props.context.existing_routes as never}
          style={{ className: "map-feature map-feature-existing-route", color: "#64748b", weight: 3, opacity: 0.75 }}
          onEachFeature={featureEvents("existing_route", props.onFeatureSelect)}
        />
      )}
      {props.context && props.layers.property && (
        <GeoJSON
          key={`property-${props.context.property_go.features.map((feature) => feature.properties.id).join("-")}`}
          data={props.context.property_go as never}
          pointToLayer={(_, latlng) => L.circleMarker(latlng, {
            className: "map-feature map-feature-property-go",
            radius: 5,
            color: "#fff",
            weight: 2,
            fillColor: "#f59e0b",
            fillOpacity: 1,
          })}
          onEachFeature={featureEvents("property_go", props.onFeatureSelect)}
        />
      )}
      {props.context && props.layers.facilities && (
        <GeoJSON
          key={`facilities-${props.context.public_facilities.features.map((feature) => feature.properties.id).join("-")}`}
          data={props.context.public_facilities as never}
          pointToLayer={(_, latlng) => L.circleMarker(latlng, {
            className: "map-feature map-feature-public-facility",
            radius: 6,
            color: "#fff",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 1,
          })}
          onEachFeature={featureEvents("public_facility", props.onFeatureSelect)}
        />
      )}
      <SelectedFeatureLayer context={props.context} selectedFeature={props.selectedFeature} layers={props.layers} />
      {props.analysis && props.layers.buffer && (
        <GeoJSON
          key={`buffer-${props.analysis.baseline.score}`}
          data={(props.analysis.baseline.catchment_geojson || props.analysis.baseline.buffer_geojson) as never}
          style={{ color: "#14b8a6", weight: 1.5, fillColor: "#14b8a6", fillOpacity: 0.14 }}
        />
      )}
      {props.analysis?.baseline.stops_geojson && props.layers.stops && (
        <GeoJSON
          key={`stops-${props.analysis.baseline.stop_count}`}
          data={props.analysis.baseline.stops_geojson as never}
          pointToLayer={(_, latlng) => L.circleMarker(latlng, {
            className: "map-feature map-feature-analysis-stop",
            radius: 5,
            color: "#ffffff",
            weight: 2,
            fillColor: "#0f766e",
            fillOpacity: 1,
          })}
        />
      )}
      {props.analysis?.baseline.overlap_geojson && props.layers.overlap && (
        <GeoJSON
          key={`overlap-${props.analysis.baseline.overlap_pct}`}
          data={props.analysis.baseline.overlap_geojson as never}
          style={{ className: "map-feature map-feature-overlap", color: "#dc2626", weight: 8, opacity: 0.85 }}
        />
      )}
      {props.analysis?.recommendation && (
        <GeoJSON
          key={`recommendation-${props.analysis.recommendation.distance_meters}`}
          data={props.analysis.recommendation.route_geojson as never}
          style={{ color: "#14b8a6", weight: 5, dashArray: "9 8" }}
        />
      )}
      {props.importedDatasets.filter((dataset) => dataset.visible).map((dataset) => (
        <GeoJSON
          key={dataset.id}
          data={dataset.data as never}
          style={{
            className: "map-feature-imported",
            color: "#d97706",
            weight: 2,
            dashArray: "5 4",
            fillColor: "#f59e0b",
            fillOpacity: 0.14,
          }}
          pointToLayer={(_, latlng) => L.circleMarker(latlng, {
            className: "map-feature-imported",
            radius: 6,
            color: "#fff",
            weight: 2,
            fillColor: "#d97706",
            fillOpacity: 1,
          })}
        />
      ))}
    </MapContainer>
  );
}

export default memo(TransitMap);
